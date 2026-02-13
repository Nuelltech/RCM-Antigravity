import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Demo Tenant Subscription...');

    // 1. Find Demo Tenant
    const tenant = await prisma.tenant.findUnique({
        where: { slug: 'demo-restaurant' }
    });

    if (!tenant) {
        throw new Error('❌ Demo Tenant not found! Run "npm run seed" first.');
    }

    console.log(`✓ Found tenant: ${tenant.nome_restaurante} (${tenant.id})`);

    // 2. Find Plus Plan
    const plan = await prisma.subscriptionPlan.findUnique({
        where: { name: 'plus' }
    });

    if (!plan) {
        throw new Error('❌ Plus Plan not found! Run "npx tsx scripts/seed-subscription-plans.ts" first.');
    }

    console.log(`✓ Found plan: ${plan.display_name} (${plan.id})`);

    // 3. Create/Update Subscription
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription = await prisma.tenantSubscription.upsert({
        where: { tenant_id: tenant.id },
        update: {
            plan_id: plan.id,
            status: 'active',
            // Update dates if needed, or keep existing
        },
        create: {
            tenant_id: tenant.id,
            plan_id: plan.id,
            status: 'active',
            billing_period: 'monthly',
            current_period_start: now,
            current_period_end: nextMonth,
            next_billing_date: nextMonth,
        }
    });

    console.log(`\n✅ Subscription created/updated for ${tenant.nome_restaurante}:`);
    console.log(`   - Plan: ${plan.display_name}`);
    console.log(`   - Status: ${subscription.status}`);
    console.log(`   - ID: ${subscription.id}`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
