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
export const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});

export default redis;
