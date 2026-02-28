
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting subscription fix...');

    // 1. Get 'standard' plan
    const standardPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: 'standard' }
    });

    if (!standardPlan) {
        throw new Error('Standard plan not found! Run seed:subscriptions first.');
    }

    // 2. Find tenants without subscription
    // We get all tenants and check their subscriptions
    const tenants = await prisma.tenant.findMany({
        where: {
            ativo: true
        },
        include: {
            subscription: true
        }
    });

    console.log(`Found ${tenants.length} active tenants.`);

    let fixedCount = 0;

    for (const tenant of tenants) {
        if (!tenant.subscription) {
            console.log(`Creating trial for Tenant ${tenant.id} (${tenant.nome_restaurante})...`);

            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14); // 14 days

            await prisma.tenantSubscription.create({
                data: {
                    tenant_id: tenant.id,
                    plan_id: standardPlan.id,
                    status: 'trial',
                    trial_start: new Date(),
                    trial_end: trialEnd
                }
            });
            fixedCount++;
        } else {
            // Optional: If subscription exists but is invalid/expired and they are an early adopter, maybe reset?
            // For now, only fix missing ones.
            console.log(`Tenant ${tenant.id} already has subscription: ${tenant.subscription.status}`);
        }
    }

    console.log(`✅ Fixed ${fixedCount} tenants.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
