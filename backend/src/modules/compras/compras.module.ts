import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

const createPurchaseSchema = z.object({
    variacao_produto_id: z.number(),
    quantidade_comprada: z.number(),
    preco_total: z.number(),
    fornecedor: z.string().optional(),
    data_compra: z.string().datetime(),
});

export async function purchaseRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createPurchaseSchema,
            tags: ['Purchases'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);

        const preco_unitario = req.body.preco_total / req.body.quantidade_comprada;

        const purchase = await db.create('compra', {
            ...req.body,
            preco_unitario,
            metodo_entrada: 'Manual',
            validado: true,
        });

        return purchase;
    });
}
