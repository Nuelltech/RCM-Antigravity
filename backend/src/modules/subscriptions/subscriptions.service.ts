import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// Redis with graceful error handling
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: () => null, // Don't retry
    maxRetriesPerRequest: 0,
    enableReadyCheck: false,
    lazyConnect: true, // Don't connect immediately
    enableOfflineQueue: false
});

// Silence all Redis errors - fallback to no cache
redis.on('error', (err) => {
    // Silent - cache disabled when Redis unavailable
});

// Try to connect silently, ignore if fails
redis.connect().catch(() => {
    // Redis not available - continue without cache
});

export interface TenantFeatures {
    features: string[];
    plan_name: string;
    plan_display_name: string;
}

class SubscriptionsService {
    private readonly CACHE_TTL = 900; // 15 minutes

    /**
     * Get all features available to a tenant (from plan + addons)
     * Uses Redis cache for performance
     */
    async getTenantFeatures(tenantId: number): Promise<string[]> {
        const cacheKey = `tenant:${tenantId}:features`;

        // Try cache first (skip if Redis unavailable)
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            // Redis unavailable - continue without cache
        }

        // Cache miss - query database
        const features = await prisma.$queryRaw<Array<{ feature_key: string }>>`
      SELECT DISTINCT f.feature_key
      FROM feature_catalog f
      WHERE f.id IN (
        -- Features from subscription plan
        SELECT sf.feature_id 
        FROM subscription_features sf
        JOIN tenant_subscriptions ts ON ts.plan_id = sf.plan_id
        WHERE ts.tenant_id = ${tenantId} AND ts.status IN ('active', 'trial')
        
        UNION
        
        -- Features from active add-ons
        SELECT af.feature_id
        FROM addon_features af
        JOIN tenant_addons ta ON ta.addon_id = af.addon_id
        WHERE ta.tenant_id = ${tenantId} AND ta.status = 'active'
      )
      AND f.active = true
    `;

        const featureKeys = features.map(f => f.feature_key);

