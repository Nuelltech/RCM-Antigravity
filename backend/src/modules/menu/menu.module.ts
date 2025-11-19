import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

const createMenuItemSchema = z.object({
    receita_id: z.number(),
    nome_comercial: z.string(),
    pvp: z.number(),
    categoria_menu: z.string().optional(),
});

export async function menuRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createMenuItemSchema,
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);
        return db.create('menuItem', req.body);
    });

    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);
        return db.findMany('menuItem', { include: { receita: true } });
    });
}
