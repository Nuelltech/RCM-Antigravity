/**
 * Script to manually change a tenant's subscription plan
 * Usage: npx tsx scripts/change-subscription-plan.ts <tenant_id> <plan_name>
 * Example: npx tsx scripts/change-subscription-plan.ts 1 base
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const PLAN_NAMES = ['base', 'standard', 'plus'];

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);

    if (args.length !== 2) {
        console.log('Usage: npx tsx scripts/change-subscription-plan.ts <tenant_id> <plan_name>');
        console.log('Available plans: base, standard, plus');
        console.log('Example: npx tsx scripts/change-subscription-plan.ts 1 base');
        process.exit(1);
    }

    const tenantId = parseInt(args[0]);
    const newPlanName = args[1];

    if (isNaN(tenantId)) {
        console.error('❌ Invalid tenant_id. Must be a number.');
        process.exit(1);
    }

    // Validate plan name
    if (!PLAN_NAMES.includes(newPlanName.toLowerCase())) {
        console.error(`❌ Invalid plan name. Must be one of: ${PLAN_NAMES.join(', ')}`);
        process.exit(1);
    }

    console.log(`\n🔄 Changing subscription for tenant ${tenantId} to plan: ${newPlanName}\n`);

    try {
        // 1. Get the new plan
        const newPlan = await prisma.subscription_plans.findFirst({
            where: { name: newPlanName.toLowerCase() }
        });

        if (!newPlan) {
            console.error(`❌ Plan '${newPlanName}' not found in database`);
            await prisma.$disconnect();
            await redis.quit();
            process.exit(1);
        }

        console.log(`✅ Found plan: ${newPlan.display_name} (€${newPlan.price_monthly}/month)`);

        // 2. Get current subscription
        const currentSubscription = await prisma.tenant_subscriptions.findFirst({
            where: { tenant_id: tenantId },
            include: {
                subscription_plans: true
            }
        });

        if (!currentSubscription) {
            console.error(`❌ No subscription found for tenant ${tenantId}`);
            await prisma.$disconnect();
            await redis.quit();
            process.exit(1);
        }

        console.log(`📋 Current plan: ${currentSubscription.subscription_plans.display_name}`);

        // 3. Update subscription
        const updated = await prisma.tenant_subscriptions.update({
            where: { id: currentSubscription.id },
            data: {
                plan_id: newPlan.id,
                updated_at: new Date()
            },
            include: {
                subscription_plans: true
            }
        });

        console.log(`\n✅ Subscription updated successfully!`);
        console.log(`   Old plan: ${currentSubscription.subscription_plans.display_name}`);
        console.log(`   New plan: ${updated.subscription_plans.display_name}`);
        console.log(`   Status: ${updated.status}`);
        console.log(`   Billing: ${updated.billing_period}`);

        // 4. Invalidate cache IMMEDIATELY
        const cacheKeys = [
            `tenant:${tenantId}:features`,
            `tenant:${tenantId}:subscription`
        ];

        await Promise.all(cacheKeys.map(key => redis.del(key)));
        console.log(`\n🧹 Cache invalidated for tenant ${tenantId}`);

        // 5. Show features for new plan
        const features = await prisma.subscription_plan_features.findMany({
            where: { plan_id: newPlan.id },
            include: {
                subscription_features: true
            }
        });

        console.log(`\n📦 Features included in ${newPlan.display_name}:`);
        features.forEach(pf => {
            console.log(`   ✓ ${pf.subscription_features.name} (${pf.subscription_features.key})`);
        });

        console.log(`\n💡 Refresh the frontend to see the changes (cache is cleared)!`);

    } catch (error) {
        console.error('❌ Error changing subscription:', error);
        await prisma.$disconnect();
        await redis.quit();
        process.exit(1);
    }

    await prisma.$disconnect();
    await redis.quit();
}

main();
