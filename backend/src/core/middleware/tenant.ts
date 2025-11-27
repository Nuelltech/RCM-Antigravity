import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';

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
        // For public routes (login, register), we might not need tenant context immediately
        // But for protected routes, it's crucial.
        // We will handle this check more strictly in protected routes or assume it comes from JWT.
        return;
    }

    // If provided in header (e.g. for initial lookup or specific tenant operations)
    // In a real scenario, we often extract this from the authenticated user's session/token
    // But for now, let's support header injection for testing/flexibility
    const tenantId = parseInt(tenantIdHeader as string, 10);
    if (isNaN(tenantId)) {
        return reply.status(400).send({ error: 'Invalid Tenant ID' });
    }

    req.tenantId = tenantId;
}
