
import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { prisma } from '../../core/database';

/**
 * Global Error Logger
 * 
 * Captures exceptions and logs them to the database for analysis.
 * Should be set as the error handler in Fastify.
 */
export async function errorLogger(error: FastifyError, req: FastifyRequest, reply: FastifyReply) {
    const statusCode = error.statusCode || 500;
    const isInternalError = statusCode >= 500;

    // Determine log level
    const level = isInternalError ? 'ERROR' : 'WARN';

    try {
        // Fire-and-forget log
        // @ts-ignore - Stale Prisma types legacy workaround
        void prisma.errorLog.create({
            data: {
                level,
                source: 'API',
                message: error.message || 'Unknown error',
                stack_trace: error.stack,
                endpoint: req.url,
                method: req.method,
                status_code: statusCode,
                // @ts-ignore - injected by auth middleware
                tenant_id: (req as any).tenantId || null,
                // @ts-ignore
                user_id: (req as any).userId || null,
                metadata: {
                    headers: req.headers,
                    code: error.code,
                    validation: error.validation // For validation errors
                } as any
            }
        }).catch((err: any) => console.error('[ErrorLogger] Failed to log error:', err));
    } catch (logErr) {
        console.error('[ErrorLogger] Critical failure in error logger:', logErr);
    }

    // Pass detailed error in dev, generic in prod (unless it's a 4xx operational error)
    if (statusCode < 500) {
        reply.status(statusCode).send(error);
    } else {
        reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
}
