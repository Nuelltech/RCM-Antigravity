
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Inspecting Navigation Menu Items...\n');

    const items = await prisma.navigationMenuItem.findMany({
        orderBy: { sort_order: 'asc' },
        include: { permissions: true }
    });

    console.log(`Found ${items.length} items:\n`);

    items.forEach(item => {
        const roles = item.permissions.map(p => p.role).join(', ');
        console.log(`- [${item.id}] ${item.name} (Key: ${item.key})`);
        console.log(`  Href: ${item.href}`);
        console.log(`  Roles: [${roles}]`);
        console.log(`  Active: ${item.active}`);
        console.log('---');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
