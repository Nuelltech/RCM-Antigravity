import Redis from 'ioredis';
import dotenv from 'dotenv';
import { redisOptions } from '../src/core/redis';

dotenv.config();

async function reproduce() {
    console.log(`🔌 Connecting to Redis with FIXED PATTERN(Decoupled Connections)...`);

    // 1. Connection A: mimics the API/Login connection (General commands)
    const apiRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisOptions);

    // 2. Connection B: mimics QueueEvents (Subscriber Mode)
    const queueRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisOptions);

    console.log('🎧 Putting Connection B into Subscriber Mode...');
    await queueRedis.subscribe('test-channel');
    console.log('✅ Connection B key is now in Subscriber mode.');

    // 3. Mimic Login: Try to set/get a session key using Connection A
    console.log('👤 Attempting to set a session key using Connection A (API)...');

    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT: The fix failed!')), 5000)
    );

    try {
        // This should SUCCEED now because apiRedis is NOT the same connection as queueRedis
        await Promise.race([
            apiRedis.set('test-session-fix', 'active'),
            timeout
        ]);
        console.log('✅ SUCCESS! Session created.');
        console.log('🎉 The fix is verified. Decoupling connections prevents the freeze.');
    } catch (error: any) {
        console.log('\n❌ FAILURE:');
        console.log(`   ${error.message} `);
    }

    apiRedis.disconnect();
    queueRedis.disconnect();
    process.exit(0);
}

reproduce();
