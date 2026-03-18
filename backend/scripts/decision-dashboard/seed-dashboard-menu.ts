// scripts/decision-dashboard/seed-dashboard-menu.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Seeding Decision Dashboard navigation...');

  try {
    // 1. Ensure the Dashboard Feature exists 
    // Usually 'dashboard' feature is base, we could create 'decision_dashboard' if it is a Pro feature
    // Let's assume it requires the base 'dashboard' feature for now, or create it.
    let feature = await prisma.featureCatalog.findUnique({
      where: { feature_key: 'decision_dashboard' }
    });

    if (!feature) {
      feature = await prisma.featureCatalog.create({
        data: {
          feature_key: 'decision_dashboard',
          feature_name: 'Dashboard de Decisões',
          description: 'Ecrã rápido de ações e hemorragia financeira',
          feature_category: 'Analytics',
          version: '1.0'
        }
      });
      console.log('✅ Created new feature: decision_dashboard');
    }

    // 2. Add to Navigation Menu
    
    let decisionRoute = await prisma.navigationMenuItem.findFirst({
        where: { href: '/dashboard/decisoes' }
    });

    if (!decisionRoute) {
        decisionRoute = await prisma.navigationMenuItem.create({
            data: {
                key: 'decisoes',
                name: 'Decisões',
                href: '/dashboard/decisoes',
                icon: 'Target', 
                sort_order: 5,
                required_feature: 'decision_dashboard',
                group: 'analytics',
                active: true
            }
        });
        console.log('✅ Created navigation menu item: /dashboard/decisoes');
    } else {
        console.log('ℹ️ Navigation menu item /dashboard/decisoes already exists');
    }

    // 3. Add Permissions
    // Typically Owner, Admin, Manager have access to Dashboard
    const rolesWithAccess = ['admin', 'manager', 'owner'];
    
    for (const role of rolesWithAccess) {
        const existingPerm = await prisma.navigationPermission.findUnique({
            where: {
                navigation_menu_item_id_role: {
                    navigation_menu_item_id: decisionRoute.id,
                    role: role
                }
            }
        });

        if (!existingPerm) {
            await prisma.navigationPermission.create({
                data: {
                    navigation_menu_item_id: decisionRoute.id,
                    role: role
                }
            });
            console.log(`✅ Granted access to role: ${role}`);
        }
    }

    // 4. Link Feature to Subscription Plan (Pro / Enterprise)
    // The user didn't specify the exact plan yet, but let's make sure it's linked to the highest tier at least
    const plans = await prisma.subscriptionPlan.findMany({
        where: { active: true }
    });
    
    for(const plan of plans) {
        // Let's add it to 'PRO' or 'ENTERPRISE' tier. 
        // For staging testing, let's just add to all active plans so the user can test
        const existingLink = await prisma.subscriptionFeature.findUnique({
            where: {
                plan_id_feature_id: {
                    plan_id: plan.id,
                    feature_id: feature.id
                }
            }
        });
        
        if (!existingLink) {
             await prisma.subscriptionFeature.create({
                data: {
                    plan_id: plan.id,
                    feature_id: feature.id,
                    included_by_default: true
                }
            });
            console.log(`✅ Granted feature to Plan: ${plan.name}`);
        }
    }

    console.log('🎉 Seed complete!');
  } catch (error) {
    console.error('❌ Error seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
