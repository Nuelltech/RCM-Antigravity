import { FastifyRequest, FastifyReply } from 'fastify';
import { subscriptionsService } from '../../modules/subscriptions/subscriptions.service';

/**
 * Subscription Guard Middleware - Protects Fastify routes based on subscription features
 * 
 * Usage in a route:
 * app.get('/my-route', {
 *   onRequest: [requiresFeature('sales')]
 * }, handler);
 */
export function requiresFeature(featureKey: string) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
        // Skip guard if no tenant (will be caught by auth middleware)
        if (!request.tenantId) {
            return;
        }

        // Check if tenant has the required feature
        const hasAccess = await subscriptionsService.hasFeature(
            request.tenantId,
            featureKey
        );

        if (!hasAccess) {
            // Get tenant's current plan for better error message
            const subscription = await subscriptionsService.getTenantSubscription(request.tenantId);
            const currentPlan = subscription?.plan_display_name || 'current plan';

            return reply.status(403).send({
                error: 'Feature not available',
                message: `Your ${currentPlan} does not include ${getFeatureDisplayName(featureKey)}.`,
                feature: featureKey,
                currentPlan: subscription?.plan_name || null,
                upgradeRequired: true,
                suggestedAction: 'Please upgrade your plan to access this feature.'
            });
        }

        // Feature check passed, continue to route handler
    };
}

/**
 * Helper to get user-friendly feature names
 */
function getFeatureDisplayName(featureKey: string): string {
    const featureNames: Record<string, string> = {
        'sales': 'Sales Tracking',
        'inventory': 'Inventory Management',
        'stocks': 'Stock Management',
        'ai_forecasting': 'AI Forecasting',
        'invoices': 'Invoice Management',
        'dashboard': 'Dashboard Analytics',
        'products_recipes': 'Products & Recipes'
    };

    return featureNames[featureKey] || featureKey;
}

/**
 * Middleware to check if tenant has ANY active subscription
 */
export async function requiresActiveSubscription(request: FastifyRequest, reply: FastifyReply) {
    if (!request.tenantId) {
        return;  // Will be caught by auth middleware
    }

    const status = await subscriptionsService.getSubscriptionStatus(request.tenantId);

    if (status.status === 'no_subscription' || status.status === 'suspended') {
        return reply.status(403).send({
            error: 'No active subscription',
            message: 'Your account does not have an active subscription.',
            status: status.status,
            action: 'Please contact support or renew your subscription.'
        });
    }

    // Allow trial, active, and grace_period statuses to proceed
}
