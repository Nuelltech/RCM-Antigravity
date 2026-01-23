
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../core/database';

/**
 * Performance Tracker Middleware
 * 
 * Measures request duration and logs:
 * - Slow requests (> 1000ms)
 * - 1% sample of all requests
 * - 5xx errors
 */
export async function performanceTracker(req: FastifyRequest, reply: FastifyReply) {
    const start = Date.now();

    // Measure duration on response finish
    reply.raw.on('finish', () => {
        const duration = Date.now() - start;
        const isError = reply.statusCode >= 500;
        const isSlow = duration > 1000;
        const isSampled = Math.random() < 0.01; // 1% sampling

        if (isError || isSlow || isSampled) {
            try {
                // Safely log without blocking
                // @ts-ignore - Stale Prisma types legacy workaround
                void prisma.performanceMetric.create({
                    data: {
                        type: 'API_REQUEST',
                        name: `${req.method} ${req.routeOptions.url || req.url}`,
                        duration_ms: duration,
                        status: isError ? 'ERROR' : 'SUCCESS',
                        status_code: reply.statusCode,
                        // @ts-ignore - tenantId/userId added by auth middleware
                        tenant_id: (req as any).tenantId || null,
                        // @ts-ignore
                        user_id: (req as any).userId || null,
                        metadata: {
                            query: req.query,
                            userAgent: req.headers['user-agent']
                        } as any
                    }
                }).catch((err: any) => console.error('[PerfTracker] Failed to log metric:', err));
            } catch (err: any) {
                // Ignore errors in logging to prevent impacting main flow
            }
        }
    });
}