        // Cache for next requests (skip if Redis unavailable)
        try {
            await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(featureKeys));
        } catch (error) {
            // Redis unavailable - continue without caching
        }

        return featureKeys;
    }

    /**
     * Check if tenant has access to specific feature
     */
    async hasFeature(tenantId: number, featureKey: string): Promise<boolean> {
        const features = await this.getTenantFeatures(tenantId);
        return features.includes(featureKey);
    }

    /**
     * Get full tenant subscription details with features
     */
    async getTenantSubscription(tenantId: number): Promise<TenantFeatures | null> {
        const cacheKey = `tenant:${tenantId}:subscription`;

        // Try cache (skip if Redis unavailable)
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            // Redis unavailable - continue without cache
        }

        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: tenantId },
            include: {
                plan: {
                    include: {
                        features: {
                            include: {
                                feature: true
                            }
                        }
                    }
                },
                tenantAddons: {
                    where: { status: 'active' },
                    include: {
                        addon: {
                            include: {
                                features: {
                                    include: {
                                        feature: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!subscription) {
            return null;
        }

        // Collect all features from plan + addons
        const planFeatures = subscription.plan.features.map(pf => pf.feature.feature_key);
        const addonFeatures = subscription.tenantAddons.flatMap(ta =>
            ta.addon.features.map(af => af.feature.feature_key)
        );

        const allFeatures = [...new Set([...planFeatures, ...addonFeatures])];

        const result: TenantFeatures = {
            features: allFeatures,
            plan_name: subscription.plan.name,
            plan_display_name: subscription.plan.display_name
        };

        // Cache (skip if Redis unavailable)
        try {
            await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
        } catch (error) {
            // Redis unavailable - continue without caching
        }

        return result;
    }

    /**
     * Get all available plans with their features
     */
    async getAllPlans() {
        return prisma.subscriptionPlan.findMany({
            where: { active: true },
            include: {
                features: {
                    include: {
                        feature: true
                    }
                }
            },
            orderBy: { sort_order: 'asc' }
        });
    }

    /**
     * Get current subscription status
     */
    async getSubscriptionStatus(tenantId: number) {
        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenant_id: tenantId },
            include: {
                plan: true,
                tenantAddons: {
                    where: { status: 'active' },
                    include: { addon: true }
                }
            }
        });

        if (!subscription) {
            return {
                status: 'no_subscription',
                message: 'No active subscription found'
            };
        }

        // Check if in grace period
        if (subscription.grace_period_end && new Date() < subscription.grace_period_end) {
            const daysRemaining = Math.ceil(
                (subscription.grace_period_end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            return {
                status: 'grace_period',
                message: `Payment failed. ${daysRemaining} days remaining before suspension.`,
                grace_period_end: subscription.grace_period_end,
                days_remaining: daysRemaining
            };
        }

        // Check if suspended
        if (subscription.status === 'suspended') {
            return {
                status: 'suspended',
                message: 'Account suspended due to payment failure'
            };
        }

        // Check if in trial
        if (subscription.trial_end && new Date() < subscription.trial_end) {
            const daysRemaining = Math.ceil(
                (subscription.trial_end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            return {
                status: 'trial',
                message: `Trial period. ${daysRemaining} days remaining.`,
                trial_end: subscription.trial_end,
                days_remaining: daysRemaining
            };
        }

        return {
            status: subscription.status,
            plan: subscription.plan,
            addons: subscription.tenantAddons.map(ta => ta.addon)
        };
    }

    /**
     * Invalidate tenant cache (call after subscription changes)
     */
    async invalidateTenantCache(tenantId: number) {
        await redis.del(`tenant:${tenantId}:features`);
        await redis.del(`tenant:${tenantId}:subscription`);
    }

    /**
     * Create trial subscription for new tenant
     */
    async createTrialSubscription(tenantId: number, planName: string = 'base') {
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { name: planName }
        });

        if (!plan) {
            throw new Error(`Plan ${planName} not found`);
        }

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14); // 14 days trial

        const subscription = await prisma.tenantSubscription.create({
            data: {
                tenant_id: tenantId,
                plan_id: plan.id,
                status: 'trial',
                trial_start: new Date(),
                trial_end: trialEnd
            }
        });

        // Invalidate cache
        await this.invalidateTenantCache(tenantId);

        return subscription;
    }

    /**
     * Handle payment failure - set grace period
     */
    async handlePaymentFailed(tenantId: number) {
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3 days grace

        await prisma.tenantSubscription.update({
            where: { tenant_id: tenantId },
            data: {
                status: 'past_due',
                payment_failed_at: new Date(),
                grace_period_end: gracePeriodEnd
            }
        });

        await this.invalidateTenantCache(tenantId);

        // TODO: Send email notification
        console.log(`⚠️  Payment failed for tenant ${tenantId}. Grace period ends ${gracePeriodEnd}`);
    }

    /**
     * Suspend account after grace period (payment failure path).
     * Use cancelAccount() for voluntary Stripe cancellations.
     */
    async suspendAccount(tenantId: number, reason: string) {
        await prisma.tenantSubscription.update({
            where: { tenant_id: tenantId },
            data: {
                status: 'suspended',
                suspension_date: new Date(),
                suspension_reason: reason,
            }
        });

        // Update tenant status
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: 'suspended',
                suspended_at: new Date(),
                suspension_reason: reason
            }
        });

        await this.invalidateTenantCache(tenantId);

        console.log(`🚫 Account suspended: Tenant ${tenantId} - ${reason}`);
    }

    /**
     * Cancel account — called when Stripe subscription is voluntarily cancelled
     * (customer.subscription.deleted webhook).
     * Different from suspendAccount: cancellation is intentional, not a payment failure.
     */
    async cancelAccount(tenantId: number, reason: string) {
        await prisma.tenantSubscription.update({
            where: { tenant_id: tenantId },
            data: {
                status: 'cancelled',
                cancellation_date: new Date(),
                // Clear payment failure fields — this is a clean cancel, not a payment issue
                payment_failed_at: null,
                grace_period_end: null,
            }
        });

        // Update tenant status
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: 'cancelled',
                suspended_at: null,
                suspension_reason: reason
            }
        });

        await this.invalidateTenantCache(tenantId);

        console.log(`❌ Account cancelled: Tenant ${tenantId} - ${reason}`);
    }

    /**
     * Reactivate account after payment success or manual reactivation.
     * Clears all suspension, cancellation and payment failure fields.
     */
    async reactivateAccount(tenantId: number) {
        await prisma.tenantSubscription.update({
            where: { tenant_id: tenantId },
            data: {
                status: 'active',
                payment_failed_at: null,
                grace_period_end: null,
                suspension_date: null,
                suspension_reason: null,
                cancellation_date: null,
            }
        });

        // Update tenant status
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: 'active',
                suspended_at: null,
                suspension_reason: null
            }
        });

        await this.invalidateTenantCache(tenantId);

        console.log(`✅ Account reactivated: Tenant ${tenantId}`);
    }
}

export const subscriptionsService = new SubscriptionsService();
