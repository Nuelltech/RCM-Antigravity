import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed subscription plans and features
 * 
 * This creates:
 * - Feature catalog (all available features)
 * - Subscription plans (Base, Standard, Plus)
 * - Plan-feature associations
 */
async function main() {
    console.log('🌱 Seeding subscription system...\n');

    // -----------------------------------------------------------------------------
    // 1. Create Feature Catalog
    // -----------------------------------------------------------------------------
    console.log('📋 Creating feature catalog...');

    const features = await Promise.all([
        // Core features
        prisma.featureCatalog.upsert({
            where: { feature_key: 'invoices' },
            update: {},
            create: {
                feature_key: 'invoices',
                feature_name: 'Invoice Management',
                feature_category: 'core',
                description: 'Upload, process, and manage supplier invoices with AI-powered matching',
                icon: 'FileText',
                sort_order: 1,
                version: '1.0'
            }
        }),

        prisma.featureCatalog.upsert({
            where: { feature_key: 'sales' },
            update: {},
            create: {
                feature_key: 'sales',
                feature_name: 'Sales Tracking',
                feature_category: 'core',
                description: 'Import and analyze sales data, match menu items, track revenue',
                icon: 'TrendingUp',
                sort_order: 2,
                version: '1.0'
            }
        }),

        prisma.featureCatalog.upsert({
            where: { feature_key: 'inventory' },
            update: {},
            create: {
                feature_key: 'inventory',
                feature_name: 'Inventory Management',
                feature_category: 'advanced',
                description: 'Session-based inventory counting and theoretical stock tracking',
                icon: 'Package',
                sort_order: 3,
                version: '1.0'
            }
        }),

        // Dashboard & Reports (included in all plans)
        prisma.featureCatalog.upsert({
            where: { feature_key: 'dashboard' },
            update: {},
            create: {
                feature_key: 'dashboard',
                feature_name: 'Dashboard & Analytics',
                feature_category: 'core',
                description: 'Real-time metrics, cost tracking, and performance insights',
                icon: 'BarChart3',
                sort_order: 0,
                version: '1.0'
            }
        }),

        prisma.featureCatalog.upsert({
            where: { feature_key: 'products_recipes' },
            update: {},
            create: {
                feature_key: 'products_recipes',
                feature_name: 'Products & Recipes',
                feature_category: 'core',
                description: 'Manage products, variations, recipes, and menu items',
                icon: 'ChefHat',
                sort_order: 4,
                version: '1.0'
            }
        }),

        // Future add-on features (examples)
        prisma.featureCatalog.upsert({
            where: { feature_key: 'stocks' },
            update: {},
            create: {
                feature_key: 'stocks',
                feature_name: 'Stock Management',
                feature_category: 'addon',
                description: 'Advanced stock tracking with alerts and forecasting',
                icon: 'Warehouse',
                sort_order: 10,
                version: '1.0',
                active: false // Not available yet
            }
        }),

        prisma.featureCatalog.upsert({
            where: { feature_key: 'ai_forecasting' },
            update: {},
            create: {
                feature_key: 'ai_forecasting',
                feature_name: 'AI Forecasting',
                feature_category: 'addon',
                description: 'AI-powered demand forecasting and cost predictions',
                icon: 'BrainCircuit',
                sort_order: 11,
                version: '1.0',
                active: false // Not available yet
            }
        })
    ]);

    console.log(`✅ Created ${features.length} features\n`);

    // -----------------------------------------------------------------------------
    // 2. Create Subscription Plans
    // -----------------------------------------------------------------------------
    console.log('💳 Creating subscription plans...');

    // Base Plan - Invoices only
    const basePlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'base' },
        update: {},
        create: {
            name: 'base',
            display_name: 'Base Plan',
            description: 'Essential cost management with invoice processing',
            price_monthly: 49.00,
            price_yearly: 490.00, // 2 months free
            max_users: 3,
            max_storage_mb: 500,
            max_invoices_monthly: 50,
            max_sales_monthly: null,
            sort_order: 1,
            active: true
        }
    });

    // Standard Plan - Invoices + Sales
    const standardPlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'standard' },
        update: {},
        create: {
            name: 'standard',
            display_name: 'Standard Plan',
            description: 'Complete cost and revenue tracking',
            price_monthly: 99.00,
            price_yearly: 990.00,
            max_users: 5,
            max_storage_mb: 1000,
            max_invoices_monthly: 100,
            max_sales_monthly: 200,
            sort_order: 2,
            active: true
        }
    });

    // Plus Plan - Everything
    const plusPlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'plus' },
        update: {},
        create: {
            name: 'plus',
            display_name: 'Plus Plan',
            description: 'Full restaurant management suite with inventory',
            price_monthly: 149.00,
            price_yearly: 1490.00,
            max_users: 10,
            max_storage_mb: 2000,
            max_invoices_monthly: 200,
            max_sales_monthly: 500,
            sort_order: 3,
            active: true
        }
    });

    console.log(`✅ Created 3 subscription plans\n`);

    // -----------------------------------------------------------------------------
    // 3. Associate Features with Plans
    // -----------------------------------------------------------------------------
    console.log('🔗 Associating features with plans...');

    // Get feature IDs
    const dashboardFeature = features.find(f => f.feature_key === 'dashboard')!;
    const productsFeature = features.find(f => f.feature_key === 'products_recipes')!;
    const invoicesFeature = features.find(f => f.feature_key === 'invoices')!;
    const salesFeature = features.find(f => f.feature_key === 'sales')!;
    const inventoryFeature = features.find(f => f.feature_key === 'inventory')!;

    // Base Plan Features
    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: basePlan.id, feature_id: dashboardFeature.id } },
        update: {},
        create: { plan_id: basePlan.id, feature_id: dashboardFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: basePlan.id, feature_id: productsFeature.id } },
        update: {},
        create: { plan_id: basePlan.id, feature_id: productsFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: basePlan.id, feature_id: invoicesFeature.id } },
        update: {},
        create: { plan_id: basePlan.id, feature_id: invoicesFeature.id }
    });

    // Standard Plan Features (inherits from Base + adds Sales)
    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: standardPlan.id, feature_id: dashboardFeature.id } },
        update: {},
        create: { plan_id: standardPlan.id, feature_id: dashboardFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: standardPlan.id, feature_id: productsFeature.id } },
        update: {},
        create: { plan_id: standardPlan.id, feature_id: productsFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: standardPlan.id, feature_id: invoicesFeature.id } },
        update: {},
        create: { plan_id: standardPlan.id, feature_id: invoicesFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: standardPlan.id, feature_id: salesFeature.id } },
        update: {},
        create: { plan_id: standardPlan.id, feature_id: salesFeature.id }
    });

    // Plus Plan Features (everything)
    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: plusPlan.id, feature_id: dashboardFeature.id } },
        update: {},
        create: { plan_id: plusPlan.id, feature_id: dashboardFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: plusPlan.id, feature_id: productsFeature.id } },
        update: {},
        create: { plan_id: plusPlan.id, feature_id: productsFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: plusPlan.id, feature_id: invoicesFeature.id } },
        update: {},
        create: { plan_id: plusPlan.id, feature_id: invoicesFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: plusPlan.id, feature_id: salesFeature.id } },
        update: {},
        create: { plan_id: plusPlan.id, feature_id: salesFeature.id }
    });

    await prisma.subscriptionFeature.upsert({
        where: { plan_id_feature_id: { plan_id: plusPlan.id, feature_id: inventoryFeature.id } },
        update: {},
        create: { plan_id: plusPlan.id, feature_id: inventoryFeature.id }
    });

    console.log('✅ Associated features with plans\n');

    // -----------------------------------------------------------------------------
    // 4. Display Summary
    // -----------------------------------------------------------------------------
    console.log('\n📊 Subscription System Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const plans = await prisma.subscriptionPlan.findMany({
        include: {
            features: {
                include: {
                    feature: true
                }
            }
        },
        orderBy: { sort_order: 'asc' }
    });

    for (const plan of plans) {
        console.log(`\n${plan.display_name} - €${plan.price_monthly}/mês`);
        console.log(`  Features: ${plan.features.length}`);
        plan.features.forEach(pf => {
            console.log(`    ✓ ${pf.feature.feature_name}`);
        });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Subscription system seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding subscription system:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
