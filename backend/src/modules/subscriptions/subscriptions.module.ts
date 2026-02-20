import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { subscriptionsService } from './subscriptions.service';
import { prisma } from '../../core/database';

export async function subscriptionsRoutes(app: FastifyInstance) {

    /**
     * GET /api/subscriptions/current
     * Get current tenant subscription with plan details
     */
    app.withTypeProvider<ZodTypeProvider>().get('/current', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
            response: {
                200: z.object({
                    subscription: z.object({
                        id: z.number(),
                        status: z.string(),
                        billing_period: z.string(),
                        current_period_end: z.string().nullable(),
                        trial_end: z.string().nullable(),
                        plan: z.object({
                            id: z.number(),
                            name: z.string(),
                            display_name: z.string(),
                            description: z.string().nullable(),
                            price_monthly: z.number(),
                        })
                    }).nullable()
                })
            }
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: req.tenantId },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        display_name: true,
                        description: true,
                        price_monthly: true,
                    }
                }
            }
        });

        if (!subscription) {
            return reply.send({ subscription: null });
        }

        return reply.send({
            subscription: {
                id: subscription.id,
                status: subscription.status,
                billing_period: subscription.billing_period,
                current_period_end: subscription.current_period_end?.toISOString() || null,
                trial_end: subscription.trial_end?.toISOString() || null,
                plan: {
                    id: subscription.plan.id,
                    name: subscription.plan.name,
                    display_name: subscription.plan.display_name,
                    description: subscription.plan.description,
                    price_monthly: Number(subscription.plan.price_monthly),
                }
            }
        });
    });

    /**
     * GET /api/subscriptions/plans
     * Get all available subscription plans with features
     */
    app.withTypeProvider<ZodTypeProvider>().get('/plans', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        const plans = await subscriptionsService.getAllPlans();

        // Transform for API response
        const transformedPlans = plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            display_name: plan.display_name,
            description: plan.description,
            price_monthly: Number(plan.price_monthly),
            price_yearly: plan.price_yearly ? Number(plan.price_yearly) : null,
            features: plan.features.map(pf => ({
                key: pf.feature.feature_key,
                name: pf.feature.feature_name,
                category: pf.feature.feature_category
            })),
            limits: {
                max_users: plan.max_users,
                max_storage_mb: plan.max_storage_mb,
                max_invoices_monthly: plan.max_invoices_monthly,
                max_sales_monthly: plan.max_sales_monthly,
            }
        }));

        return reply.send({ plans: transformedPlans });
    });

    /**
     * GET /api/subscriptions/status
     * Get subscription status (trial, active, grace period, suspended)
     */
    app.withTypeProvider<ZodTypeProvider>().get('/status', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const status = await subscriptionsService.getSubscriptionStatus(req.tenantId);
        return reply.send(status);
    });

    /**
     * GET /api/subscriptions/features
     * Get all features available to current tenant
     */
    app.withTypeProvider<ZodTypeProvider>().get('/features', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const subscription = await subscriptionsService.getTenantSubscription(req.tenantId);
        const status = await subscriptionsService.getSubscriptionStatus(req.tenantId);

        if (!subscription) {
            return reply.status(402).send({
                error: 'No active subscription',
                message: 'Your account does not have an active subscription plan. Please subscribe to access features.',
                action: 'subscribe',
                suggestedPlan: 'base'
            });
        }

        // Return combined data expected by frontend
        return reply.send({
            ...subscription,
            status: status.status,
            trial_end: status.trial_end,
            days_remaining: status.days_remaining,
            // Ensure plan details are flat if needed or keep structure
            plan_name: (subscription as any).plan?.name || (subscription as any).plan_name,
            plan_display_name: (subscription as any).plan?.display_name || (subscription as any).plan_display_name,
            features: await subscriptionsService.getTenantFeatures(req.tenantId)
        });
    });

    /**
     * POST /api/subscriptions/check-feature
     * Check if tenant has access to a specific feature
     */
    app.withTypeProvider<ZodTypeProvider>().post('/check-feature', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
            body: z.object({
                feature: z.string()
            }),
            response: {
                200: z.object({
                    hasAccess: z.boolean(),
                    feature: z.string(),
                    currentPlan: z.string().nullable()
                })
            }
        },
    }, async (req: FastifyRequest<{ Body: { feature: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const { feature } = req.body;

        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: req.tenantId },
            include: { plan: true }
        });

        if (!subscription) {
            return reply.status(402).send({
                error: 'No active subscription',
                message: 'Your account does not have an active subscription plan.',
                hasAccess: false,
                feature,
                currentPlan: null,
                action: 'subscribe'
            });
        }

        const hasAccess = await subscriptionsService.hasFeature(req.tenantId, feature);

        return reply.send({
            hasAccess,
            feature,
            currentPlan: subscription.plan.name
        });
    });

    /**
     * POST /api/subscriptions/upgrade
     * Upgrade to a different plan (TODO: Stripe integration)
     */
    app.withTypeProvider<ZodTypeProvider>().post('/upgrade', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
            body: z.object({
                plan_name: z.string()
            })
        },
    }, async (req: FastifyRequest<{ Body: { plan_name: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        // TODO: Implement Stripe subscription update
        // For now, just return not implemented
        return reply.status(501).send({
            error: 'Upgrade functionality requires Stripe integration',
            message: 'This feature will be available after Stripe configuration'
        });
    });

    /**
     * GET /api/subscriptions/billing-history
     * Get payment history for current tenant
     */
    app.withTypeProvider<ZodTypeProvider>().get('/billing-history', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: req.tenantId }
        });

        if (!subscription) {
            return reply.send({ payments: [] });
        }

        const payments = await prisma.paymentHistory.findMany({
            where: { subscription_id: subscription.id },
            orderBy: { billing_date: 'desc' },
            take: 12 // Last 12 payments
        });

        return reply.send({
            payments: payments.map(p => ({
                id: p.id.toString(),
                amount: Number(p.amount),
                currency: p.currency,
                status: p.status,
                billing_date: p.billing_date.toISOString(),
                paid_at: p.paid_at?.toISOString() || null,
                failed_at: p.failed_at?.toISOString() || null,
                failure_reason: p.failure_reason
            }))
        });
    });
}
