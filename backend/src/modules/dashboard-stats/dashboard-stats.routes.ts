import { FastifyInstance } from 'fastify';
import { prisma } from '../../core/database';

/**
 * Internal Dashboard Stats Routes
 * Provides real-time statistics for internal team
 */
export async function dashboardStatsRoutes(app: FastifyInstance) {

    // GET /api/internal/dashboard/stats - Overview statistics
    app.get('/stats', {
        schema: {
            tags: ['Internal', 'Dashboard'],
            summary: 'Get dashboard overview statistics',
            description: 'Returns real-time stats about tenants, leads, and system usage',
        },
    }, async (req, reply) => {
        try {
            // Parallel queries for performance
            const [
                totalTenants,
                activeTenants,
                trialTenants,
                totalLeads,
                newLeadsToday,
                newLeadsThisWeek,
                convertedLeads,
            ] = await Promise.all([
                // Total tenants
                prisma.tenant.count(),

                // Active tenants (have users with recent logins)
                prisma.tenant.count({
                    where: {
                        userTenants: {
                            some: {
                                user: {
                                    ultimo_login: {
                                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                                    }
                                }
                            }
                        }
                    }
                }),

                // Trial tenants
                prisma.tenant.count({
                    where: {
                        plano: 'trial'
                    }
                }),

                // Total leads
                prisma.lead.count(),

                // New leads today
                prisma.lead.count({
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                }),

                // New leads this week
                prisma.lead.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),

                // Converted leads (have converted_to_user_id set)
                prisma.lead.count({
                    where: {
                        NOT: {
                            converted_to_user_id: null
                        }
                    }
                }),
            ]);

            // Calculate conversion rate
            const conversionRate = totalLeads > 0
                ? Math.round((convertedLeads / totalLeads) * 100)
                : 0;

            const stats = {
                tenants: {
                    total: totalTenants,
                    active: activeTenants,
                    trial: trialTenants,
                    paid: totalTenants - trialTenants,
                },
                leads: {
                    total: totalLeads,
                    new_today: newLeadsToday,
                    new_this_week: newLeadsThisWeek,
                    conversion_rate: conversionRate,
                    converted: convertedLeads,
                },
                system: {
                    total_users: await prisma.user.count(),
                    active_sessions: activeTenants, // Simplified
                },
            };

            return reply.send({
                success: true,
                stats,
            });
        } catch (err: any) {
            app.log.error('Error in GET /internal/dashboard/stats:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to get dashboard statistics',
            });
        }
    });

    // GET /api/internal/dashboard/activity - Recent activity
    app.get('/activity', {
        schema: {
            tags: ['Internal', 'Dashboard'],
            summary: 'Get recent system activity',
        },
    }, async (req, reply) => {
        try {
            // Get recent tenants
            const recentTenants = await prisma.tenant.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    nome_restaurante: true,
                    createdAt: true,
                }
            });

            // Get recent leads
            const recentLeads = await prisma.lead.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    business_type: true,
                    status: true,
                    createdAt: true,
                }
            });

            return reply.send({
                success: true,
                activity: {
                    recent_tenants: recentTenants,
                    recent_leads: recentLeads,
                },
            });
        } catch (err: any) {
            app.log.error('Error in GET /internal/dashboard/activity:', err);
            return reply.status(500).send({
                success: false,
                error: 'Failed to get activity data',
            });
        }
    });
}
