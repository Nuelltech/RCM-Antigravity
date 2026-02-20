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
        const status = await subscriptionsService.getSubscriptionStatus(tenantId);

        return {
            features,
            plan: subscription?.plan_name,
            plan_display_name: subscription?.plan_display_name,
            status: status.status,
            trial_end: status.trial_end,
            days_remaining: status.days_remaining
        };
    }
    /**
     * FIX: Force set trial status for current tenant (temporary)
     */
    async fixTrialStatus(tenantId: number) {
        // Import prisma dynamically or assume available via service
        const { prisma } = require('../../core/database');

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);

        // Update Tenant
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                plano: 'trial',
                status: 'trial',
                trial_ends_at: trialEnd,
                data_expiracao_plano: trialEnd
            }
        });

        // Update Subscription
        await prisma.tenantSubscription.updateMany({
            where: { tenant_id: tenantId },
            data: {
                status: 'trial',
                trial_end: trialEnd
            }
        });

        return { message: 'Trial status fixed', trial_end: trialEnd };
    }
}

export const subscriptionsController = new SubscriptionsController();
