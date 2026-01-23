import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { internalTenantsService } from './internal-tenants.service';
import { z } from 'zod';

const prisma = new PrismaClient();

// Request schemas
const tenantIdSchema = z.object({
    id: z.string(),
});

const invoiceFiltersSchema = z.object({
    status: z.enum(['success', 'error', 'pending', 'rejected']).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(50),
});

const salesFiltersSchema = z.object({
    status: z.enum(['success', 'error', 'pending', 'rejected']).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(50),
});

const addNoteSchema = z.object({
    content: z.string().min(1),
});

const suspendSchema = z.object({
    reason: z.string().min(1),
});

export async function internalTenantsModule(app: FastifyInstance) {
    // Middleware: Only internal users can access these endpoints
    app.addHook('onRequest', async (request, reply) => {
        // TODO: Implement internal auth check
        // For now, we'll skip auth (will be implemented with internal auth middleware)
    });

    // GET /api/internal/tenants - List all tenants
    app.get('/api/internal/tenants', async (request, reply) => {
        const tenants = await internalTenantsService.getAllTenants();
        return reply.send({ success: true, data: tenants });
    });

    // GET /api/internal/tenants/:id/overview
    app.get('/api/internal/tenants/:id/overview', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const overview = await internalTenantsService.getTenantOverview(tenantId);
        return reply.send({ success: true, data: overview });
    });

    // GET /api/internal/tenants/:id/health
    app.get('/api/internal/tenants/:id/health', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const health = await internalTenantsService.getTenantHealth(tenantId);
        return reply.send({ success: true, data: health });
    });

    // GET /api/internal/tenants/:id/recent-errors
    app.get('/api/internal/tenants/:id/recent-errors', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const errors = await internalTenantsService.getRecentErrors(tenantId);
        return reply.send({ success: true, data: errors });
    });

    // GET /api/internal/tenants/:id/invoices
    app.get('/api/internal/tenants/:id/invoices', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);
        const filters = invoiceFiltersSchema.parse(request.query);

        const invoices = await internalTenantsService.getTenantInvoices(tenantId, filters);
        return reply.send({ success: true, data: invoices });
    });

    // GET /api/internal/tenants/:id/invoices/:invoiceId
    app.get('/api/internal/tenants/:id/invoices/:invoiceId', async (request, reply) => {
        const { id, invoiceId } = request.params as { id: string; invoiceId: string };
        const tenantId = parseInt(id);

        const invoice = await internalTenantsService.getInvoiceDetails(tenantId, parseInt(invoiceId));
        return reply.send({ success: true, data: invoice });
    });

    // POST /api/internal/tenants/:id/invoices/:invoiceId/reprocess
    app.post('/api/internal/tenants/:id/invoices/:invoiceId/reprocess', async (request, reply) => {
        const { id, invoiceId } = request.params as { id: string; invoiceId: string };
        const tenantId = parseInt(id);

        const result = await internalTenantsService.reprocessInvoice(tenantId, parseInt(invoiceId));
        return reply.send({ success: true, data: result });
    });

    // GET /api/internal/tenants/:id/sales
    app.get('/api/internal/tenants/:id/sales', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);
        const filters = salesFiltersSchema.parse(request.query);

        const sales = await internalTenantsService.getTenantSales(tenantId, filters);
        return reply.send({ success: true, data: sales });
    });

    // GET /api/internal/tenants/:id/sales/:salesId
    app.get('/api/internal/tenants/:id/sales/:salesId', async (request, reply) => {
        const { id, salesId } = request.params as { id: string; salesId: string };
        const tenantId = parseInt(id);

        const sales = await internalTenantsService.getSalesDetails(tenantId, parseInt(salesId));
        return reply.send({ success: true, data: sales });
    });

    // POST /api/internal/tenants/:id/sales/:salesId/reprocess
    app.post('/api/internal/tenants/:id/sales/:salesId/reprocess', async (request, reply) => {
        const { id, salesId } = request.params as { id: string; salesId: string };
        const tenantId = parseInt(id);

        const result = await internalTenantsService.reprocessSales(tenantId, parseInt(salesId));
        return reply.send({ success: true, data: result });
    });

    // GET /api/internal/tenants/:id/products
    app.get('/api/internal/tenants/:id/products', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const products = await internalTenantsService.getTenantProducts(tenantId);
        return reply.send({ success: true, data: products });
    });

    // GET /api/internal/tenants/:id/recipes
    app.get('/api/internal/tenants/:id/recipes', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const recipes = await internalTenantsService.getTenantRecipes(tenantId);
        return reply.send({ success: true, data: recipes });
    });

    // GET /api/internal/tenants/:id/users
    app.get('/api/internal/tenants/:id/users', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const users = await internalTenantsService.getTenantUsers(tenantId);
        return reply.send({ success: true, data: users });
    });

    // GET /api/internal/tenants/:id/timeline
    app.get('/api/internal/tenants/:id/timeline', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const timeline = await internalTenantsService.getTenantTimeline(tenantId);
        return reply.send({ success: true, data: timeline });
    });

    // POST /api/internal/tenants/:id/notes
    app.post('/api/internal/tenants/:id/notes', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);
        const { content } = addNoteSchema.parse(request.body);

        // TODO: Get internal user ID from auth
        const internalUserId = 'internal-user-1';

        const note = await internalTenantsService.addTenantNote(tenantId, internalUserId, content);
        return reply.send({ success: true, data: note });
    });

    // POST /api/internal/tenants/:id/suspend
    app.post('/api/internal/tenants/:id/suspend', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);
        const { reason } = suspendSchema.parse(request.body);

        await internalTenantsService.suspendTenant(tenantId, reason);
        return reply.send({ success: true, message: 'Tenant suspended' });
    });

    // POST /api/internal/tenants/:id/activate
    app.post('/api/internal/tenants/:id/activate', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        await internalTenantsService.activateTenant(tenantId);
        return reply.send({ success: true, message: 'Tenant activated' });
    });

    // POST /api/internal/tenants/:id/actions/clear-cache
    app.post('/api/internal/tenants/:id/actions/clear-cache', async (request, reply) => {
        const { id } = tenantIdSchema.parse(request.params);
        const tenantId = parseInt(id);

        const result = await internalTenantsService.clearTenantCache(tenantId);
        return reply.send({ success: true, data: result });
    });
}
