import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSubscriptionFeatures() {
    console.log('📊 Subscription Plans and Features\n');

    // Get all plans with their features
    const plans = await prisma.subscriptionPlan.findMany({
        include: {
            features: {
                include: {
                    feature: true
                }
            }
        },
        orderBy: { id: 'asc' }
    });

    for (const plan of plans) {
        console.log(`\n🔹 ${plan.display_name} (ID: ${plan.id}, Name: ${plan.name})`);
        console.log(`   Price: €${plan.price_monthly}/month`);
        console.log(`   Features:`);

        if (plan.features.length === 0) {
            console.log(`   ⚠️  NO FEATURES ASSIGNED!`);
        } else {
            for (const pf of plan.features) {
                console.log(`     - ${pf.feature.feature_key} (${pf.feature.feature_name})`);
            }
        }
    }

    // Get all available features
    console.log('\n\n📋 All Available Features in Catalog:\n');
    const allFeatures = await prisma.featureCatalog.findMany({
        where: { active: true },
        orderBy: { feature_category: 'asc' }
    });

    for (const feature of allFeatures) {
        console.log(`  - ${feature.feature_key} (${feature.feature_name}) [${feature.feature_category}]`);
    }

    await prisma.$disconnect();
}

checkSubscriptionFeatures().catch(console.error);
