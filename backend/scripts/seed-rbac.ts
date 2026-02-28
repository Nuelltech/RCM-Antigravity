
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = {
    ADMIN: 'ADMIN',
    SALES_SUPPORT: 'SALES_SUPPORT',
    SALES: 'SALES'
};

const PERMISSIONS = [
    // Users
    { slug: 'users.list', module: 'users', description: 'List internal users' },
    { slug: 'users.manage', module: 'users', description: 'Create, update, delete users' },

    // Tenants
    { slug: 'tenants.list', module: 'tenants', description: 'List all tenants' },
    { slug: 'tenants.view', module: 'tenants', description: 'View tenant details' },
    { slug: 'tenants.manage', module: 'tenants', description: 'Manage tenants (suspend, etc)' },

    // Billing
    { slug: 'billing.view', module: 'billing', description: 'View billing info' },
    { slug: 'billing.manage', module: 'billing', description: 'Manage subscriptions' },

    // Leads
    { slug: 'leads.list', module: 'leads', description: 'List leads' },
    { slug: 'leads.manage', module: 'leads', description: 'Manage leads' },

    // System
    { slug: 'system.metrics', module: 'system', description: 'View system metrics' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
    [ROLES.ADMIN]: ['*'], // * means all
    [ROLES.SALES_SUPPORT]: [
        'tenants.list', 'tenants.view', 'tenants.manage',
        'billing.view', 'billing.manage',
        'system.metrics'
    ],
    [ROLES.SALES]: [
        'leads.list', 'leads.manage'
    ]
};

async function main() {
    console.log('🌱 Starting RBAC Seeding...');

    // 1. Create Permissions
    console.log('1. Creating Permissions...');
    const permissionMap = new Map<string, number>();

    for (const p of PERMISSIONS) {
        const perm = await prisma.internalPermission.upsert({
            where: { slug: p.slug },
            update: { description: p.description, module: p.module },
            create: p
        });
        permissionMap.set(p.slug, perm.id);
    }
    console.log(`   - Synced ${PERMISSIONS.length} permissions`);

    // 2. Create Roles & Assign Permissions
    console.log('2. Creating Roles & Assigning Permissions...');
    for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
        // Create Role
        const role = await prisma.internalRole.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName, description: `Role for ${roleName}` }
        });

        // Calculate permission IDs
        let permIds: number[] = [];
        if (perms.includes('*')) {
            permIds = Array.from(permissionMap.values());
        } else {
            permIds = perms.map(slug => permissionMap.get(slug)).filter(Boolean) as number[];
        }

        // Assign (Clear existing and re-add to ensure sync)
        await prisma.internalRolePermission.deleteMany({ where: { role_id: role.id } });

        if (permIds.length > 0) {
            await prisma.internalRolePermission.createMany({
                data: permIds.map(pid => ({
                    role_id: role.id,
                    permission_id: pid
                }))
            });
        }
        console.log(`   - Role ${roleName}: Assigned ${permIds.length} permissions`);
    }

    // 3. Migrate Existing Users
    console.log('3. Migrating Existing Users...');
    const users = await prisma.internalUser.findMany({
        where: { internal_role_id: null } // Only those needing migration
    });

    for (const user of users) {
        if (user.role) {
            // Find role by name (string role from old column)
            // Handle case mismatch just in case
            const roleName = user.role.toUpperCase();
            const role = await prisma.internalRole.findUnique({ where: { name: roleName } });

            if (role) {
                await prisma.internalUser.update({
                    where: { id: user.id },
                    data: { internal_role_id: role.id }
                });
                console.log(`   - Migrated user ${user.email} to Role ID ${role.id} (${roleName})`);
            } else {
                console.warn(`   - WARNING: Could not find DB role for string role "${user.role}" (User: ${user.email})`);
            }
        }
    }

    console.log('✅ RBAC Seeding & Migration Completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
