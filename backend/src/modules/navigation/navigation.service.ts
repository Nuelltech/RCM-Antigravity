import { prisma } from '../../core/database';
import { subscriptionsService } from '../subscriptions/subscriptions.service';
import { CacheService } from '../../core/cache.service';

const cacheService = new CacheService('navigation');

/**
 * Navigation Service - Handles sidebar navigation menu configuration
 */
class NavigationService {
    private cacheKeyPrefix = 'navigation:items';
    private cacheTTL = 300; // 5 minutes

    /**
     * Generate cache key for navigation items
     */
    private getCacheKey(tenantId: number, role: string): string {
        return `${this.cacheKeyPrefix}:tenant:${tenantId}:role:${role}`;
    }

    /**
     * Get navigation items for a specific tenant and user role
     * Filters by role permissions and marks items locked by subscription
     */
    async getNavigationItems(tenantId: number, userRole: string) {
        const cacheKey = this.getCacheKey(tenantId, userRole);

        // Try cache first
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached as string);
        }

        // Compute navigation items
        const items = await this.computeNavigationItems(tenantId, userRole);

        // Cache result
        await cacheService.set(cacheKey, JSON.stringify(items), this.cacheTTL);

        return items;
    }

    /**
     * Compute navigation items (cache miss path)
     */
    private async computeNavigationItems(tenantId: number, userRole: string) {
        // Get tenant subscription features
        const subscription = await subscriptionsService.getTenantSubscription(tenantId);
        const availableFeatures = subscription?.features || [];

        // Get all active navigation items with permissions
        const items = await prisma.navigationMenuItem.findMany({
            where: { active: true },
            include: { permissions: true },
            orderBy: { sort_order: 'asc' }
        });

        // Filter by role permission
        const visibleItems = items.filter(item => {
            // If no permissions defined, visible to all
            if (item.permissions.length === 0) return true;

            // Check if user role has permission
            return item.permissions.some(p => p.role === userRole);
        });

        // Map to response format and mark locked items
        return visibleItems.map(item => ({
            key: item.key,
            name: item.name,
            href: item.href,
            icon: item.icon,
            group: item.group,
            isLocked: item.required_feature
                ? !availableFeatures.includes(item.required_feature)
                : false
        }));
    }

    /**
     * Invalidate navigation cache for a tenant
     */
    async invalidateCache(tenantId?: number) {
        if (tenantId) {
            // Invalidate specific tenant (all roles)
            await cacheService.invalidate(`tenant:${tenantId}:*`);
        } else {
            // Invalidate all navigation caches (when menu structure changes)
            await cacheService.invalidate(`*`);
        }
    }

    /**
     * Get all navigation items (admin only)
     */
    async getAllNavigationItems() {
        return prisma.navigationMenuItem.findMany({
            include: { permissions: true },
            orderBy: { sort_order: 'asc' }
        });
    }

    /**
     * Update navigation item
     */
    async updateNavigationItem(id: number, data: any) {
        const updated = await prisma.navigationMenuItem.update({
            where: { id },
            data,
        });

        // Invalidate all caches (menu structure changed)
        await this.invalidateCache();

        return updated;
    }
}

export const navigationService = new NavigationService();
