import { redis } from './redis';

/**
 * Products Cache Service
 * Caches product listings to improve performance
 */

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'products:list';

interface ProductsCacheOptions {
    page?: number;
    limit?: number;
    search?: string;
}

function buildCacheKey(tenantId: number, options: ProductsCacheOptions): string {
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

export const productsCache = {
    /**
     * Get cached products list
     */
    async get(tenantId: number, options: ProductsCacheOptions = {}): Promise<any | null> {
        try {
            const key = buildCacheKey(tenantId, options);
            const cached = await redis.get(key);

            if (cached) {
                console.log(`[PRODUCTS CACHE HIT] tenant=${tenantId}, page=${options.page}, search=${options.search}`);
                return JSON.parse(cached);
            }

            console.log(`[PRODUCTS CACHE MISS] tenant=${tenantId}, page=${options.page}, search=${options.search}`);
            return null;
        } catch (error) {
            console.error('[PRODUCTS CACHE] Get error:', error);
            return null;
        }
    },

    /**
     * Set products list in cache
     */
    async set(tenantId: number, data: any, options: ProductsCacheOptions = {}): Promise<void> {
        try {
            const key = buildCacheKey(tenantId, options);
            await redis.setex(key, CACHE_TTL, JSON.stringify(data));
            console.log(`[PRODUCTS CACHE SET] tenant=${tenantId}, page=${options.page}, ttl=${CACHE_TTL}s`);
        } catch (error) {
            console.error('[PRODUCTS CACHE] Set error:', error);
        }
    },

    /**
     * Invalidate all products caches for a tenant
     */
    async invalidateTenant(tenantId: number): Promise<void> {
        try {
            const pattern = `${CACHE_PREFIX}:${tenantId}:*`;
            const keys = await redis.keys(pattern);

            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[PRODUCTS CACHE INVALIDATE] tenant=${tenantId}, keys=${keys.length}`);
            }
        } catch (error) {
            console.error('[PRODUCTS CACHE] Invalidate error:', error);
        }
    },

    /**
     * Invalidate all products caches (all tenants)
     */
    async invalidateAll(): Promise<void> {
        try {
            const pattern = `${CACHE_PREFIX}:*`;
            const keys = await redis.keys(pattern);

            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[PRODUCTS CACHE INVALIDATE ALL] keys=${keys.length}`);
            }
        } catch (error) {
            console.error('[PRODUCTS CACHE] Invalidate all error:', error);
        }
    },
};
