
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for user owner@demo.com...');
    const user = await prisma.user.findUnique({
        where: { email: 'owner@demo.com' },
        include: {
            tenants: {
                include: {
                    tenant: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found!');
        const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
        console.log('Available users:', allUsers);
        return;
    }

    console.log(`Found user: ${user.nome} (ID: ${user.id})`);

    const userTenant = user.tenants[0];
    if (!userTenant) {
        console.log('User has no tenants linked!');
        return;
    }

    console.log(`Tenant: ${userTenant.tenant.nome_restaurante} (ID: ${userTenant.tenant_id})`);

    const tenantId = userTenant.tenant_id;

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
