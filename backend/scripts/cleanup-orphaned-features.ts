import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedFeatures() {
    console.log('🧹 Cleaning up orphaned subscription_features...\n');

    try {
        // 1. Find orphaned records
        const orphanedRecords = await prisma.$queryRaw<Array<{ id: number, plan_id: number, feature_id: number }>>`
            SELECT sf.id, sf.plan_id, sf.feature_id
            FROM subscription_features sf
            LEFT JOIN feature_catalog fc ON sf.feature_id = fc.id
            WHERE fc.id IS NULL
        `;

        if (orphanedRecords.length === 0) {
            console.log('✅ No orphaned records found!');
            return;
        }

        console.log(`⚠️  Found ${orphanedRecords.length} orphaned record(s):`);
        orphanedRecords.forEach(record => {
            console.log(`  - ID: ${record.id}, plan_id: ${record.plan_id}, feature_id: ${record.feature_id} (MISSING)`);
        });

        // 2. Delete orphaned records
        console.log('\n🗑️  Deleting orphaned records...');
        const deleteResult = await prisma.$executeRaw`
            DELETE sf FROM subscription_features sf
            LEFT JOIN feature_catalog fc ON sf.feature_id = fc.id
            WHERE fc.id IS NULL
        `;

        console.log(`✅ Deleted ${deleteResult} orphaned record(s)\n`);

        // 3. Verify cleanup
        const remaining = await prisma.$queryRaw<Array<{ count: number }>>`
            SELECT COUNT(*) as count
            FROM subscription_features sf
            LEFT JOIN feature_catalog fc ON sf.feature_id = fc.id
            WHERE fc.id IS NULL
        `;

        if (remaining[0].count === 0) {
            console.log('✅ All orphaned records cleaned up successfully!');
            console.log('\n📊 Current state:');

            // Show current features
            const features = await prisma.featureCatalog.findMany({
                orderBy: { id: 'asc' }
            });
            console.log(`   - ${features.length} features in catalog`);

            // Show subscription_features count
            const subFeatures = await prisma.subscriptionFeature.count();
            console.log(`   - ${subFeatures} subscription-feature mappings`);

            console.log('\n✅ You can now run: npx prisma db push');
        } else {
            console.log(`❌ Still ${remaining[0].count} orphaned records remaining!`);
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

cleanupOrphanedFeatures()
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
