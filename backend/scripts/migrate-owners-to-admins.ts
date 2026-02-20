
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting migration: Owner -> Admin');

    // Find all UserTenants with role 'owner'
    const owners = await prisma.userTenant.findMany({
        where: { role: 'owner' }
    });

    console.log(`Found ${owners.length} users with 'owner' role.`);

    if (owners.length === 0) {
        console.log('Nothing to migrate.');
        return;
    }

    // Update them to 'admin'
    const result = await prisma.userTenant.updateMany({
        where: { role: 'owner' },
        data: { role: 'admin' }
    });

    console.log(`✅ Successfully updated ${result.count} records to 'admin'.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
