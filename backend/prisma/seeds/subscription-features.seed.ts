import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding feature catalog and subscription features...');

    // 1. Create features in catalog
    const features = [
        { feature_key: 'dashboard', feature_name: 'Dashboard', description: 'View dashboard stats and charts', feature_category: 'core' },
        { feature_key: 'sales', feature_name: 'Sales Management', description: 'Manage sales and imports', feature_category: 'core' },
        { feature_key: 'products_recipes', feature_name: 'Products & Recipes', description: 'Manage products, recipes, combos, and menu', feature_category: 'core' },
        { feature_key: 'invoices', feature_name: 'Invoice Management', description: 'Import and manage supplier invoices', feature_category: 'core' },
        { feature_key: 'inventory', feature_name: 'Inventory Management', description: 'Manage inventory and consumptions', feature_category: 'core' },
    ];

    console.log('📦 Creating features in catalog...');

    const createdFeatures = [];
    for (const feat of features) {
        const existing = await prisma.featureCatalog.findUnique({
            where: { feature_key: feat.feature_key }
        });

        if (existing) {
            console.log(`   ✓ Feature "${feat.feature_key}" already exists (ID: ${existing.id})`);
            createdFeatures.push(existing);
        } else {
            const created = await prisma.featureCatalog.create({
                data: feat
            });
            console.log(`   ✅ Created feature "${feat.feature_key}" (ID: ${created.id})`);
            createdFeatures.push(created);
        }
    }

    // 2. Get subscription plans
    const basePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'base' } });
    const standardPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'standard' } });
    const plusPlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'plus' } });

    if (!basePlan || !standardPlan || !plusPlan) {
        throw new Error('❌ Subscription plans not found! Run subscription plans seed first.');
    }

    console.log('\n🔗 Associating features to plans...');

    // Base Plan: Dashboard + Products/Recipes only
    const basePlanFeatures = createdFeatures.filter(f =>
        ['dashboard', 'products_recipes'].includes(f.feature_key)
    );

    for (const feat of basePlanFeatures) {
        const existing = await prisma.subscriptionFeature.findUnique({
            where: {
                plan_id_feature_id: {
                    plan_id: basePlan.id,
                    feature_id: feat.id
                }
            }
        });

        if (!existing) {
            await prisma.subscriptionFeature.create({
                data: {
                    plan_id: basePlan.id,
                    feature_id: feat.id,
                    included_by_default: true
                }
            });
            console.log(`   ✅ Base Plan ← ${feat.feature_key}`);
        } else {
            console.log(`   ✓ Base Plan already has ${feat.feature_key}`);
        }
    }

    // Standard Plan: All base + Sales + Invoices
    const standardPlanFeatures = createdFeatures.filter(f =>
        ['dashboard', 'products_recipes', 'sales', 'invoices'].includes(f.feature_key)
    );

    for (const feat of standardPlanFeatures) {
        const existing = await prisma.subscriptionFeature.findUnique({
            where: {
                plan_id_feature_id: {
                    plan_id: standardPlan.id,
                    feature_id: feat.id
                }
            }
        });

        if (!existing) {
            await prisma.subscriptionFeature.create({
                data: {
                    plan_id: standardPlan.id,
                    feature_id: feat.id,
                    included_by_default: true
                }
            });
            console.log(`   ✅ Standard Plan ← ${feat.feature_key}`);
        } else {
            console.log(`   ✓ Standard Plan already has ${feat.feature_key}`);
        }
    }

    // Plus Plan: ALL features
    for (const feat of createdFeatures) {
        const existing = await prisma.subscriptionFeature.findUnique({
            where: {
                plan_id_feature_id: {
                    plan_id: plusPlan.id,
                    feature_id: feat.id
                }
            }
        });

        if (!existing) {
            await prisma.subscriptionFeature.create({
                data: {
                    plan_id: plusPlan.id,
                    feature_id: feat.id,
                    included_by_default: true
                }
            });
            console.log(`   ✅ Plus Plan ← ${feat.feature_key}`);
        } else {
            console.log(`   ✓ Plus Plan already has ${feat.feature_key}`);
        }
    }

    console.log('\n✅ Feature catalog and plan associations seeded successfully!');

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - Base Plan: ${basePlanFeatures.length} features`);
    console.log(`   - Standard Plan: ${standardPlanFeatures.length} features`);
    console.log(`   - Plus Plan: ${createdFeatures.length} features`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
