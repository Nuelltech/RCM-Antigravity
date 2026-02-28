/**
 * Migrate existing tenants to subscription system
 * 
 * Maps old 'plano' field to new subscription plans:
 * - trial → base (with trial period)
 * - basico → base
 * - profissional → standard
 * - enterprise → plus
 * 
 * Usage:
 *   tsx scripts/migrate-existing-tenants.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  🔄 Migrating Tenants to Subscription System        ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // 1. Get all tenants
    const tenants = await prisma.tenant.findMany({
        select: {
            id: true,
            nome_restaurante: true,
            plano: true,
            data_expiracao_plano: true,
            tenantSubscription: true  // Check if already has subscription
        }
    });

    console.log(`📊 Found ${tenants.length} tenants\n`);

    // 2. Get available plans
    const basePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'base' } });
    const standardPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'standard' } });
    const plusPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'plus' } });

    if (!basePlan || !standardPlan || !plusPlan) {
        console.error('❌ Subscription plans not found! Run seed-subscription-plans.ts first.');
        process.exit(1);
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const tenant of tenants) {
        try {
            if (tenant.tenantSubscription) {
                console.log(`⏭️  ${tenant.nome_restaurante} - Already has subscription (${tenant.tenantSubscription.status})`);
                skipped++;
                continue;
            }

            // Map old plan to new plan
            let targetPlan = basePlan;
            let planReason = 'default';

            if (tenant.plano) {
                const oldPlan = tenant.plano.toLowerCase();
                if (oldPlan.includes('trial')) {
                    targetPlan = basePlan;
                    planReason = 'trial → base';
                } else if (oldPlan.includes('basico') || oldPlan.includes('basic')) {
                    targetPlan = basePlan;
                    planReason = 'basico → base';
                } else if (oldPlan.includes('profissional') || oldPlan.includes('professional') || oldPlan.includes('standard')) {
                    targetPlan = standardPlan;
                    planReason = 'profissional → standard';
                } else if (oldPlan.includes('enterprise') || oldPlan.includes('plus') || oldPlan.includes('premium')) {
                    targetPlan = plusPlan;
                    planReason = 'enterprise → plus';
                }
            }

            // Check if in trial period
            const now = new Date();
            const isInTrial = tenant.data_expiracao_plano && tenant.data_expiracao_plano > now;

            let subscriptionData: any = {
                tenant_id: tenant.id,
                plan_id: targetPlan.id,
                status: 'active'
            };

            // Set trial data if applicable
            if (isInTrial && tenant.data_expiracao_plano) {
                subscriptionData.status = 'trial';
                subscriptionData.trial_start = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 14 days ago
                subscriptionData.trial_end = tenant.data_expiracao_plano;
            }

            // Create subscription
            await prisma.tenantSubscription.create({
                data: subscriptionData
            });

            const statusIcon = isInTrial ? '🆓' : '✅';
            const statusText = isInTrial ? 'trial' : 'active';
            console.log(`${statusIcon} ${tenant.nome_restaurante} - Created ${statusText} subscription (${planReason})`);
            migrated++;

        } catch (error: any) {
            console.error(`❌ ${tenant.nome_restaurante} - Error: ${error.message}`);
            errors++;
        }
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  📊 Migration Summary                                ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`✅ Migrated:  ${migrated}`);
    console.log(`⏭️  Skipped:   ${skipped} (already had subscription)`);
    console.log(`❌ Errors:    ${errors}`);
    console.log(`📊 Total:     ${tenants.length}\n`);

    if (migrated > 0) {
        console.log('🎉 Migration completed successfully!\n');
        console.log('Next steps:');
        console.log('  1. Run test script again: npx tsx scripts/test-subscriptions.ts');
        console.log('  2. Verify tenants now have features access');
        console.log('  3. Test subscription guards on protected routes\n');
    }
}

main()
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
