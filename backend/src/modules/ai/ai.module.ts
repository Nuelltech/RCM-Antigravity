import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

const askAiSchema = z.object({
    message: z.string(),
    context: z.record(z.any()).optional(),
});

export async function aiRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/ask', {
        schema: {
            body: askAiSchema,
            tags: ['AI'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        // Stub response
        return {
            role: 'assistant',
            message: 'This is a stub response from the AI assistant. Integration pending.',
            tokens_usados: 0,
        };
    });
}
