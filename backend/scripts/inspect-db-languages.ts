
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Database Languages ---');

    // 1. NavigationPermission Roles
    const navPermissions = await prisma.navigationPermission.groupBy({
        by: ['role'],
        _count: {
            role: true,
        },
    });
    console.log('\n1. NavigationPermission Roles distribution:');
    console.table(navPermissions);

    // 2. UserTenant Roles
    const userTenantRoles = await prisma.userTenant.groupBy({
        by: ['role'],
        _count: {
            role: true,
        },
    });
    console.log('\n2. UserTenant Roles distribution:');
    console.table(userTenantRoles);


    // 4. NavigationMenuItem Keys & Names sample
    const menuItems = await prisma.navigationMenuItem.findMany({
        select: {
            key: true,
            name: true
        }
    });
    console.log('\n4. NavigationMenuItem (Key vs Name) sample:');
    console.table(menuItems); // Show all to spot mix
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
