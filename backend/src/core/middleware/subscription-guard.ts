import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';

/**
 * Routes that bypass the subscription guard entirely.
 * Auth, subscriptions, webhooks, health, uploads, docs are always accessible.
 */
const BYPASS_ROUTES = [
    '/api/auth/',
    '/api/subscriptions/',
    '/api/webhooks/',
    '/api/health',
    '/api/debug/',
    '/api/internal/',
    '/api/users/accept-invite',
    '/api/users/validate-invite-token',
    '/health',
    '/uploads/',
    '/documentation',
    '/favicon.ico',
];

/**
 * subscriptionGuard — runs after authMiddleware.
 *
 * Blocks all API calls for tenants that are:
 *   - `suspended`: trial expired AND grace period over, or payment failed AND grace over
 *
 * Allows with a warning banner for tenants that are:
 *   - `past_due` within grace period: adds header X-Subscription-Warning
 *
 * Trial tenants are always allowed (trial hasn't expired yet).
 */
export async function subscriptionGuard(req: FastifyRequest, reply: FastifyReply) {
    // Skip if no user (handled by authMiddleware before this)
    if (!(req as any).user) return;

    // Skip bypass routes
    const url = req.url.split('?')[0]; // ignore query params
    if (BYPASS_ROUTES.some(route => url.startsWith(route))) return;

    const tenantId = (req as any).tenantId as number | undefined;
    if (!tenantId) return; // No tenant context → let other middleware handle it

    try {
        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: tenantId },
            select: {
                status: true,
                trial_end: true,
                grace_period_end: true,
                suspension_date: true,
            },
        });

        // No subscription at all — block with payment required
        if (!subscription) {
            return reply.status(402).send({
                error: 'no_subscription',
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'A sua conta não tem uma subscrição ativa.',
                redirectTo: '/pagamento',
            });
        }

        const now = new Date();

        // ── Case 1a: Explicitly suspended (payment failure path) ──────────────
        if (subscription.status === 'suspended') {
            return reply.status(402).send({
                error: 'account_suspended',
                code: 'ACCOUNT_SUSPENDED',
                message: 'A sua conta está suspensa por falta de pagamento. Por favor regularize o pagamento.',
                redirectTo: '/pagamento',
            });
        }

        // ── Case 1b: Cancelled (voluntary cancellation by customer) ───────────
        if (subscription.status === 'cancelled') {
            return reply.status(402).send({
                error: 'account_cancelled',
                code: 'ACCOUNT_CANCELLED',
                message: 'A sua subscrição foi cancelada. Para retomar o acesso, subscreva novamente.',
                redirectTo: '/settings/subscription',
            });
        }

        // ── Case 2: Trial expired (no payment method added, past trial_end) ──
        if (
            subscription.status === 'trial' &&
            subscription.trial_end &&
            subscription.trial_end < now
        ) {
            return reply.status(402).send({
                error: 'trial_expired',
                code: 'TRIAL_EXPIRED',
                message: 'O período de trial expirou. Por favor subscreva para continuar.',
                redirectTo: '/pagamento',
            });
        }

        // ── Case 3: Past due AND grace period expired ─────────────────────────
        if (
            subscription.status === 'past_due' &&
            subscription.grace_period_end &&
            subscription.grace_period_end < now
        ) {
            return reply.status(402).send({
                error: 'payment_overdue',
                code: 'PAYMENT_OVERDUE',
                message: 'O período de carência terminou. Por favor regularize o pagamento.',
                redirectTo: '/pagamento',
            });
        }

        // ── Case 4: Past due BUT within grace period → allow with warning header
        if (subscription.status === 'past_due') {
            const daysLeft = subscription.grace_period_end
                ? Math.ceil((subscription.grace_period_end.getTime() - now.getTime()) / 86_400_000)
                : 0;
            reply.header('X-Subscription-Warning', `grace_period:${daysLeft}`);
            // Allow request to proceed
            return;
        }

        // All other statuses (active, trial within period) → allow
    } catch (err) {
        // If DB check fails, log but don't block the request
        req.log.error({ err }, '[SUBSCRIPTION GUARD] DB check failed');
    }
}
