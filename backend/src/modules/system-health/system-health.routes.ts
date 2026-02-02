
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
    // Worker execution stats
    server.get('/workers', {
        schema: {
            tags: ['System Health'],
            summary: 'Get worker execution stats',
        }
    }, async (request, reply) => {
        // @ts-ignore - Stale Prisma types legacy workaround
        const stats = await prisma.workerMetric.groupBy({
            by: ['queue_name', 'status'],
            _avg: { duration_ms: true },
            _min: { duration_ms: true },
            _max: { duration_ms: true },
            _count: { _all: true },
            where: {
                processed_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
                }
            }
        });

        return stats.map((s: any) => ({
            queue: s.queue_name,
            status: s.status,
            count: s._count._all,
            avg_ms: Math.round(s._avg.duration_ms || 0),
            min_ms: s._min.duration_ms,
            max_ms: s._max.duration_ms
        }));
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
}
