import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { navigationService } from './navigation.service';

export async function navigationRoutes(app: FastifyInstance) {

    /**
     * GET /api/navigation/items
     * Get navigation menu items for current user (filtered by role + subscription)
     */
    app.withTypeProvider<ZodTypeProvider>().get('/items', {
        schema: {
            tags: ['Navigation'],
            security: [{ bearerAuth: [] }],
            response: {
                200: z.object({
                    items: z.array(z.object({
                        key: z.string(),
                        name: z.string(),
                        href: z.string(),
                        icon: z.string(),
                        group: z.string().nullable(),
                        isLocked: z.boolean(),
                    }))
                })
            }
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId || !req.user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const user = req.user as { role: string };
        const items = await navigationService.getNavigationItems(
            req.tenantId,
            user.role
        );

        return reply.send({ items });
    });

    /**
     * GET /api/navigation/items/all
     * Get all navigation menu items (admin only)
     */
    app.withTypeProvider<ZodTypeProvider>().get('/items/all', {
        schema: {
            tags: ['Navigation'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        const user = req.user as { role: string } | undefined;
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }

        const items = await navigationService.getAllNavigationItems();
        return reply.send({ items });
    });

    /**
     * POST /api/navigation/cache/invalidate
     * Invalidate navigation cache (admin only)
     */
    app.withTypeProvider<ZodTypeProvider>().post('/cache/invalidate', {
        schema: {
            tags: ['Navigation'],
            security: [{ bearerAuth: [] }],
            body: z.object({
                tenantId: z.number().optional()
            })
        },
    }, async (req: FastifyRequest<{ Body: { tenantId?: number } }>, reply: FastifyReply) => {
        const user = req.user as { role: string } | undefined;
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }

        await navigationService.invalidateCache(req.body.tenantId);
        return reply.send({ message: 'Cache invalidated successfully' });
    });
}
