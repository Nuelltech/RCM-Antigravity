
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for user owner@demo.com...');
    const user = await prisma.utilizador.findFirst({
        where: { email: 'owner@demo.com' },
        include: {
            tenant: true
        }
    });

    if (!user) {
        console.log('User not found!');
        const allUsers = await prisma.utilizador.findMany({ select: { id: true, email: true, tenant_id: true } });
        console.log('Available users:', allUsers);
        return;
    }

    console.log(`Found user: ${user.nome} (ID: ${user.id})`);
    console.log(`Tenant: ${user.tenant.nome} (ID: ${user.tenant_id})`);

    const tenantId = user.tenant_id;

    console.log(`\nFetching 'Arroz' for Tenant ${tenantId}...`);
    const products = await prisma.produto.findMany({
        where: {
            tenant_id: tenantId,
            nome: { contains: 'Arroz' }
        },
        include: {
            variacoes: {
                where: {
                    ativo: true
                },
                include: {
                    template: true
                }
            }
        }
    });

    console.log(JSON.stringify(products, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
