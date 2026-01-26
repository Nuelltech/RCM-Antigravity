import { prisma } from '../../core/database';
import { redis } from '../../core/redis';

export interface HealthStatus {
    service: string;
    status: 'UP' | 'DOWN' | 'DEGRADED';
    response_ms?: number;
    details?: any;
}

export class HealthCheckService {
    /**
     * Check Database Health
     */
    async checkDatabase(): Promise<HealthStatus> {
        const start = Date.now();
        try {
            await prisma.$queryRaw`SELECT 1`;
            const response_ms = Date.now() - start;

            return {
                service: 'DATABASE',
                status: response_ms < 100 ? 'UP' : 'DEGRADED',
                response_ms,
                details: {
                    connected: true,
                },
            };
        } catch (error: any) {
            return {
                service: 'DATABASE',
                status: 'DOWN',
                response_ms: Date.now() - start,
                details: { error: error.message },
            };
        }
    }

    /**
     * Check Redis Health
     */
    async checkRedis(): Promise<HealthStatus> {
        const start = Date.now();
        try {
            await redis.ping();
            const response_ms = Date.now() - start;

            return {
                service: 'REDIS',
                status: response_ms < 50 ? 'UP' : 'DEGRADED',
                response_ms,
                details: {
                    connected: true,
                },
            };
        } catch (error: any) {
            return {
                service: 'REDIS',
                status: 'DOWN',
                response_ms: Date.now() - start,
                details: { error: error.message },
            };
        }
    }

    /**
     * Check Workers/Queues Health
     */
    /**
     * Check Workers/Queues Health
     */
    async checkWorkers(): Promise<HealthStatus> {
        const start = Date.now();
        try {
            // Import queues dynamically to avoid circular deps or init issues
            const { invoiceProcessingQueue, invoiceRetryQueue } = await import('../../queues/invoice-processing.queue');
            const { salesProcessingQueue } = await import('../../queues/sales-processing.queue');
            const { recalculationQueue } = await import('../../core/queue');

            // Get Job Counts for all queues
            const [invoiceCounts, salesCounts, retryCounts, recalcCounts] = await Promise.all([
                invoiceProcessingQueue.getJobCounts('active', 'waiting', 'failed'),
                salesProcessingQueue.getJobCounts('active', 'waiting', 'failed'),
                invoiceRetryQueue.getJobCounts('active', 'waiting', 'failed'),
                recalculationQueue.getJobCounts('active', 'waiting', 'failed')
            ]);

            // Get Workers for all queues
            const [invoiceWorkers, salesWorkers, retryWorkers, recalcWorkers] = await Promise.all([
                invoiceProcessingQueue.getWorkers(),
                salesProcessingQueue.getWorkers(),
                invoiceRetryQueue.getWorkers(),
                recalculationQueue.getWorkers()
            ]);

            const response_ms = Date.now() - start;

            // Aggregates
            const totalActiveJobs = invoiceCounts.active + salesCounts.active + retryCounts.active + recalcCounts.active;
            const totalWaitingJobs = invoiceCounts.waiting + salesCounts.waiting + retryCounts.waiting + recalcCounts.waiting;
            const totalFailedJobs = invoiceCounts.failed + salesCounts.failed + retryCounts.failed + recalcCounts.failed;

            // Total Active Workers (connected to Redis)
            const totalWorkers = invoiceWorkers.length + salesWorkers.length + retryWorkers.length + recalcWorkers.length;

            // Status Logic: 
            // UP = At least one worker is connected across the system
            // DOWN = No workers connected at all
            // Note: "Stuck" or "High Load" states are UP but visible via metrics (waiting > 0)
            const status = totalWorkers > 0 ? 'UP' : 'DOWN';

            return {
                service: 'WORKERS',
                status: status,
                response_ms,
                details: {
                    active_jobs: totalActiveJobs,
                    waiting_jobs: totalWaitingJobs,
                    failed_jobs: totalFailedJobs,
                    active_workers: totalWorkers,
                    queues: {
                        invoices: {
                            active: invoiceCounts.active,
                            waiting: invoiceCounts.waiting,
                            workers: invoiceWorkers.length
                        },
                        sales: {
                            active: salesCounts.active,
                            waiting: salesCounts.waiting,
                            workers: salesWorkers.length
                        },
                        retry: {
                            active: retryCounts.active,
                            waiting: retryCounts.waiting,
                            workers: retryWorkers.length
                        },
                        recalculation: {
                            active: recalcCounts.active,
                            waiting: recalcCounts.waiting,
                            workers: recalcWorkers.length
                        }
                    }
                },
            };
        } catch (error: any) {
            return {
                service: 'WORKERS',
                status: 'DOWN',
                response_ms: Date.now() - start,
                details: { error: error.message },
            };
        }
    }

