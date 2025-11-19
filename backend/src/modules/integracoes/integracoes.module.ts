import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

const createIntegrationSchema = z.object({
    tipo_integracao: z.string(),
    nome: z.string(),
    provedor: z.string(),
    configuracao: z.record(z.any()).optional(),
});

export async function integrationRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createIntegrationSchema,
            tags: ['Integrations'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);
        return db.create('integracao', req.body);
    });
}
