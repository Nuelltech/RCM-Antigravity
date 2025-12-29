import { redis } from './redis';

/**
 * Generic caching service for multi-tenant application
 * 
 * Features:
 * - Namespace isolation (e.g., "dashboard:", "stats:")
 * - Automatic tenant isolation
 * - TTL support
 * - Pattern-based invalidation
 */
export class CacheService {
    private prefix: string;

    constructor(namespace: string) {
        this.prefix = `${namespace}:`;
    }

    /**
     * Get cached value
     * @param key Cache key
     * @returns Parsed value or null if not found/expired
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await redis.get(this.prefix + key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Cache GET error for ${this.prefix}${key}:`, error);
            return null;
        }
    }

    /**
     * Set cached value with TTL
     * @param key Cache key
     * @param value Value to cache (will be JSON.stringified)
     * @param ttlSeconds Time to live in seconds (default: 5 minutes)
     */
    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        try {
            await redis.setex(
                this.prefix + key,
                ttlSeconds,
                JSON.stringify(value)
            );
        } catch (error) {
            console.error(`Cache SET error for ${this.prefix}${key}:`, error);
        }
    }

    /**
     * Invalidate keys matching pattern
     * @param pattern Glob pattern (e.g., "tenant:1:*")
     */
    async invalidate(pattern: string): Promise<void> {
        try {
            const keys = await redis.keys(this.prefix + pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`Invalidated ${keys.length} cache keys matching ${this.prefix}${pattern}`);
            }
        } catch (error) {
            console.error(`Cache INVALIDATE error for ${this.prefix}${pattern}:`, error);
        }
    }

    /**
     * Invalidate all cache entries for a specific tenant
     * @param tenantId Tenant ID
     */
    async invalidateTenant(tenantId: number): Promise<void> {
        await this.invalidate(`tenant:${tenantId}:*`);
    }

    /**
     * Get cache statistics
     * @param tenantId Optional tenant ID to filter keys
     */
    async getStats(tenantId?: number): Promise<{ totalKeys: number; keys: string[] }> {
        try {
            const pattern = tenantId
                ? `${this.prefix}tenant:${tenantId}:*`
                : `${this.prefix}*`;

            const keys = await redis.keys(pattern);
            return {
                totalKeys: keys.length,
                keys: keys.slice(0, 10) // Return first 10 for inspection
            };
        } catch (error) {
            console.error('Cache STATS error:', error);
            return { totalKeys: 0, keys: [] };
        }
    }
}

// Export singleton instances for different domains
export const dashboardCache = new CacheService('dashboard');
export const statsCache = new CacheService('stats');
export const recipeCache = new CacheService('recipe');
export const inventoryCache = new CacheService('inventory');
