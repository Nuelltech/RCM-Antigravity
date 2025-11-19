import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

const createInventoryListSchema = z.object({
    nome: z.string(),
    tipo: z.enum(['Completo', 'Parcial', 'Spot']),
});

export async function inventoryRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/lists', {
        schema: {
            body: createInventoryListSchema,
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);
        return db.create('listaInventario', req.body);
    });
}
