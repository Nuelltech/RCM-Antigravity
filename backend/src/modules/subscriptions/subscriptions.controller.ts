import { subscriptionsService } from './subscriptions.service';

/**
 * Controller for subscription management
 */
export class SubscriptionsController {
    /**
     * Get current tenant subscription with features
     */
    async getCurrentSubscription(tenantId: number) {
        return subscriptionsService.getTenantSubscription(tenantId);
    }

    /**
     * Get all available plans
     */
    async getAvailablePlans() {
        return subscriptionsService.getAllPlans();
    }

    /**
     * Get subscription status (trial, active, grace period, etc.)
     */
    async getSubscriptionStatus(tenantId: number) {
        return subscriptionsService.getSubscriptionStatus(tenantId);
    }

    /**
     * Get list of features tenant has access to
     */
    async getMyFeatures(tenantId: number) {
        const features = await subscriptionsService.getTenantFeatures(tenantId);
        const subscription = await subscriptionsService.getTenantSubscription(tenantId);

        return {
            features,
            plan: subscription?.plan_name,
            plan_display_name: subscription?.plan_display_name
        };
    }
}

export const subscriptionsController = new SubscriptionsController();
