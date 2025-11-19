import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

const createSaleSchema = z.object({
    menu_item_id: z.number(),
    quantidade: z.number(),
    pvp_praticado: z.number(),
    data_venda: z.string().datetime(),
});

export async function salesRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createSaleSchema,
            tags: ['Sales'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);
        return db.create('venda', {
            ...req.body,
            metodo_entrada: 'Manual',
            receita_total: req.body.pvp_praticado * req.body.quantidade,
        });
    });
}
