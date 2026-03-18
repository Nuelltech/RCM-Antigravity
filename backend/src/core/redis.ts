import Redis from 'ioredis';
import { env } from './env';

/**
 * Redis client singleton for caching and queue operations
 * 
 * Used for:
 * - BullMQ job queues
 * - Dashboard stats caching
 * - Auth session caching
 */
export const redisOptions = {
    maxRetriesPerRequest: null, // STRICTLY REQUIRED by BullMQ, cannot be changed
    enableReadyCheck: false,
    retryStrategy(times: number) {
        // Stop retrying entirely if we are in dev and hit the limit
        // Returning null tells ioredis to definitively STOP retrying
        if (env.NODE_ENV !== 'production' && times >= 5) {
            console.warn(`[Redis] Giving up connection after ${times} retries (Dev Environment). Backend will run without Redis.`);
            return null; 
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};

/**
 * Redis client singleton for caching and queue operations
 * 
 * Used for:
 * - BullMQ job queues
 * - Dashboard stats caching
 * - Auth session caching
 */
export const redis = new Redis(env.REDIS_URL, redisOptions);

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err: any) => {
    const errString = String(err?.message || err || '');
    if (errString.includes('ECONNREFUSED') || err?.code === 'ECONNREFUSED') {
        return;
    }
    
    if (err?.errors && Array.isArray(err.errors)) {
        const isRefused = err.errors.some((e: any) => 
            e.code === 'ECONNREFUSED' || String(e).includes('ECONNREFUSED')
        );
        if (isRefused) return;
    }

    console.error('❌ Redis error:', errString);
});

export default redis;
