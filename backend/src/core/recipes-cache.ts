import { redis } from './redis';

/**
 * Recipes Cache Service
 * Caches recipe listings to improve performance
 */

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'recipes:list';

interface RecipesCacheOptions {
    page?: number;
    limit?: number;
    search?: string;
}

function buildCacheKey(tenantId: number, options: RecipesCacheOptions): string {
    const parts = [CACHE_PREFIX, tenantId.toString()];

    if (options.page) {
        parts.push(`page:${options.page}`);
    }

    if (options.limit) {
        parts.push(`limit:${options.limit}`);
    }

    if (options.search) {
        parts.push(`search:${options.search}`);
    }

    return parts.join(':');
}

export const recipesCache = {
    /**
     * Get cached recipes list
     */
    async get(tenantId: number, options: RecipesCacheOptions = {}): Promise<any | null> {
        try {
            const key = buildCacheKey(tenantId, options);
            const cached = await redis.get(key);

            if (cached) {
                console.log(`[RECIPES CACHE HIT] tenant=${tenantId}, page=${options.page}, search=${options.search}`);
                return JSON.parse(cached);
            }

            console.log(`[RECIPES CACHE MISS] tenant=${tenantId}, page=${options.page}, search=${options.search}`);
            return null;
        } catch (error) {
            console.error('[RECIPES CACHE] Get error:', error);
            return null;
        }
    },

    /**
     * Set recipes list in cache
     */
    async set(tenantId: number, data: any, options: RecipesCacheOptions = {}): Promise<void> {
        try {
            const key = buildCacheKey(tenantId, options);
            await redis.setex(key, CACHE_TTL, JSON.stringify(data));
            console.log(`[RECIPES CACHE SET] tenant=${tenantId}, page=${options.page}, ttl=${CACHE_TTL}s`);
        } catch (error) {
            console.error('[RECIPES CACHE] Set error:', error);
        }
    },

    /**
     * Invalidate all recipes caches for a tenant
     */
    async invalidateTenant(tenantId: number): Promise<void> {
        try {
            const pattern = `${CACHE_PREFIX}:${tenantId}:*`;
            const keys = await redis.keys(pattern);

            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[RECIPES CACHE INVALIDATE] tenant=${tenantId}, keys=${keys.length}`);
            }
        } catch (error) {
            console.error('[RECIPES CACHE] Invalidate error:', error);
        }
    },

    /**
     * Invalidate all recipes caches (all tenants)
     */
    async invalidateAll(): Promise<void> {
        try {
            const pattern = `${CACHE_PREFIX}:*`;
            const keys = await redis.keys(pattern);

            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[RECIPES CACHE INVALIDATE ALL] keys=${keys.length}`);
            }
        } catch (error) {
            console.error('[RECIPES CACHE] Invalidate all error:', error);
        }
    },
};
