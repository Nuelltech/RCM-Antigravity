import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';

export async function performanceTracker(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'] || '';

    // Skip health checks, OPTIONS and performance endpoint itself
    if (url === '/health' || url === '/api/health' || method === 'OPTIONS' || url.includes('/performance')) {
        return;
    }

    // Determine source based on URL and User-Agent
    let source = 'API';
    if (url.startsWith('/api/internal/')) {
        source = 'INTERNAL';
    } else if (userAgent.toLowerCase().includes('expo') || userAgent.toLowerCase().includes('reactnative')) {
        source = 'MOBILE';
    }

    // Log on response sent
    reply.raw.on('finish', () => {
        const duration = Date.now() - startTime;

        try {
            // Background logging - don't await
            prisma.performanceMetric.create({
                data: {
                    type: 'API_REQUEST',
                    name: `${method} ${url}`,
                    duration_ms: duration,
                    status: reply.statusCode >= 200 && reply.statusCode < 300 ? 'success' : 'error',
                    status_code: reply.statusCode,
                    metadata: {
                        method,
                        url,
                        source,
                    }
                }
            }).catch((err: Error) => {
                console.error('Performance logging failed:', err);
            });
        } catch (error) {
            // Silent fail
        }
    });
}
