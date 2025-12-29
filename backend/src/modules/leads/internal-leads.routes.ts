import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { LeadsService } from './leads.service';
import {
    leadFiltersSchema,
    updateLeadStatusSchema,
    assignLeadSchema,
    leadStatsQuerySchema,
} from './leads.schema';
import { z } from 'zod';

/**
 * Internal team routes for lead management
 * These routes require internal authentication (internalAuthMiddleware)
 */
export async function internalLeadsRoutes(app: FastifyInstance) {
    const service = new LeadsService(app);

    // GET /api/internal/leads - List all leads with filters
    app.withTypeProvider<ZodTypeProvider>().get('/leads', {
        schema: {
            querystring: leadFiltersSchema,
            tags: ['Internal', 'Leads'],
            summary: 'List all leads with filters (internal)',
            description: 'Get paginated list of leads with optional filters. Requires internal authentication.',
        },
    }, async (req, reply) => {
        try {
            const { page, pageSize, status, source, dateFrom, dateTo, search, assignedTo } = req.query;

            const result = await service.getAllLeads(
                { status, source, dateFrom: dateFrom as any, dateTo: dateTo as any, search, assignedTo },
                { page, pageSize }
            );

            return reply.send({
                success: true,
                ...result,
            });
        } catch (err: any) {
            app.log.error('Error in GET /internal/leads:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to get leads',
            });
        }
    });

    // GET /api/internal/leads/stats - Get lead statistics
    app.withTypeProvider<ZodTypeProvider>().get('/leads/stats', {
        schema: {
            querystring: leadStatsQuerySchema,
            tags: ['Internal', 'Leads'],
            summary: 'Get lead statistics (internal)',
            description: 'Get stats like total, new, qualified, won, conversion rate',
        },
    }, async (req, reply) => {
        try {
            const { dateFrom, dateTo } = req.query;

            const stats = await service.getLeadStats(dateFrom as any, dateTo as any);

            return reply.send({
                success: true,
                stats,
            });
        } catch (err: any) {
            app.log.error('Error in GET /internal/leads/stats:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to get lead statistics',
            });
        }
    });

    // GET /api/internal/leads/:id - Get single lead details
    app.get<{
        Params: { id: string };
    }>('/leads/:id', {
        schema: {
            tags: ['Internal', 'Leads'],
            summary: 'Get lead details by ID (internal)',
            description: 'Get full details of a single lead including assigned user and demo requests',
        },
    }, async (req, reply) => {
        try {
            const leadId = parseInt(req.params.id);

            if (isNaN(leadId)) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid lead ID',
                });
            }

            const lead = await service.getLeadById(leadId);

            if (!lead) {
                return reply.status(404).send({
                    success: false,
                    error: 'Lead not found',
                });
            }

            return reply.send({
                success: true,
                lead,
            });
        } catch (err: any) {
            app.log.error('Error in GET /internal/leads/:id:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to get lead',
            });
        }
    });

    // PATCH /api/internal/leads/:id/status - Update lead status
    app.withTypeProvider<ZodTypeProvider>().patch<{
        Params: { id: string };
    }>('/leads/:id/status', {
        schema: {
            body: updateLeadStatusSchema,
            tags: ['Internal', 'Leads'],
            summary: 'Update lead status (internal)',
            description: 'Update lead status with optional notes. Status history is automatically tracked.',
        },
    }, async (req, reply) => {
        try {
            const leadId = parseInt(req.params.id);

            if (isNaN(leadId)) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid lead ID',
                });
            }

            const { status, notes } = req.body;

            // Get user ID from internal auth (if available)
            const userId = (req as any).internalUser?.id;

            const updatedLead = await service.updateLeadStatus(leadId, status, notes, userId);

            return reply.send({
                success: true,
                lead: updatedLead,
                message: 'Lead status updated successfully',
            });
        } catch (err: any) {
            app.log.error('Error in PATCH /internal/leads/:id/status:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to update lead status',
            });
        }
    });

    // PATCH /api/internal/leads/:id/assign - Assign lead to team member
    app.withTypeProvider<ZodTypeProvider>().patch<{
        Params: { id: string };
    }>('/leads/:id/assign', {
        schema: {
            body: assignLeadSchema,
            tags: ['Internal', 'Leads'],
            summary: 'Assign lead to team member (internal)',
            description: 'Assign a lead to an internal team member',
        },
    }, async (req, reply) => {
        try {
            const leadId = parseInt(req.params.id);

            if (isNaN(leadId)) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid lead ID',
                });
            }

            const { userId } = req.body;

            const updatedLead = await service.assignLead(leadId, userId);

            return reply.send({
                success: true,
                lead: updatedLead,
                message: 'Lead assigned successfully',
            });
        } catch (err: any) {
            app.log.error('Error in PATCH /internal/leads/:id/assign:', err);
            return reply.status(500).send({
                success: false,
                error: err.message || 'Failed to assign lead',
            });
        }
    });
}
