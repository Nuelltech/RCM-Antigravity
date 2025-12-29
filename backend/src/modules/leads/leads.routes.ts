import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { LeadsService } from './leads.service';
import { createLeadSchema, createDemoRequestSchema } from './leads.schema';

export async function leadsRoutes(app: FastifyInstance) {
    const service = new LeadsService(app);

    // Public endpoint - Create Lead
    app.withTypeProvider<ZodTypeProvider>().post('/leads', {
        schema: {
            body: createLeadSchema,
            tags: ['Public', 'Leads'],
            summary: 'Capture lead from landing/demo page',
            description: 'Public endpoint (no auth required) to capture lead information',
        },
    }, async (req, reply) => {
        try {
            const ipAddress = req.ip;
            const userAgent = req.headers['user-agent'];

            const lead = await service.createLead(req.body, ipAddress, userAgent);

            // TODO: Send email notification to marketing team
            // await emailService.notifyNewLead(lead);

            return reply.status(201).send({
                success: true,
                leadId: lead.id,
                message: 'Lead captured successfully',
            });
        } catch (err: any) {
            app.log.error('Error in POST /leads:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to capture lead',
            });
        }
    });

    // Public endpoint - Create Demo Request
    app.withTypeProvider<ZodTypeProvider>().post('/demo-requests', {
        schema: {
            body: createDemoRequestSchema,
            tags: ['Public', 'Leads'],
            summary: 'Request personalized demo',
            description: 'Public endpoint (no auth required) to request a personalized demo',
        },
    }, async (req, reply) => {
        try {
            const ipAddress = req.ip;
            const userAgent = req.headers['user-agent'];

            const demoRequest = await service.createDemoRequest(req.body, ipAddress, userAgent);

            // TODO: Send email notification to sales team
            // await emailService.notifyNewDemoRequest(demoRequest);

            return reply.status(201).send({
                success: true,
                demoRequestId: demoRequest.id,
                message: 'Demo request received successfully',
            });
        } catch (err: any) {
            app.log.error('Error in POST /demo-requests:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to submit demo request',
            });
        }
    });

    // Public endpoint - Update lead video status (optional, for tracking)
    app.post('/leads/:id/video-watched', {
        schema: {
            tags: ['Public', 'Leads'],
            summary: 'Track that lead watched demo video',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                },
            },
        },
    }, async (req, reply) => {
        try {
            const { id } = req.params as { id: number };
            await service.updateLeadVideoWatched(id);

            return reply.send({
                success: true,
                message: 'Video status updated',
            });
        } catch (err: any) {
            app.log.error('Error in POST /leads/:id/video-watched:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to update video status',
            });
        }
    });
}
