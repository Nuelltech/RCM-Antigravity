import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { constructWebhookEvent } from '../../core/stripe.service';
import { subscriptionsService } from './subscriptions.service';
import { prisma } from '../../core/database';
import Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Stripe webhook handler.
 * IMPORTANT: Must be registered BEFORE authMiddleware in server.ts
 * and needs raw body access (addContentTypeParser for 'application/json').
 */
export async function stripeWebhookModule(app: FastifyInstance) {

    // Add raw body parser for this route only
    app.addContentTypeParser(
        'application/json',
        { parseAs: 'buffer' },
        function (_req, body, done) {
            done(null, body);
        }
    );

    /**
     * POST /api/webhooks/stripe
     * Stripe sends events here for all subscription lifecycle changes.
     */
    app.post('/stripe', async (req: FastifyRequest, reply: FastifyReply) => {
        const sig = req.headers['stripe-signature'] as string;

        if (!sig) {
            req.log.warn('[STRIPE WEBHOOK] Missing stripe-signature header');
            return reply.status(400).send({ error: 'Missing signature' });
        }

        let event: Stripe.Event;

        try {
            event = constructWebhookEvent(req.body as Buffer, sig, WEBHOOK_SECRET);
        } catch (err: any) {
            req.log.error(`[STRIPE WEBHOOK] Signature verification failed: ${err.message}`);
            return reply.status(400).send({ error: `Webhook signature invalid: ${err.message}` });
        }

        req.log.info(`[STRIPE WEBHOOK] Event received: ${event.type}`);

        try {
            await handleStripeEvent(event, req);
        } catch (err) {
            req.log.error({ err }, `[STRIPE WEBHOOK] Handler error for ${event.type}`);
            // Return 200 anyway — prevents Stripe from retrying indefinitely on our bugs
            return reply.status(200).send({ received: true, warning: 'Handler error logged' });
        }

        return reply.status(200).send({ received: true });
    });
}

// ─── Event Handler ────────────────────────────────────────────────────────────

