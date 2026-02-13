import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { subscriptionsService } from '../../modules/subscriptions/subscriptions.service';
import { FEATURE_KEY } from '../decorators/requires-feature.decorator';

/**
 * Guard to verify tenant has access to required feature
 * Works with @RequiresFeature() decorator
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required feature from decorator
        const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // No feature requirement = allow access
        if (!requiredFeature) {
            return true;
        }

        // Get tenant from request (set by tenant middleware or auth guard)
        const request = context.switchToHttp().getRequest();
        const tenantId = request.user?.tenant_id || request.tenantId;

        if (!tenantId) {
            throw new ForbiddenException('Tenant not found in request');
        }

        // Check if tenant has access to feature
        const hasAccess = await subscriptionsService.hasFeature(tenantId, requiredFeature);

        if (!hasAccess) {
            // Get subscription info for better error message
            const subscription = await subscriptionsService.getTenantSubscription(tenantId);

            throw new ForbiddenException({
                message: `Your ${subscription?.plan_display_name || 'plan'} does not include ${this.getFeatureName(requiredFeature)}.`,
                feature: requiredFeature,
                currentPlan: subscription?.plan_name,
                upgradeRequired: true
            });
        }

        return true;
    }

    private getFeatureName(featureKey: string): string {
        const names: Record<string, string> = {
            'invoices': 'Invoice Management',
            'sales': 'Sales Tracking',
            'inventory': 'Inventory Management',
            'stocks': 'Stock Management',
            'ai_forecasting': 'AI Forecasting'
        };
        return names[featureKey] || featureKey;
    }
}
