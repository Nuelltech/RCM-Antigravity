
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Debugging Tenant Features & Navigation...');

    // 1. Find the Demo Restaurant tenant
    const tenant = await prisma.tenant.findFirst({
        where: { nome_restaurante: { contains: 'Demo' } }
    });

    if (!tenant) {
        console.log('❌ Tenant "Demo Restaurant" not found!');
        return;
    }

    console.log(`\n🏢 Tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})`);

    // 2. Get Subscription
    const subscription = await prisma.tenantSubscription.findUnique({
        where: { tenant_id: tenant.id },
        include: {
            plan: {
                include: {
                    features: {
                        include: {
                            feature: true
                        }
                    }
                }
            }
        }
    });

    if (!subscription) {
        console.log('⚠️ No active subscription found for this tenant!');
    } else {
        console.log(`💳 Plan: ${subscription.plan.name} (ID: ${subscription.plan.id})`);
        console.log('✅ Active Features for Tenant:');
        subscription.plan.features.forEach(sf => {
            console.log(`   - ${sf.feature.feature_key} (${sf.feature.feature_name})`);
        });
    }

    // 3. Check Navigation Items and their requirements
    console.log('\n🧭 Navigation Items vs Requirements:');
    const menuItems = await prisma.navigationMenuItem.findMany({
        orderBy: { sort_order: 'asc' }
    });

    for (const item of menuItems) {
        let status = '🔓 Unlocked';
        let reason = '';

        if (item.required_feature) {
            const hasFeature = subscription?.plan.features.some(
                sf => sf.feature.feature_key === item.required_feature
            );

            if (!hasFeature) {
                status = '🔒 LOCKED';
                reason = `(Requires feature: '${item.required_feature}' - Missing in plan)`;
            } else {
                reason = `(Requires feature: '${item.required_feature}' - OK)`;
            }
        } else {
            reason = '(No feature required)';
        }

        console.log(`   ${status} [${item.label}] ${reason}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
