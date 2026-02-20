import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany();
    console.log('--- Tenants ---');
    tenants.forEach(t => {
        console.log(`${t.id}: ${t.nome_restaurante} (${t.slug}) - Active: ${t.ativo}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
