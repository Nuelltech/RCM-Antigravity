import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { InventoryService } from './inventario.service';
import { createSessionSchema, updateItemSchema, createLocationSchema, saveCalculatorListSchema } from './inventario.schema';
import z from 'zod';

export async function inventoryRoutes(app: FastifyInstance) {
    // Locations
    app.withTypeProvider<ZodTypeProvider>().get('/locations', {
        schema: {
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.getLocations();
    });

    app.withTypeProvider<ZodTypeProvider>().post('/locations', {
        schema: {
            body: createLocationSchema,
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.createLocation(req.body);
    });

    // Calculator Lists
    app.withTypeProvider<ZodTypeProvider>().get('/calculator-lists', {
        schema: {
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.getCalculatorLists();
    });

    app.withTypeProvider<ZodTypeProvider>().post('/calculator-lists', {
        schema: {
            body: saveCalculatorListSchema,
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.saveCalculatorList(req.body);
    });

    // Sessions
    app.withTypeProvider<ZodTypeProvider>().post('/sessions', {
        schema: {
            body: createSessionSchema,
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.createSession(req.body);
    });

    app.withTypeProvider<ZodTypeProvider>().get('/sessions', {
        schema: {
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.getOpenSessions();
    });

    app.withTypeProvider<ZodTypeProvider>().get('/sessions/:id', {
        schema: {
            params: z.object({ id: z.coerce.number() }),
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        const session = await service.getSession(req.params.id);
        if (!session) return reply.status(404).send({ error: 'Session not found' });
        return session;
    });

    app.withTypeProvider<ZodTypeProvider>().post('/sessions/:id/close', {
        schema: {
            params: z.object({ id: z.coerce.number() }),
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.closeSession(req.params.id);
    });

    // Items
    app.withTypeProvider<ZodTypeProvider>().patch('/items/:id', {
        schema: {
            params: z.object({ id: z.coerce.number() }),
            body: updateItemSchema,
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.updateItem(req.params.id, req.body);
    });

    app.withTypeProvider<ZodTypeProvider>().delete('/items/:id', {
        schema: {
            params: z.object({ id: z.coerce.number() }),
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        await service.deleteItem(req.params.id);
        return { success: true };
    });

    app.withTypeProvider<ZodTypeProvider>().post('/sessions/:id/items', {
        schema: {
            params: z.object({ id: z.coerce.number() }),
            body: z.object({ productId: z.number() }),
            tags: ['Inventory'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new InventoryService(req.tenantId, 1); // TODO: Get userId from JWT
        return service.addItem(req.params.id, req.body.productId);
    });
}
