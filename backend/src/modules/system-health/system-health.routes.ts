
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { HealthCheckService } from './health-check.service';

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

    // GET /api/internal/health/processing
    server.get('/processing', {
        schema: {
            tags: ['System Health'],
            summary: 'Get processing statistics',
        }
    }, async (request, reply) => {
        const stats = await healthCheckService.getProcessingStats();
        return { success: true, stats };
    });


    // GET /api/internal/health/performance
    // Performance metrics aggregation
    server.get('/performance', {
        // ... schema ...
        schema: {
            tags: ['System Health'],
            summary: 'Get performance metrics',
            querystring: z.object({
                period: z.enum(['1h', '24h', '7d']).default('24h')
            })
        }
    }, async (request, reply) => {
        // Simple aggregation: average response time per endpoint
        // @ts-ignore - Stale Prisma types legacy workaround
        const metrics = await prisma.performanceMetric.groupBy({
            by: ['name', 'type'],
            _avg: {
                duration_ms: true
            },
            _count: {
                _all: true
            },
            orderBy: {
                _avg: {
                    duration_ms: 'desc'
                }
            },
            take: 20
        });

        return metrics.map((m: any) => ({
            name: m.name,
            type: m.type,
            avg_duration: Math.round(m._avg.duration_ms || 0),
            count: m._count._all
        }));
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
}
