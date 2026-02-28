
import { redis } from '../src/core/redis';

async function main() {
    console.log('Clearing Menu Cache...');
    const keys = await redis.keys('menu:list:*');
    console.log(`Found ${keys.length} keys.`);
    if (keys.length > 0) {
        await redis.del(...keys);
        console.log('Deleted keys.');
    } else {
        console.log('No keys to delete.');
    }

    // Also try to ping pending status to see if route exists from script context (won't work, script doesn't run server)
}

main()
    .catch(console.error)
    .finally(() => redis.quit());