async function handleStripeEvent(event: Stripe.Event, req: FastifyRequest) {
    switch (event.type) {

        // ── Checkout completed: link Stripe customer to tenant & update plan ──
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const tenantId = parseInt(session.metadata?.tenant_id || '0');
            if (!tenantId) { req.log.warn('[STRIPE WEBHOOK] checkout.session.completed: no tenant_id in metadata'); break; }

            const stripeSubscriptionId = session.subscription as string;
            const stripeCustomerId = session.customer as string;

            // Get full subscription from Stripe (includes price item details)
            const { getStripeSubscription } = await import('../../core/stripe.service');
            const stripeSub = await getStripeSubscription(stripeSubscriptionId);

            // Match the Stripe price to a local plan
            const priceId = (stripeSub as any)?.items?.data?.[0]?.price?.id ?? null;
            let newPlanId: number | undefined;

            if (priceId) {
                const matchingPlan = await prisma.subscriptionPlan.findFirst({
                    where: {
                        OR: [
                            { stripe_price_id_monthly: priceId },
                            { stripe_price_id_yearly: priceId },
                        ],
                    },
                    select: { id: true, name: true },
                });

                if (matchingPlan) {
                    newPlanId = matchingPlan.id;
                    req.log.info(`[STRIPE WEBHOOK] ✅ Price ${priceId} → plan "${matchingPlan.name}" (id=${matchingPlan.id})`);
                } else {
                    req.log.warn(`[STRIPE WEBHOOK] ⚠️ No plan found for price ${priceId}`);
                }
            }

            await prisma.tenantSubscription.update({
                where: { tenant_id: tenantId },
                data: {
                    stripe_customer_id: stripeCustomerId,
                    stripe_subscription_id: stripeSubscriptionId,
                    status: 'active',
                    ...(newPlanId ? { plan_id: newPlanId } : {}),
                    current_period_start: (stripeSub as any)?.current_period_start
                        ? new Date((stripeSub as any).current_period_start * 1000)
                        : new Date(),
                    current_period_end: (stripeSub as any)?.current_period_end
                        ? new Date((stripeSub as any).current_period_end * 1000)
                        : null,
                    next_billing_date: (stripeSub as any)?.current_period_end
                        ? new Date((stripeSub as any).current_period_end * 1000)
                        : null,
                    payment_failed_at: null,
                    grace_period_end: null,
                    suspension_date: null,
                    suspension_reason: null,
                },
            });

            await subscriptionsService.invalidateTenantCache(tenantId);
            req.log.info(`[STRIPE WEBHOOK] ✅ Tenant ${tenantId} checkout completed${newPlanId ? ` → plan_id=${newPlanId}` : ''}`);
            break;
        }

        // ── Subscription updated (plan change, renewal, etc.) ─────────────────
        case 'customer.subscription.updated': {
            const sub = event.data.object as Stripe.Subscription;
            const tenantId = parseInt(sub.metadata?.tenant_id || '0');
            if (!tenantId) break;

            await prisma.tenantSubscription.update({
                where: { tenant_id: tenantId },
                data: {
                    status: stripeStatusToLocal(sub.status),
                    // Guard against missing/zero timestamps → prevents "Invalid Date" in Prisma
                    ...(sub.current_period_start
                        ? { current_period_start: new Date(sub.current_period_start * 1000) }
                        : {}),
                    ...(sub.current_period_end
                        ? {
                            current_period_end: new Date(sub.current_period_end * 1000),
                            next_billing_date: new Date(sub.current_period_end * 1000),
                        }
                        : {}),
                },
            });

            await subscriptionsService.invalidateTenantCache(tenantId);
            req.log.info(`[STRIPE WEBHOOK] ✅ Tenant ${tenantId} subscription updated → ${sub.status}`);
            break;
        }

        // ── Payment succeeded: reactivate if was past_due ────────────────────
        case 'invoice.payment_succeeded': {
            const invoice = event.data.object as Stripe.Invoice;
            const tenantSub = await findTenantByStripeCustomer(invoice.customer as string);
            if (!tenantSub) { req.log.warn('[STRIPE WEBHOOK] invoice.payment_succeeded: tenant not found'); break; }

            // Record payment
            await prisma.paymentHistory.create({
                data: {
                    subscription_id: tenantSub.id,
                    stripe_invoice_id: invoice.id,
                    stripe_payment_intent_id: invoice.payment_intent as string ?? null,
                    amount: invoice.amount_paid / 100, // convert cents to euros
                    currency: invoice.currency.toUpperCase(),
                    status: 'succeeded',
                    billing_date: new Date((invoice.period_start ?? Date.now() / 1000) * 1000),
                    paid_at: new Date(),
                },
            });

            // Reactivate if was suspended/past_due
            if (['past_due', 'suspended'].includes(tenantSub.status)) {
                await subscriptionsService.reactivateAccount(tenantSub.tenant_id);
                req.log.info(`[STRIPE WEBHOOK] ✅ Tenant ${tenantSub.tenant_id} reactivated after payment`);
            }
            break;
        }

        // ── Payment failed: start grace period ───────────────────────────────
        case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            const tenantSub = await findTenantByStripeCustomer(invoice.customer as string);
            if (!tenantSub) { req.log.warn('[STRIPE WEBHOOK] invoice.payment_failed: tenant not found'); break; }

            // Record failed payment
            await prisma.paymentHistory.create({
                data: {
                    subscription_id: tenantSub.id,
                    stripe_invoice_id: invoice.id,
                    stripe_payment_intent_id: invoice.payment_intent as string ?? null,
                    amount: invoice.amount_due / 100,
                    currency: invoice.currency.toUpperCase(),
                    status: 'failed',
                    billing_date: new Date((invoice.period_start ?? Date.now() / 1000) * 1000),
                    failed_at: new Date(),
                    failure_reason: (invoice as any).last_finalization_error?.message ?? null,
                },
            });

            await subscriptionsService.handlePaymentFailed(tenantSub.tenant_id);

            // Notify tenant admins via email
            const { sendPaymentFailedEmail } = await import('../../core/email.service');
            const GRACE_DAYS = 3;
            const gracePeriodEnd = new Date();
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_DAYS);
            const failedTenantAdmins = await prisma.userTenant.findMany({
                where: { tenant_id: tenantSub.tenant_id, role: 'admin' },
                include: { user: true },
            });
            for (const ut of failedTenantAdmins) {
                try {
                    await sendPaymentFailedEmail(
                        { email: ut.user.email, name: ut.user.nome },
                        GRACE_DAYS,
                        gracePeriodEnd
                    );
                } catch (emailErr) {
                    req.log.error({ emailErr }, `[STRIPE WEBHOOK] Failed to send payment-failed email to ${ut.user.email}`);
                }
            }
            req.log.warn(`[STRIPE WEBHOOK] ⚠️ Tenant ${tenantSub.tenant_id} payment failed — grace period started, ${failedTenantAdmins.length} admin(s) notified`);
            break;
        }

        // ── Subscription deleted/cancelled ───────────────────────────────────
        case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            const tenantId = parseInt(sub.metadata?.tenant_id || '0');
            if (!tenantId) break;

            // Use cancelAccount (not suspendAccount) — this is a voluntary cancellation,
            // not a payment failure. Populates cancellation_date, not suspension_date.
            await subscriptionsService.cancelAccount(tenantId, 'Stripe subscription cancelled by customer');
            req.log.warn(`[STRIPE WEBHOOK] ❌ Tenant ${tenantId} subscription cancelled (customer.subscription.deleted)`);
            break;
        }

        // ── Trial will end in 3 days — Stripe sends this automatically if configured
        case 'customer.subscription.trial_will_end': {
            const sub = event.data.object as Stripe.Subscription;
            req.log.info(`[STRIPE WEBHOOK] ℹ️ Trial ending soon for subscription ${sub.id} — email handled by BullMQ worker`);
            // Email warning is handled by the subscription-check.worker.ts
            break;
        }

        default:
            req.log.info(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findTenantByStripeCustomer(stripeCustomerId: string) {
    return prisma.tenantSubscription.findUnique({
        where: { stripe_customer_id: stripeCustomerId },
        select: { id: true, tenant_id: true, status: true },
    });
}

function stripeStatusToLocal(stripeStatus: Stripe.Subscription.Status): string {
    const map: Record<string, string> = {
        active: 'active',
        trialing: 'trial',
        past_due: 'past_due',
        // 'canceled' = Stripe's spelling for a cancelled subscription → maps to 'cancelled'
        // (distinct from 'suspended' which is our payment-failure state)
        canceled: 'cancelled',
        // These are payment-related incomplete states → suspended (access blocked)
        unpaid: 'past_due',
        incomplete: 'past_due',
        incomplete_expired: 'suspended',
        paused: 'suspended',
    };
    return map[stripeStatus] ?? 'active';
}
