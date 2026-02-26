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
     * POST /api/subscriptions/create-checkout-session
     * Creates a Stripe Checkout session and returns the URL.
     * The frontend redirects the user to this URL to complete payment.
     */
    app.withTypeProvider<ZodTypeProvider>().post('/create-checkout-session', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
            body: z.object({
                plan_name: z.string(),
                billing_period: z.enum(['monthly', 'yearly']).default('monthly'),
            }),
        },
    }, async (req: FastifyRequest<{ Body: { plan_name: string; billing_period: 'monthly' | 'yearly' } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const { plan_name, billing_period } = req.body;

        // Find the plan
        const plan = await prisma.subscriptionPlan.findUnique({ where: { name: plan_name } });
        if (!plan) return reply.status(404).send({ error: 'Plano não encontrado', message: `O plano "${plan_name}" não existe.` });

        const priceId = billing_period === 'yearly'
            ? plan.stripe_price_id_yearly
            : plan.stripe_price_id_monthly;

        if (!priceId) {
            return reply.status(400).send({
                error: 'price_not_configured',
                message: `O preço Stripe para o plano "${plan.display_name}" (${billing_period}) ainda não está configurado. Contacte o suporte.`
            });
        }

        try {
            // Get or create Stripe customer
            let subscription = await prisma.tenantSubscription.findUnique({
                where: { tenant_id: req.tenantId },
                include: { tenant: true },
            });

            let stripeCustomerId = subscription?.stripe_customer_id;

            if (!stripeCustomerId) {
                const { createStripeCustomer } = await import('../../core/stripe.service');
                const tenant = subscription?.tenant ?? await prisma.tenant.findUnique({ where: { id: req.tenantId } });
                if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' });

                const customer = await createStripeCustomer({
                    email: tenant.email_contacto ?? '',
                    name: tenant.nome_restaurante,
                    tenantId: tenant.id,
                    slug: tenant.slug,
                });
                stripeCustomerId = customer.id;

                if (subscription) {
                    await prisma.tenantSubscription.update({
                        where: { tenant_id: req.tenantId },
                        data: { stripe_customer_id: stripeCustomerId },
                    });
                }
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const { createCheckoutSession } = await import('../../core/stripe.service');

            const session = await createCheckoutSession({
                stripeCustomerId,
                stripePriceId: priceId,
                tenantId: req.tenantId,
                successUrl: `${frontendUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${frontendUrl}/settings/subscription`,
            });

            req.log.info(`[SUBSCRIPTIONS] ✅ Checkout session created for tenant ${req.tenantId}, plan ${plan_name}`);
            return reply.send({ url: session.url });

        } catch (err: any) {
            req.log.error({ err }, `[SUBSCRIPTIONS] ❌ Stripe error creating checkout session for tenant ${req.tenantId}`);

            // Stripe API errors have a 'type' field
            const stripeMessage = err?.raw?.message || err?.message || 'Erro desconhecido do Stripe';
            return reply.status(502).send({
                error: 'stripe_error',
                message: `Erro ao comunicar com o Stripe: ${stripeMessage}`
            });
        }
    });

    /**
     * GET /api/subscriptions/billing-portal
     * Creates a Stripe Billing Portal session so the customer can manage
     * payment methods, download invoices, or cancel.
     */
    app.withTypeProvider<ZodTypeProvider>().get('/billing-portal', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: req.tenantId },
        });

        if (!subscription?.stripe_customer_id) {
            return reply.status(400).send({
                error: 'No Stripe customer found',
                message: 'You must have an active subscription to access the billing portal.'
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const { createBillingPortalSession } = await import('../../core/stripe.service');

        const session = await createBillingPortalSession({
            stripeCustomerId: subscription.stripe_customer_id,
            returnUrl: `${frontendUrl}/definicoes`,
        });

        return reply.send({ url: session.url });
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

    /**
     * POST /api/subscriptions/change-plan
     * Upgrade or downgrade an existing Stripe subscription in-place.
     * Uses stripe.subscriptions.update() if the tenant already has a
     * stripe_subscription_id, otherwise falls back to a new Checkout session.
     */
    app.withTypeProvider<ZodTypeProvider>().post('/change-plan', {
        schema: {
            tags: ['Subscriptions'],
            security: [{ bearerAuth: [] }],
            body: z.object({
                plan_name: z.string(),
                billing_period: z.enum(['monthly', 'yearly']).default('monthly'),
            }),
        },
    }, async (req: FastifyRequest<{ Body: { plan_name: string; billing_period: 'monthly' | 'yearly' } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const { plan_name, billing_period } = req.body;

        // Find the target plan
        const plan = await prisma.subscriptionPlan.findUnique({ where: { name: plan_name } });
        if (!plan) return reply.status(404).send({ error: 'Plano não encontrado', message: `O plano "${plan_name}" não existe.` });

        const priceId = billing_period === 'yearly'
            ? plan.stripe_price_id_yearly
            : plan.stripe_price_id_monthly;

        if (!priceId) {
            return reply.status(400).send({
                error: 'price_not_configured',
                message: `O preço Stripe para o plano "${plan.display_name}" (${billing_period}) ainda não está configurado.`
            });
        }

        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: req.tenantId },
            include: { tenant: true },
        });

        try {
            const { stripe } = await import('../../core/stripe.service');

            // ── Path A: Update existing Stripe subscription (upgrade/downgrade) ────
            if (subscription?.stripe_subscription_id && subscription?.stripe_customer_id) {
                const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                const itemId = stripeSub.items.data[0]?.id;

                if (!itemId) throw new Error('Stripe subscription has no items');

                await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                    items: [{ id: itemId, price: priceId }],
                    proration_behavior: 'create_prorations', // Stripe calculates credit/charge
                    metadata: { tenant_id: String(req.tenantId) },
                });

                // ── Cancel any other active subscriptions for this customer (avoid double billing)
                const allSubs = await stripe.subscriptions.list({
                    customer: subscription.stripe_customer_id,
                    status: 'active',
                });
                const orphanSubs = allSubs.data.filter(s => s.id !== subscription.stripe_subscription_id);
                for (const orphan of orphanSubs) {
                    await stripe.subscriptions.cancel(orphan.id);
                    req.log.warn(`[SUBSCRIPTIONS] 🚫 Cancelled orphan subscription ${orphan.id} for customer ${subscription.stripe_customer_id}`);
                }
                if (orphanSubs.length > 0) {
                    req.log.info(`[SUBSCRIPTIONS] Cleaned up ${orphanSubs.length} orphan subscription(s) for tenant ${req.tenantId}`);
                }

                // Update local DB immediately (webhook will also fire)
                await prisma.tenantSubscription.update({
                    where: { tenant_id: req.tenantId },
                    data: {
                        plan_id: plan.id,
                        billing_period,
                        status: 'active',
                    },
                });

                await subscriptionsService.invalidateTenantCache(req.tenantId);
                req.log.info(`[SUBSCRIPTIONS] ✅ Plan changed for tenant ${req.tenantId} → ${plan_name} (${billing_period})`);
                return reply.send({ success: true, message: `Plano actualizado para ${plan.display_name}.` });
            }

            // ── Path B: No existing subscription → Checkout session ─────────────
            let stripeCustomerId = subscription?.stripe_customer_id;

            if (!stripeCustomerId) {
                const { createStripeCustomer } = await import('../../core/stripe.service');
                const tenant = subscription?.tenant ?? await prisma.tenant.findUnique({ where: { id: req.tenantId } });
                if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' });

                const customer = await createStripeCustomer({
                    email: tenant.email_contacto ?? '',
                    name: tenant.nome_restaurante,
                    tenantId: tenant.id,
                    slug: tenant.slug,
                });
                stripeCustomerId = customer.id;
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const { createCheckoutSession } = await import('../../core/stripe.service');
            const session = await createCheckoutSession({
                stripeCustomerId,
                stripePriceId: priceId,
                tenantId: req.tenantId,
                successUrl: `${frontendUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${frontendUrl}/settings/subscription`,
            });

            return reply.send({ redirectUrl: session.url });

        } catch (err: any) {
            req.log.error({ err }, `[SUBSCRIPTIONS] ❌ Error changing plan for tenant ${req.tenantId}`);
            const stripeMessage = err?.raw?.message || err?.message || 'Erro desconhecido';
            return reply.status(502).send({
                error: 'stripe_error',
                message: `Erro ao actualizar plano: ${stripeMessage}`
            });
        }
    });
}
