
import Redis from 'ioredis';
import { env } from '../src/core/env';

async function clearRedis() {
    console.log('🧹 Connecting to Redis...');
    console.log(`📡 URL: ${env.REDIS_URL}`);

    const redis = new Redis(env.REDIS_URL);

    try {
        console.log('🗑️ Flushing all keys...');
        await redis.flushall();
        console.log('✅ Redis cleared successfully!');
    } catch (error) {
        console.error('❌ Error clearing Redis:', error);
    } finally {
        redis.quit();
    }
}

clearRedis();
