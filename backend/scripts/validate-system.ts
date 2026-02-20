
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting System Integrity Validation...\n');

    // =========================================================================
    // 1. TENANT CHECK
    // =========================================================================
    console.log('🏢 [1/5] Checking Tenants...');
    const tenants = await prisma.tenant.findMany({
        include: {
            dadosRestaurante: true,
            tenantSubscription: true // Correct relation name
        }
    });

    if (tenants.length === 0) {
        console.error('❌ No tenants found! System is empty.');
    } else {
        for (const tenant of tenants) {
            console.log(`   - Tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})`);

            if (!tenant.dadosRestaurante) {
                console.error(`     ❌ MISSING: DadosRestaurante (Settings)`);
            } else {
                console.log(`     ✅ DadosRestaurante: Present`);
            }

            const activeSub = tenant.tenantSubscription;
            if (!activeSub || (activeSub.status !== 'active' && activeSub.status !== 'trialing')) {
                console.warn(`     ⚠️ WARNING: No active/trialing subscription found.`);
            } else {
                console.log(`     ✅ Subscription: ${activeSub.status.toUpperCase()} (Plan: ${activeSub.plan_id})`);
            }
        }
    }
    console.log('');

    // =========================================================================
    // 2. USER CHECK
    // =========================================================================
    console.log('👤 [2/5] Checking Users...');
    const users = await prisma.user.findMany({
        include: {
            tenants: {
                include: {
                    tenant: true
                }
            }
        }
    });

    if (users.length === 0) {
        console.error('❌ No users found!');
    } else {
        for (const user of users) {
            console.log(`   - User: ${user.email} (ID: ${user.id})`);
            if (user.tenants.length === 0) {
                console.warn(`     ⚠️ WARNING: User is not linked to any tenant.`);
            } else {
                for (const ut of user.tenants) {
                    console.log(`     ✅ Linked to: ${ut.tenant.nome_restaurante} as '${ut.role}'`);
                }
            }
        }
    }
    console.log('');

    // =========================================================================
    // 3. NAVIGATION CHECK
    // =========================================================================
    console.log('🧭 [3/5] Checking Navigation Menu...');
    const navItems = await prisma.navigationMenuItem.findMany({
        orderBy: { sort_order: 'asc' },
        include: {
            permissions: true
        }
    });

    if (navItems.length === 0) {
        console.error('❌ No navigation items found! Run `npx ts-node scripts/seed-navigation.ts`');
    } else {
        console.log(`   Found ${navItems.length} menu items.`);
        const expectedKeys = [
            'dashboard', 'alerts', 'sales', 'sales-import', 'menu-engineering',
            'products', 'recipes', 'combos', 'formats', 'menu', 'calculator',
            'purchases', 'invoices', 'inventory', 'consumos',
            'restaurant-data', 'subscription', 'users'
        ];

        for (const key of expectedKeys) {
            const item = navItems.find(i => i.key === key);
            if (!item) {
                console.error(`     ❌ MISSING Item: ${key}`);
            } else {
                const roles = item.permissions.map(p => p.role).join(', ');
                console.log(`     ✅ ${item.name} (${item.href}): Roles [${roles}]`);
            }
        }
    }
    console.log('');

    // =========================================================================
    // 4. RBAC / INTERNAL PERMISSIONS CHECK
    // =========================================================================
    console.log('🛡️ [4/5] Checking Internal RBAC (Backoffice Admin Portal)...');
    // Check if InternalRoles exist (Admin Portal)
    try {
        const internalRoles = await prisma.internalRole.findMany({
            include: { permissions: { include: { permission: true } } }
        });

        if (internalRoles.length === 0) {
            console.warn('   ⚠️ No Internal Roles found (Admin Portal might not be seeded).');
        } else {
            console.log(`   Found ${internalRoles.length} internal roles.`);
            for (const role of internalRoles) {
                console.log(`     - Role: ${role.name}`);
            }
        }
    } catch (e) {
        console.warn('   ⚠️ Could not check InternalRoles (table might not exist yet).');
    }
    console.log('');

    // =========================================================================
    // 5. STAGING DATA CHECK (Products/Recipes)
    // =========================================================================
    console.log('📦 [5/5] Checking Staging Data...');
    const productCount = await prisma.produto.count();
    const recipeCount = await prisma.receita.count();
    const menuItemCount = await prisma.menuItem.count();
    const salesCount = await prisma.venda.count();

    console.log(`   - Products:   ${productCount}`);
    console.log(`   - Recipes:    ${recipeCount}`);
    console.log(`   - Menu Items: ${menuItemCount}`);
    console.log(`   - Sales:      ${salesCount}`);

    if (productCount === 0 || recipeCount === 0) {
        console.warn('\n⚠️ WARNING: Products or Recipes are empty. Did you run `npm run seed:staging`?');
    } else {
        console.log('\n✅ Staging data appears to be populated.');
    }

    console.log('\n🏁 Validation Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
