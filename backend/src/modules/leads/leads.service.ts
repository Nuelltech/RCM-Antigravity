import { FastifyInstance } from 'fastify';
import { prisma } from '../../core/database';
import { CreateLeadDto, CreateDemoRequestDto } from './leads.schema';

export class LeadsService {
    constructor(private app: FastifyInstance) { }

    async createLead(data: CreateLeadDto, ipAddress?: string, userAgent?: string) {
        try {
            // Check if lead already exists (by email)
            const existingLead = await prisma.lead.findFirst({
                where: { email: data.email },
            });

            if (existingLead) {
                // Update existing lead instead of creating duplicate
                return await prisma.lead.update({
                    where: { id: existingLead.id },
                    data: {
                        name: data.name,
                        business_type: data.business_type,
                        source_page: data.source_page,
                        source_cta: data.source_cta,
                        utm_source: data.utm_source,
                        utm_medium: data.utm_medium,
                        utm_campaign: data.utm_campaign,
                        ip_address: ipAddress,
                        user_agent: userAgent,
                        updatedAt: new Date(),
                    },
                });
            }

            // Create new lead
            const lead = await prisma.lead.create({
                data: {
                    name: data.name,
                    email: data.email,
                    business_type: data.business_type,
                    source_page: data.source_page || 'landing',
                    source_cta: data.source_cta,
                    utm_source: data.utm_source,
                    utm_medium: data.utm_medium,
                    utm_campaign: data.utm_campaign,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    status: 'new',
                },
            });

            return lead;
        } catch (error) {
            this.app.log.error(error, 'Error creating lead');
            throw new Error('Failed to create lead');
        }
    }

    async createDemoRequest(data: CreateDemoRequestDto, ipAddress?: string, userAgent?: string) {
        try {
            // If lead_id is provided, link to it and update lead status
            if (data.lead_id) {
                await prisma.lead.update({
                    where: { id: data.lead_id },
                    data: {
                        demo_requested: true,
                        demo_requested_at: new Date(),
                        status: 'demo_scheduled',
                    },
                });
            }

            // Create demo request
            const demoRequest = await prisma.demoRequest.create({
                data: {
                    name: data.name,
                    email: data.email,
                    restaurant: data.restaurant,
                    locations: data.locations,
                    challenge: data.challenge,
                    lead_id: data.lead_id,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    status: 'pending',
                },
            });

            return demoRequest;
        } catch (error) {
            this.app.log.error(error, 'Error creating demo request');
            throw new Error('Failed to create demo request');
        }
    }

    async updateLeadVideoWatched(leadId: number) {
        try {
            return await prisma.lead.update({
                where: { id: leadId },
                data: {
                    video_watched: true,
                    video_watched_at: new Date(),
                },
            });
        } catch (error) {
            this.app.log.error(error, 'Error updating lead video status');
            throw new Error('Failed to update lead');
        }
    }

    // ========================================================================
    // INTERNAL TEAM METHODS (Phase 3)
    // ========================================================================

