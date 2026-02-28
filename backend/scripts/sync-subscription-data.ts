
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting migration from Tenant to TenantSubscription...');

    const tenants = await prisma.tenant.findMany({
        include: {
            tenantSubscription: true
        }
    });

    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
        // Find existing subscription or create one if missing
        let subscription = tenant.tenantSubscription;

        // Prepare update data
        const updateData: any = {};
        let needsUpdate = false;

        // 1. Sync Trial End
        if (tenant.trial_ends_at) {
            if (!subscription?.trial_end || subscription.trial_end.getTime() !== tenant.trial_ends_at.getTime()) {
                updateData.trial_end = tenant.trial_ends_at;
                needsUpdate = true;
                console.log(`[${tenant.slug}] Syncing trial_end: ${tenant.trial_ends_at.toISOString()}`);
            }
        }

        // 2. Sync Status
        if (tenant.status && (!subscription || subscription.status !== tenant.status)) {
            // Map legacy status if needed, or direct copy
            updateData.status = tenant.status;
            needsUpdate = true;
            console.log(`[${tenant.slug}] Syncing status: ${tenant.status}`);
        }

        // 3. Sync Suspension Details (Reason)
        if (tenant.suspension_reason && (!subscription?.suspension_reason || subscription.suspension_reason !== tenant.suspension_reason)) {
            updateData.suspension_reason = tenant.suspension_reason;
            needsUpdate = true;
            console.log(`[${tenant.slug}] Syncing suspension_reason`);
        }

        // 4. Sync Suspension Date (Reason)
        if (tenant.suspended_at && (!subscription?.suspension_date || subscription.suspension_date.getTime() !== tenant.suspended_at.getTime())) {
            updateData.suspension_date = tenant.suspended_at;
            needsUpdate = true;
            console.log(`[${tenant.slug}] Syncing suspension_reason`);
        }

        if (needsUpdate) {
            if (subscription) {
                await prisma.tenantSubscription.update({
                    where: { id: subscription.id },
                    data: updateData
                });
            } else {
                // Create if missing (edge case)
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
