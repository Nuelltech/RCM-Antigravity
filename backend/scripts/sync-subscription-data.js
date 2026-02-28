
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting migration from Tenant to TenantSubscription (JS Version)...');

    const tenants = await prisma.tenant.findMany({
        include: {
            tenantSubscription: true
        }
    });

    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
        let subscription = tenant.tenantSubscription;
        const updateData = {};
        let needsUpdate = false;

        if (tenant.trial_ends_at) {
            const tenantTrialEnd = new Date(tenant.trial_ends_at).getTime();
            const subTrialEnd = subscription && subscription.trial_end ? new Date(subscription.trial_end).getTime() : 0;

            if (tenantTrialEnd !== subTrialEnd) {
                updateData.trial_end = tenant.trial_ends_at;
                needsUpdate = true;
                console.log(`[${tenant.slug}] Syncing trial_end`);
            }
        }

        if (tenant.status && (!subscription || subscription.status !== tenant.status)) {
            updateData.status = tenant.status;
            needsUpdate = true;
            console.log(`[${tenant.slug}] Syncing status`);
        }

        if (tenant.suspension_reason && (!subscription || subscription.suspension_reason !== tenant.suspension_reason)) {
            updateData.suspension_reason = tenant.suspension_reason;
            needsUpdate = true;
            console.log(`[${tenant.slug}] Syncing suspension_reason`);
        }

        if (tenant.suspended_at && (!subscription || !subscription.suspension_date || new Date(subscription.suspension_date).getTime() !== new Date(tenant.suspended_at).getTime())) {
            updateData.suspension_date = tenant.suspended_at;
            needsUpdate = true;
            console.log(`[${tenant.slug}] Syncing suspension_date`);
        }

        if (needsUpdate) {
            if (subscription) {
                await prisma.tenantSubscription.update({
                    where: { id: subscription.id },
                    data: updateData
                });
            } else {
                const standardPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'standard' } });
                if (standardPlan) {
                    await prisma.tenantSubscription.create({
                        data: {
                            tenant_id: tenant.id,
                            plan_id: standardPlan.id,
                            ...updateData
                        }
                    });
                    console.log(`[${tenant.slug}] Created missing subscription record.`);
                }
            }
        }
    }

    console.log('✅ Migration complete.');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
