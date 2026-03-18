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
                paidTenants,
                totalLeads,
                newLeadsToday,
                newLeadsThisWeek,
                convertedLeads,
                mrrSubs,
                gracePeriodCount,
                expiredCount,
                tenantsByPlanGroup,
                allPlans,
            ] = await Promise.all([
                // Total tenants
                prisma.tenant.count(),

                // Active tenants (users with login in last 30 days)
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
                    where: { plano: 'trial' }
                }),

                // Paid tenants (plano != trial)
                prisma.tenant.count({
                    where: { plano: { not: 'trial' } }
                }),

                // Total leads
                prisma.lead.count(),

                // New leads today
                prisma.lead.count({
                    where: {
                        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    }
                }),

                // New leads this week
                prisma.lead.count({
                    where: {
                        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    }
                }),

                // Converted leads
                prisma.lead.count({
                    where: { NOT: { converted_to_user_id: null } }
                }),

                // MRR: active paid subscriptions with plan price
                prisma.tenantSubscription.findMany({
                    where: { status: 'active' },
                    select: { plan: { select: { price_monthly: true } } }
                }),

                // Grace period: past_due but grace window not yet expired
                prisma.tenantSubscription.count({
                    where: {
                        status: 'past_due',
                        grace_period_end: { gte: new Date() }
                    }
                }),

                // Expired: past_due with elapsed grace, or canceled/suspended
                prisma.tenantSubscription.count({
                    where: {
                        OR: [
                            { status: 'past_due', grace_period_end: { lt: new Date() } },
                            { status: 'canceled' },
                            { status: 'suspended' },
                        ]
                    }
                }),

                // Tenants grouped by subscription plan
                prisma.tenantSubscription.groupBy({
                    by: ['plan_id'],
                    _count: { id: true },
                }),

                // Plan names for the groupBy above
                prisma.subscriptionPlan.findMany({
                    select: { id: true, name: true, display_name: true }
                }),
            ]);

            // Calculate conversion rate
            const conversionRate = totalLeads > 0
                ? Math.round((convertedLeads / totalLeads) * 100)
                : 0;

            // Calculate MRR from active subscriptions
            const mrr = mrrSubs.reduce((sum: number, sub: { plan: { price_monthly: any } | null }) => {
                return sum + Number(sub.plan?.price_monthly || 0);
            }, 0);

            // Build plan breakdown: join groupBy results with plan names
            const tenants_by_plan = allPlans.map((plan: { id: number; name: string; display_name: string }) => {
                const group = tenantsByPlanGroup.find((g: { plan_id: number; _count: { id: number } }) => g.plan_id === plan.id);
                return {
                    plan_name: plan.name,
                    plan_display_name: plan.display_name,
                    count: group?._count.id ?? 0,
                };
            }).sort((a: { count: number }, b: { count: number }) => b.count - a.count);

            const stats = {
                tenants: {
                    total: totalTenants,
                    active: activeTenants,
                    trial: trialTenants,
                    paid: paidTenants,
                    grace_period: gracePeriodCount,
                    expired: expiredCount,
                    by_plan: tenants_by_plan,
                },
                revenue: {
                    mrr: Math.round(mrr * 100) / 100,
                    arr: Math.round(mrr * 12 * 100) / 100,
                    currency: 'EUR',
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
                    active_sessions: activeTenants,
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
