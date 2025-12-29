import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        tenantId?: number;
        tenant?: any;
    }
}

export async function tenantMiddleware(req: FastifyRequest, reply: FastifyReply) {
    // Skip tenant check for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        return;
    }

    const tenantIdHeader = req.headers['x-tenant-id'];

    if (!tenantIdHeader) {
        // Fallback: Check if auth middleware already extracted tenantId from token
        if ((req as any).user && (req as any).user.tenantId) {
            req.tenantId = (req as any).user.tenantId;
            return;
        }

        // For public routes (login, register), we might not need tenant context immediately
        // But for protected routes, it's crucial.
        return;
    }

    const tenantId = parseInt(tenantIdHeader as string, 10);
    if (isNaN(tenantId)) {
        return reply.status(400).send({ error: 'Invalid Tenant ID' });
    }

    req.tenantId = tenantId;
}
