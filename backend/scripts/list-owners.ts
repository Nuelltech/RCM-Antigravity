
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all owners...');

    // Find all UserTenant records with role 'owner'
    const owners = await prisma.userTenant.findMany({
        where: {
            role: 'owner',
            ativo: true
        },
        include: {
            user: true,
            tenant: true
        }
    });

    console.log(`Found ${owners.length} owners:\n`);

    console.table(owners.map(o => ({
        User: o.user.nome,
        Email: o.user.email,
        Restaurant: o.tenant.nome_restaurante,
        TenantID: o.tenant_id,
        Joined: o.createdAt.toISOString().split('T')[0]
    })));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
