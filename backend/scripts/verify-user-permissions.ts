import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mirror of frontend/src/lib/permissions.ts
const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    GESTOR: 'gestor',
    OPERADOR: 'operador',
};

const PERMISSIONS = {
    // Menu Views
    DASHBOARD_STATS: [ROLES.OWNER, ROLES.ADMIN, ROLES.GESTOR],
    RECIPES_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    SALES_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.GESTOR],
    INVENTORY_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    SETTINGS_VIEW: [ROLES.OWNER, ROLES.ADMIN],
};

async function main() {
    const email = 'owner@demo.com';
    console.log(`🔍 Verifying permissions for: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            tenants: true
        }
    });

    if (!user) {
        console.error('❌ User not found!');
        return;
    }

    console.log(`✅ User found: ${user.nome} (${user.uuid})`);

    if (user.tenants.length === 0) {
        console.error('❌ User has no tenant associations!');
        return;
    }

    const tenantUser = user.tenants[0];
    const role = tenantUser.role; // This comes from the DB

    console.log(`👤 Assigned Role in DB: "${role}"`);

    // Check against defined roles
    const isValidRole = Object.values(ROLES).includes(role);
    if (!isValidRole) {
        console.warn(`⚠️  WARNING: Role "${role}" is NOT in the known ROLES list!`);
        console.warn(`   Known Roles: ${Object.values(ROLES).join(', ')}`);
        console.warn(`   This implies the frontend will NOT recognize this user.`);
    } else {
        console.log(`✅ Role "${role}" is valid.`);
    }

    console.log('\n🔐 Permission Check (Simulation):');
    console.log('--------------------------------');

    let hasAccessToSomething = false;

    for (const [perm, allowedRoles] of Object.entries(PERMISSIONS)) {
        const hasAccess = allowedRoles.includes(role);
        const status = hasAccess ? '✅ ALLOWED' : '❌ DENIED';
        console.log(`${status.padEnd(10)} ${perm}`);
        if (hasAccess) hasAccessToSomething = true;
    }

    console.log('--------------------------------');
    if (hasAccessToSomething) {
        console.log('🎉 VERDICT: User HAS access to the application.');
    } else {
        console.error('🚫 VERDICT: User has NO ACCESS to any major module.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
