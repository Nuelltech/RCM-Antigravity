import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { addSeedDataJob, getJobStatus } from '../../core/queue';

const seedSchema = z.object({
    includeProducts: z.boolean().default(false).optional(),
    productIds: z.array(z.number()).optional(),
});

export async function onboardingRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/seed', {
        schema: {
            body: seedSchema,
            tags: ['Onboarding'],
            summary: 'Trigger initial data seeding (families, subfamilies, etc.)',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        const user = req.user as any;
        if (!req.tenantId || !user?.id) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const { includeProducts, productIds } = req.body;

        try {
            const { jobId, status } = await addSeedDataJob(req.tenantId, user.id, {
                includeProducts,
                productIds
            });

            return reply.send({
                success: true,
                message: 'Onboarding job queued',
                jobId,
                status
            });
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: 'Failed to queue onboarding job' });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().get('/status/:jobId', {
        schema: {
            params: z.object({ jobId: z.string() }),
            tags: ['Onboarding'],
            summary: 'Check status of onboarding job',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const status = await getJobStatus(req.params.jobId);
        return reply.send(status);
    });

    app.withTypeProvider<ZodTypeProvider>().get('/check', {
        schema: {
            tags: ['Onboarding'],
            summary: 'Check if tenant has initial data seeded',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { prisma } = await import('../../core/database');

        const familyCount = await prisma.familia.count({
            where: { tenant_id: req.tenantId }
        });

        return reply.send({
            seeded: familyCount > 0,
            familyCount
        });
    });

    app.withTypeProvider<ZodTypeProvider>().get('/templates', {
        schema: {
            tags: ['Onboarding'],
            summary: 'Get default product templates',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { DEFAULT_PRODUCTS } = await import('../../core/constants/seedData');
        return reply.send({ products: DEFAULT_PRODUCTS });
    });
}
