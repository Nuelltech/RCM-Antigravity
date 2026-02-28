import { redis } from './redis';

/**
 * Menu Cache Service
 * Caches menu items to improve performance
 */

const CACHE_TTL = 300; // 5 minutes (same as dashboard)
const CACHE_PREFIX = 'menu:list';

interface MenuCacheOptions {
    categoria?: string;
    status?: 'active' | 'inactive' | 'all';
}

function buildCacheKey(tenantId: number, options: MenuCacheOptions): string {
    const parts = [CACHE_PREFIX, tenantId.toString()];

    if (options.categoria) {
        parts.push(`cat:${options.categoria}`);
    }

    parts.push(`status:${options.status ?? 'active'}`);

    return parts.join(':');
}

export const menuCache = {
    /**
     * Get cached menu items
     */
    async get(tenantId: number, options: MenuCacheOptions = {}): Promise<any[] | null> {
        try {
            const key = buildCacheKey(tenantId, options);
            const cached = await redis.get(key);

            if (cached) {
                console.log(`[MENU CACHE HIT] tenant=${tenantId}`);
                return JSON.parse(cached);
            }

            console.log(`[MENU CACHE MISS] tenant=${tenantId} key=${key}`);
            return null;
        } catch (error) {
            console.error('[MENU CACHE] Get error:', error);
            return null;
        }
    },

    /**
     * Set menu items in cache
     */
    async set(tenantId: number, data: any[], options: MenuCacheOptions = {}): Promise<void> {
        try {
            const key = buildCacheKey(tenantId, options);
            await redis.setex(key, CACHE_TTL, JSON.stringify(data));
            console.log(`[MENU CACHE SET] tenant=${tenantId}, items=${data.length}, ttl=${CACHE_TTL}s`);
        } catch (error) {
            console.error('[MENU CACHE] Set error:', error);
        }
    },

    /**
     * Invalidate all menu caches for a tenant
     */
    async invalidateTenant(tenantId: number): Promise<void> {
        try {
            // Delete all keys matching menu:list:{tenantId}:*
            const pattern = `${CACHE_PREFIX}:${tenantId}:*`;
            const keys = await redis.keys(pattern);

            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[MENU CACHE INVALIDATE] tenant=${tenantId}, keys=${keys.length}`);
            }
        } catch (error) {
            console.error('[MENU CACHE] Invalidate error:', error);
        }
    },

    /**
     * Invalidate all menu caches (all tenants)
     */
    async invalidateAll(): Promise<void> {
        try {
            const pattern = `${CACHE_PREFIX}:*`;
            const keys = await redis.keys(pattern);

            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[MENU CACHE INVALIDATE ALL] keys=${keys.length}`);
            }
        } catch (error) {
            console.error('[MENU CACHE] Invalidate all error:', error);
        }
    },
};
