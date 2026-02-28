
import { prisma } from '../src/core/database';

async function main() {
    console.log('Checking Menu Data...');

    // Check all tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
        console.log(`\nTenant: ${tenant.nome_restaurante} (ID: ${tenant.id})`);

        const menuCount = await prisma.menuItem.count({
            where: { tenant_id: tenant.id }
        });
        console.log(`- Menu Items: ${menuCount}`);

        if (menuCount > 0) {
            const firstItem = await prisma.menuItem.findFirst({
                where: { tenant_id: tenant.id },
                select: { id: true, nome_comercial: true, ativo: true }
            });
            console.log(`- Sample Item: ${JSON.stringify(firstItem)}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