    async getAllLeads(filters: {
        status?: string;
        source?: string;
        dateFrom?: Date;
        dateTo?: Date;
        search?: string;
        assignedTo?: number;
    }, pagination: { page: number; pageSize: number }) {
        try {
            const where: any = {};

            // Apply filters
            if (filters.status) where.status = filters.status;
            if (filters.source) where.source_page = filters.source;
            if (filters.assignedTo) where.assigned_to = filters.assignedTo;

            if (filters.dateFrom || filters.dateTo) {
                where.createdAt = {};
                if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
                if (filters.dateTo) where.createdAt.lte = filters.dateTo;
            }

            if (filters.search) {
                where.OR = [
                    { name: { contains: filters.search } },
                    { email: { contains: filters.search } },
                ];
            }

            const skip = (pagination.page - 1) * pagination.pageSize;

            const [leads, total] = await Promise.all([
                prisma.lead.findMany({
                    where,
                    skip,
                    take: pagination.pageSize,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        // TODO: Uncomment after running: npx prisma generate
                        // assignedUser: {
                        //     select: {
                        //         id: true,
                        //         name: true,
                        //         email: true,
                        //         role: true,
                        //     },
                        // },
                        demoRequests: {
                            select: {
                                id: true,
                                restaurant: true,
                                challenge: true,
                                status: true,
                                createdAt: true,
                            },
                        },
                    },
                }),
                prisma.lead.count({ where }),
            ]);

            return {
                leads,
                pagination: {
                    page: pagination.page,
                    pageSize: pagination.pageSize,
                    total,
                    totalPages: Math.ceil(total / pagination.pageSize),
                },
            };
        } catch (error) {
            this.app.log.error(error, 'Error getting leads');
            throw new Error('Failed to get leads');
        }
    }

    async updateLeadStatus(leadId: number, status: string, notes?: string, userId?: number) {
        try {
            const lead = await prisma.lead.findUnique({ where: { id: leadId } });
            if (!lead) throw new Error('Lead not found');

            // Build status history entry
            const statusHistory = lead.status_history as any[] || [];
            statusHistory.push({
                from: lead.status,
                to: status,
                changedBy: userId,
                changedAt: new Date().toISOString(),
                notes,
            });

            // Update timestamps based on status
            const updates: any = {
                status,
                status_history: statusHistory,
            };

            if (status === 'contacted' && !lead.last_contacted_at) {
                updates.last_contacted_at = new Date();
            }
            if (status === 'qualified' && !lead.qualified_at) {
                updates.qualified_at = new Date();
            }
            if (status === 'proposal_sent' && !lead.proposal_sent_at) {
                updates.proposal_sent_at = new Date();
            }
            if (status === 'won' && !lead.won_at) {
                updates.won_at = new Date();
            }
            if (status === 'lost' && !lead.lost_at) {
                updates.lost_at = new Date();
                if (notes) updates.lost_reason = notes;
            }

            if (notes && status !== 'lost') {
                updates.internal_notes = notes;
            }

            return await prisma.lead.update({
                where: { id: leadId },
                data: updates,
                include: {
                    assignedUser: true,
                    demoRequests: true,
                },
            });
        } catch (error) {
            this.app.log.error(error, 'Error updating lead status');
            throw new Error('Failed to update lead status');
        }
    }

    async assignLead(leadId: number, userId: number) {
        try {
            return await prisma.lead.update({
                where: { id: leadId },
                data: { assigned_to: userId },
                include: {
                    assignedUser: true,
                },
            });
        } catch (error) {
            this.app.log.error(error, 'Error assigning lead');
            throw new Error('Failed to assign lead');
        }
    }

    async getLeadStats(dateFrom?: Date, dateTo?: Date) {
        try {
            const where: any = {};
            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom) where.createdAt.gte = dateFrom;
                if (dateTo) where.createdAt.lte = dateTo;
            }

            const [
                total,
                newLeads,
                contacted,
                qualified,
                wonLeads,
                lostLeads,
            ] = await Promise.all([
                prisma.lead.count({ where }),
                prisma.lead.count({ where: { ...where, status: 'new' } }),
                prisma.lead.count({ where: { ...where, status: 'contacted' } }),
                prisma.lead.count({ where: { ...where, status: 'qualified' } }),
                prisma.lead.count({ where: { ...where, status: 'won' } }),
                prisma.lead.count({ where: { ...where, status: 'lost' } }),
            ]);

            const conversionRate = total > 0 ? (wonLeads / total) * 100 : 0;

            return {
                total,
                new: newLeads,
                contacted,
                qualified,
                won: wonLeads,
                lost: lostLeads,
                conversionRate: Number(conversionRate.toFixed(2)),
            };
        } catch (error) {
            this.app.log.error(error, 'Error getting lead stats');
            throw new Error('Failed to get lead statistics');
        }
    }

    async getLeadById(leadId: number) {
        try {
            return await prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    assignedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                    demoRequests: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        } catch (error) {
            this.app.log.error(error, 'Error getting lead by ID');
            throw new Error('Failed to get lead');
        }
    }
}
