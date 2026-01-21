import { dashboardCache } from '../src/core/cache.service';

/**
 * Script to manually clear dashboard cache.
 * Useful when structural costs change and we need to verify fixes immediately.
 */
async function main() {
    console.log('🧹 Clearing dashboard cache...');

    // Invalidate everything in dashboard namespace
    await dashboardCache.invalidate('*');

    console.log('✅ Dashboard cache cleared.');
}

main()
    .catch((e) => {
        console.error('❌ Error clearing cache:', e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
