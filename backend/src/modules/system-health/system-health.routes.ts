
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { HealthCheckService } from './health-check.service';
import redis from '../../core/redis';

const healthCheckService = new HealthCheckService();

export async function systemHealthRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();


    // GET /api/internal/health/overview
    server.get('/overview', {
        schema: {
            tags: ['System Health'],
            summary: 'Get overall system health',
        }
    }, async (request, reply) => {
        const health = await healthCheckService.getOverallHealth();
        return { success: true, health };
    });

    server.get('/processing', {
        schema: {
            tags: ['System Health'],
            summary: 'Get processing statistics',
        }
    }, async (request, reply) => {
        const stats = await healthCheckService.getProcessingStats();
        return { success: true, stats };
    });

    // GET /api/internal/health/database
    server.get('/database', {
        schema: {
            tags: ['System Health'],
            summary: 'Get detailed database metrics',
        }
    }, async (request, reply) => {
        const metrics = await healthCheckService.getDetailedDatabaseMetrics();
        return metrics;
    });


    // GET /api/internal/health/performance
    // Performance metrics aggregation with source filter (In-Memory Implementation)
    server.get('/performance', {
        schema: {
            tags: ['System Health'],
            summary: 'Get performance metrics',
            querystring: z.object({
                period: z.enum(['1h', '24h', '7d']).default('24h'),
                source: z.enum(['INTERNAL', 'API', 'MOBILE', 'ALL']).optional().default('ALL'),
            })
        }
    }, async (request, reply) => {
        const { source } = request.query as { source?: 'INTERNAL' | 'API' | 'MOBILE' | 'ALL' };
        const finalSource = source || 'ALL';

        // Fetch recent raw metrics (last 2000) for in-memory processing
        // This avoids Prisma JSON filtering issues and handles legacy data gracefully
        // @ts-ignore - Stale Prisma types legacy workaround
        const rawMetrics = await prisma.performanceMetric.findMany({
            orderBy: { timestamp: 'desc' },
            take: 2000,
            where: {
                timestamp: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h window
                }
            },
            select: {
                name: true,
                type: true,
                duration_ms: true,
                metadata: true
            }
        });

        // Filter and Aggregate in JS
        const aggMap = new Map<string, { total: number; count: number; name: string; type: string }>();

        for (const m of rawMetrics) {
            const meta = m.metadata as any;
            let itemSource = meta?.source;

            // Heuristic for legacy data or missing source
            if (!itemSource) {
                if (m.name.includes('/api/internal')) {
                    itemSource = 'INTERNAL';
                } else {
                    itemSource = 'API';
                }
            }

            // Apply Source Filter
            if (finalSource !== 'ALL' && itemSource !== finalSource) {
                continue;
            }

            const key = m.name;
            if (!aggMap.has(key)) {
                aggMap.set(key, { total: 0, count: 0, name: m.name, type: m.type });
            }

            const item = aggMap.get(key)!;
            item.total += m.duration_ms;
            item.count += 1;
        }

        // Convert to array, calc avg, sort and limit
        const results = Array.from(aggMap.values())
            .map(item => ({
                name: item.name,
                type: item.type,
                avg_duration: Math.round(item.total / item.count),
                count: item.count
            }))
            .sort((a, b) => b.avg_duration - a.avg_duration)
            .slice(0, 20);

        return results;
    });

    // GET /api/internal/health/workers
    // Full worker registry — shows ALL workers with schedule, last run, next run, queue depth
    server.get('/workers', {
        schema: {
            tags: ['System Health'],
            summary: 'Get full worker registry with status',
        }
    }, async (request, reply) => {
        const Redis = (await import('ioredis')).default;
        const { Queue } = await import('bullmq');

        const redisConn = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
            lazyConnect: true,
        });
        await redisConn.connect().catch(() => { }); // best-effort

        // Helper: calculate next daily cron run (UTC hour)
        const getNextRun = (cronHour: number): string => {
            const now = new Date();
            const next = new Date();
            next.setUTCHours(cronHour, 0, 0, 0);
            if (now.getTime() >= next.getTime()) {
                next.setUTCDate(next.getUTCDate() + 1);
            }
            return next.toISOString();
        };

        // Helper: get queue counts from BullMQ
        const getQueueCounts = async (queueName: string) => {
            try {
                const q = new Queue(queueName, { connection: redisConn as any });
                const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
                await q.close();
                return counts;
            } catch {
                return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
            }
        };

        // 24h metrics from DB for all workers
        // @ts-ignore - Stale Prisma types legacy workaround
        const dbMetrics = await prisma.workerMetric.groupBy({
            by: ['queue_name'],
            _avg: { duration_ms: true },
            _count: { _all: true },
            _max: { processed_at: true },
            where: {
                processed_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });
        const metricsMap = new Map(dbMetrics.map((m: any) => [m.queue_name, m]));

        // Scheduled workers — read last run from Redis
        const [subLastRun, catLastRun] = await Promise.all([
            redisConn.get('worker:last_run:subscription-check').catch(() => null),
            redisConn.get('worker:last_run:catalog-scan').catch(() => null),
        ]);

        // Event-driven workers — get live queue counts
        const [invoiceCounts, retryCounts, salesCounts, recalcCounts, catalogCounts, seedCounts] = await Promise.all([
            getQueueCounts('invoice-processing'),
            getQueueCounts('invoice-retry'),
            getQueueCounts('sales-processing'),
            getQueueCounts('recalculation'),
            getQueueCounts('global-catalog'),
            getQueueCounts('seed-data'),
        ]);

        await redisConn.quit().catch(() => { });

        const enrichMetrics = (queueName: string) => {
            const m = metricsMap.get(queueName) as any;
            return {
                jobs_24h: m?._count?._all ?? 0,
                avg_ms: m ? Math.round(m._avg?.duration_ms ?? 0) : 0,
                last_completed: m?._max?.processed_at ?? null,
            };
        };

        const workers = [
            // ── Scheduled ────────────────────────────────────────
            {
                id: 'subscription-check',
                name: 'Subscription Check',
                type: 'SCHEDULED',
                description: 'Verifica ciclo de vida de trials e subscrições (avisos, grace period, suspensão)',
                schedule: '0 2 * * *',
                schedule_label: 'Diário às 02:00 UTC',
                last_run: subLastRun,
                next_run: getNextRun(2),
                ...enrichMetrics('subscription-check-queue'),
            },
            {
                id: 'catalog-scan',
                name: 'Catalog Scan',
                type: 'SCHEDULED',
                description: 'Scan noturno de novas variações de produto para o catálogo global',
                schedule: '0 3 * * *',
                schedule_label: 'Diário às 03:00 UTC',
                last_run: catLastRun,
                next_run: getNextRun(3),
                ...enrichMetrics('catalog-scan-queue'),
            },
            // ── Event-driven ─────────────────────────────────────
            {
                id: 'invoice-processing',
                name: 'Invoice Processing',
                type: 'EVENT_DRIVEN',
                description: 'Processa faturas enviadas via OCR/IA',
                queue_counts: invoiceCounts,
                ...enrichMetrics('invoice-processing'),
            },
            {
                id: 'invoice-retry',
                name: 'Invoice Retry',
                type: 'EVENT_DRIVEN',
                description: 'Reprocessa faturas com falha',
                queue_counts: retryCounts,
                ...enrichMetrics('invoice-retry'),
            },
            {
                id: 'sales-processing',
                name: 'Sales Processing',
                type: 'EVENT_DRIVEN',
                description: 'Processa dados de vendas importados',
                queue_counts: salesCounts,
                ...enrichMetrics('sales-processing'),
            },
            {
                id: 'recalculation',
                name: 'Recalculation',
                type: 'EVENT_DRIVEN',
                description: 'Recalcula custos e margens após alterações',
                queue_counts: recalcCounts,
                ...enrichMetrics('recalculation'),
            },
            {
                id: 'global-catalog',
                name: 'Global Catalog',
                type: 'EVENT_DRIVEN',
                description: 'Atualiza o catálogo global de produtos',
                queue_counts: catalogCounts,
                ...enrichMetrics('global-catalog'),
            },
            {
                id: 'seed-data',
                name: 'Seed Data',
                type: 'MANUAL',
                description: 'Dados iniciais (só em setup/deploy)',
                queue_counts: seedCounts,
                ...enrichMetrics('seed-data'),
            },
        ];

        return { success: true, workers };
    });


    // GET /api/internal/health/errors
    // Recent system errors from ErrorLog
    server.get('/errors', {
        schema: {
            tags: ['System Health'],
            summary: 'Get recent system errors',
            querystring: z.object({
                limit: z.string().optional().transform(val => parseInt(val || '20')).default('20'),
            })
        }
    }, async (request, reply) => {
        const { limit } = request.query as { limit: number };

        // @ts-ignore - Stale Prisma types legacy workaround
        const errors = await prisma.errorLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: limit,
            select: {
                id: true,
                timestamp: true,
                level: true,
                source: true,
                message: true,
                endpoint: true,
                method: true,
                metadata: true,
            },
        });

        // Convert BigInt to string for JSON serialization
        return errors.map(e => ({
            ...e,
            id: e.id.toString(),
        }));
    });


    // GET /api/internal/health/cache
    // Redis Cache Stats
    server.get('/cache', {
        schema: {
            tags: ['System Health'],
            summary: 'Get Redis cache statistics',
        }
    }, async (request, reply) => {
        try {
            const info = await redis.info();
            const dbSize = await redis.dbsize();

            // Parse INFO command output for memory usage
            const memoryMatch = info.match(/used_memory_human:(\S+)/);
            const memoryPeakMatch = info.match(/used_memory_peak_human:(\S+)/);
            const memory = memoryMatch ? memoryMatch[1] : 'Unknown';
            const peak = memoryPeakMatch ? memoryPeakMatch[1] : 'Unknown';

            return {
                success: true,
                keys: dbSize,
                memory_used: memory,
                memory_peak: peak,
                info: info.substring(0, 500) // First 500 chars snippet
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // POST /api/internal/health/cache/clear
    // Flush Redis Cache
    server.post('/cache/clear', {
        schema: {
            tags: ['System Health'],
            summary: 'Clear all Redis cache',
            response: {
                200: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        try {
            await redis.flushall();
            return { success: true, message: 'Redis cache cleared successfully' };
        } catch (error: any) {
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // GET /api/internal/health/queues
    // Inspect BullMQ Queues
    server.get('/queues', {
        schema: {
            tags: ['System Health'],
            summary: 'Get Queue Status',
            querystring: z.object({
                details: z.string().optional()
            })
        }
    }, async (request, reply) => {
        try {
            // Import queues dynamically to avoid circular dependencies
            const { invoiceProcessingQueue, invoiceRetryQueue } = await import('../../queues/invoice-processing.queue');
            const { salesProcessingQueue } = await import('../../queues/sales-processing.queue');
            // Assuming recalculation queue exists or we skip it for now

            const queues = [
                { name: 'invoice-processing', queue: invoiceProcessingQueue },
                { name: 'invoice-retry', queue: invoiceRetryQueue },
                { name: 'sales-processing', queue: salesProcessingQueue }
            ];

            const results = await Promise.all(queues.map(async ({ name, queue }) => {
                const counts = await queue.getJobCounts();
                return {
                    name,
                    counts,
                    isPaused: await queue.isPaused()
                };
            }));

            return { success: true, queues: results };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // GET /api/internal/health/queues/:name/:status
    // Inspect specific jobs in queue
    server.get('/queues/:name/:status', {
        schema: {
            tags: ['System Health'],
            summary: 'Inspect jobs in queue',
            params: z.object({
                name: z.string(),
                status: z.enum(['waiting', 'active', 'delayed', 'failed', 'completed'])
            }),
            querystring: z.object({
                limit: z.string().optional().transform(v => parseInt(v || '10'))
            })
        }
    }, async (request, reply) => {
        try {
            const { name, status } = request.params;
            const limit = (request.query as any).limit || 10;

            let queue: any;
            if (name === 'invoice-processing' || name === 'invoice-retry') {
                const mod = await import('../../queues/invoice-processing.queue');
                queue = name === 'invoice-processing' ? mod.invoiceProcessingQueue : mod.invoiceRetryQueue;
            } else if (name === 'sales-processing') {
                const mod = await import('../../queues/sales-processing.queue');
                queue = mod.salesProcessingQueue;
            } else {
                return reply.status(404).send({ error: 'Queue not found' });
            }

            const jobs = await queue.getJobs([status], 0, limit - 1);

            return {
                success: true,
                queue: name,
                status,
                count: jobs.length,
                jobs: jobs.map((j: any) => ({
                    id: j.id,
                    data: j.data,
                    attempts: j.attemptsMade,
                    failedReason: j.failedReason,
                    timestamp: j.timestamp,
                    processedOn: j.processedOn,
                    finishedOn: j.finishedOn
                }))
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
}