    /**
     * Get Overall System Health
     */
    async getOverallHealth() {
        const [db, redisHealth, workers, ai, stats] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis(),
            this.checkWorkers(),
            this.checkAI(),
            this.getSystemStats()
        ]);

        const services = { db, redis: redisHealth, workers, ai };

        // Overall status
        const hasDown = Object.values(services).some(s => s.status === 'DOWN');
        const hasDegraded = Object.values(services).some(s => s.status === 'DEGRADED');

        const overallStatus = hasDown ? 'DOWN' : hasDegraded ? 'DEGRADED' : 'UP';

        return {
            status: overallStatus,
            services,
            stats,
            timestamp: new Date(),
        };
    }

    /**
     * Get System Usage Statistics
     */
    async getSystemStats() {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        try {
            // 1. Total Requests Today
            // @ts-ignore
            const requestsToday = await prisma.performanceMetric.count({
                where: { timestamp: { gte: startOfToday } }
            });

            // 2. Avg Response Time (Last 1h)
            // @ts-ignore
            const avgResp = await prisma.performanceMetric.aggregate({
                _avg: { duration_ms: true },
                where: { timestamp: { gte: oneHourAgo } }
            });

            // 3. Success Rate (Last 24h)
            // @ts-ignore
            const total24h = await prisma.performanceMetric.count({
                where: { timestamp: { gte: twentyFourHoursAgo } }
            });

            // @ts-ignore
            const errors24h = await prisma.performanceMetric.count({
                where: {
                    timestamp: { gte: twentyFourHoursAgo },
                    status: 'ERROR'
                }
            });

            const successRate = total24h > 0
                ? ((total24h - errors24h) / total24h) * 100
                : 100;

            return {
                uptime_seconds: process.uptime(),
                total_requests_today: requestsToday,
                avg_response_time_1h: Math.round(avgResp._avg.duration_ms || 0),
                success_rate_24h: parseFloat(successRate.toFixed(2))
            };

        } catch (error) {
            console.error('Failed to get system stats', error);
            return {
                uptime_seconds: process.uptime(),
                total_requests_today: 0,
                avg_response_time_1h: 0,
                success_rate_24h: 100
            };
        }
    }

    /**
     * Get Database Metrics
     */
    async getDatabaseMetrics() {
        const size = await this.getDatabaseSize();

        return {
            size_mb: size,
            connected: true,
        };
    }

    /**
     * Get Detailed Database Metrics
     */
    async getDetailedDatabaseMetrics() {
        const health = await this.checkDatabase();
        const size = await this.getDatabaseSize();

        // Active Connections
        let activeConnections = 0;
        let maxConnections = 0;
        try {
            const threads: any[] = await prisma.$queryRaw`SHOW STATUS LIKE 'Threads_connected'`;
            activeConnections = parseInt(threads[0]?.Value || '0');

            const maxConn: any[] = await prisma.$queryRaw`SHOW VARIABLES LIKE 'max_connections'`;
            maxConnections = parseInt(maxConn[0]?.Value || '100');
        } catch (e) {
            console.error('Failed to get connection stats', e);
        }

        // Last Backup
        let lastBackup = null;
        try {
            // @ts-ignore
            lastBackup = await prisma.databaseBackup.findFirst({
                orderBy: { created_at: 'desc' },
                select: { created_at: true, status: true, size_mb: true }
            });
        } catch {
            // Ignore if table doesn't exist or other error
        }

        return {
            status: health.status === 'UP' ? 'Connected' : 'Error',
            response_time_ms: health.response_ms,
            active_connections: activeConnections,
            max_connections: maxConnections,
            size_mb: size,
            last_backup: lastBackup
        };
    }

    private async getDatabaseSize(): Promise<number> {
        try {
            const result: any = await prisma.$queryRaw`
                SELECT 
                  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE()
            `;
            // Prisma raw query returns BigInt for some counts, need careful handling
            // But validation query usually returns number or string decimal
            return Number(result[0]?.size_mb || 0);
        } catch (e) {
            console.error('Failed to get DB size', e);
            return 0;
        }
    }
    /**
     * Check AI Services (Gemini/Vision)
     */
    async checkAI(): Promise<HealthStatus> {
        const start = Date.now();
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                service: 'AI_GEMINI',
                status: 'DOWN',
                response_ms: 0,
                details: { error: 'API Key not configured' },
            };
        }

        // Optional: Can add a dummy generation call here if "deep check" is needed
        // For now, config check + basic validation is enough for "UP"

        return {
            service: 'AI_GEMINI',
            status: 'UP',
            response_ms: Date.now() - start,
            details: {
                models: ['gemini-2.5-flash', 'gemini-pro-vision'],
                vision_active: true,
                api_key_configured: true
            },
        };
    }

    /**
     * Get Processing Statistics (Invoices & Sales)
     */
    async getProcessingStats() {
        try {
            // Invoices Stats
            const invoiceStats = await prisma.faturaImportacao.groupBy({
                by: ['status'],
                _count: {
                    id: true,
                },
            });

            // Sales Stats
            const salesStats = await prisma.vendaImportacao.groupBy({
                by: ['status'],
                _count: {
                    id: true,
                },
            });

            // Helper to count
            const count = (arr: any[], status: string) =>
                arr.find(x => x.status === status)?._count?.id || 0;

            const totalInvoices = invoiceStats.reduce((acc, curr) => acc + curr._count.id, 0);
            const totalSales = salesStats.reduce((acc, curr) => acc + curr._count.id, 0);

            // Calculate success rates
            const invoiceSuccessRate = totalInvoices > 0
                ? Math.round((count(invoiceStats, 'approved') / totalInvoices) * 100)
                : 0;

            const salesSuccessRate = totalSales > 0
                ? Math.round((count(salesStats, 'approved') / totalSales) * 100)
                : 0;

            return {
                invoices: {
                    total: totalInvoices,
                    imported: count(invoiceStats, 'approved'),
                    pending: count(invoiceStats, 'pending') + count(invoiceStats, 'reviewing'),
                    rejected: count(invoiceStats, 'rejected'),
                    error: count(invoiceStats, 'error'),
                    success_rate: invoiceSuccessRate,
                },
                sales: {
                    total: totalSales,
                    imported: count(salesStats, 'approved'),
                    pending: count(salesStats, 'pending') + count(salesStats, 'reviewing'),
                    rejected: count(salesStats, 'rejected'),
                    error: count(salesStats, 'error'),
                    success_rate: salesSuccessRate,
                }
            };
        } catch (error: any) {
            console.error('[Health] Failed to get processing stats:', error);
            // Return zeros if DB fails, don't crash health check
            return {
                invoices: { total: 0, imported: 0, pending: 0, rejected: 0, error: 0, success_rate: 0 },
                sales: { total: 0, imported: 0, pending: 0, rejected: 0, error: 0, success_rate: 0 },
                error: error.message
            };
        }
    }
}

export const healthCheckService = new HealthCheckService();
