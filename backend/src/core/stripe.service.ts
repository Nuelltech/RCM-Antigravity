import Stripe from 'stripe';
import { env } from './env';

// ─── Singleton Stripe Client ──────────────────────────────────────────────────
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

export { stripe };

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Create or retrieve a Stripe customer for a tenant.
 */
export async function createStripeCustomer(params: {
    email: string;
    name: string;
    tenantId: number;
    slug: string;
}): Promise<Stripe.Customer> {
    return stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
            tenant_id: String(params.tenantId),
            tenant_slug: params.slug,
        },
    });
}

/**
 * Create a Stripe Checkout Session for a new subscription.
 * Returns the session URL to redirect the user to.
 */
export async function createCheckoutSession(params: {
    stripeCustomerId: string;
    stripePriceId: string;
    tenantId: number;
    successUrl: string;
    cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.create({
        customer: params.stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
            {
                price: params.stripePriceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
            tenant_id: String(params.tenantId),
        },
        subscription_data: {
            metadata: {
                tenant_id: String(params.tenantId),
            },
        },
    });
}

/**
 * Create a Stripe Billing Portal session so the customer can manage
 * payment methods, invoices, and cancel their subscription.
 */
export async function createBillingPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
    return stripe.billingPortal.sessions.create({
        customer: params.stripeCustomerId,
        return_url: params.returnUrl,
    });
}

/**
 * Cancel a Stripe subscription immediately.
 */
export async function cancelStripeSubscription(
    stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
    return stripe.subscriptions.cancel(stripeSubscriptionId);
}

/**
 * Retrieve a Stripe subscription.
 */
export async function getStripeSubscription(
    stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
    return stripe.subscriptions.retrieve(stripeSubscriptionId, {
        expand: ['items.data.price'],
    });
}

/**
 * Construct and verify a Stripe webhook event from raw body + signature.
 * Throws if signature is invalid.
 */
export function constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
    secret: string
): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
}
