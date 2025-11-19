import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';
import { prisma } from '../../core/database';

// Schema
const updateTenantSchema = z.object({
    nome_restaurante: z.string().optional(),
    nif: z.string().optional(),
    morada: z.string().optional(),
    telefone: z.string().optional(),
    logo_url: z.string().optional(),
});

// Service
class TenantService {
    async getTenant(tenantId: number) {
        return prisma.tenant.findUnique({ where: { id: tenantId } });
    }

    async updateTenant(tenantId: number, data: z.infer<typeof updateTenantSchema>) {
        return prisma.tenant.update({
            where: { id: tenantId },
            data,
        });
    }
}

// Routes
export async function tenantRoutes(app: FastifyInstance) {
    const service = new TenantService();

    app.withTypeProvider<ZodTypeProvider>().get('/me', {
        schema: {
            tags: ['Tenants'],
            summary: 'Get current tenant info',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });
        const tenant = await service.getTenant(req.tenantId);
        return reply.send(tenant);
    });

    app.withTypeProvider<ZodTypeProvider>().patch('/me', {
        schema: {
            body: updateTenantSchema,
            tags: ['Tenants'],
            summary: 'Update current tenant info',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });
        const updated = await service.updateTenant(req.tenantId, req.body);
        return reply.send(updated);
    });
}
