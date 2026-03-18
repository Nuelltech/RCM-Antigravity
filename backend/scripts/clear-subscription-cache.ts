/**
 * Clear subscription cache for a tenant
 * Usage: npx tsx scripts/clear-subscription-cache.ts <tenant_id>
 * Example: npx tsx scripts/clear-subscription-cache.ts 1
 */

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function main() {
    const args = process.argv.slice(2);

    if (args.length !== 1) {
        console.log('Usage: npx tsx scripts/clear-subscription-cache.ts <tenant_id>');
        console.log('Example: npx tsx scripts/clear-subscription-cache.ts 1');
        process.exit(1);
    }

    const tenantId = parseInt(args[0]);

    if (isNaN(tenantId)) {
        console.error('❌ Invalid tenant_id. Must be a number.');
        process.exit(1);
    }

    console.log(`\n🧹 Clearing subscription cache for tenant ${tenantId}...\n`);

    try {
        const cacheKey = `tenant:${tenantId}:features`;

        const result = await redis.del(cacheKey);

        if (result > 0) {
            console.log(`✅ Cache cleared successfully!`);
            console.log(`   Key removed: ${cacheKey}`);
        } else {
            console.log(`ℹ️  No cache found (key: ${cacheKey})`);
        }

        console.log(`\n💡 Refresh the frontend to fetch fresh data!`);

    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        process.exit(1);
    } finally {
        await redis.quit();
    }
}

main();
