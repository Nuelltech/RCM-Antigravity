import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const families = [
    { codigo: 'CAR', nome: 'Carnes' },
    { codigo: 'PEI', nome: 'Peixes e Mariscos' },
    { codigo: 'LEG', nome: 'Legumes e Verduras' },
    { codigo: 'FRU', nome: 'Frutas' },
    { codigo: 'MER', nome: 'Mercearia Seca' },
    { codigo: 'TEM', nome: 'Temperos e Condimentos' },
    { codigo: 'LAT', nome: 'Laticínios e Ovos' },
    { codigo: 'OLE', nome: 'Óleos e Gorduras' },
    { codigo: 'ENL', nome: 'Enlatados e Conservas' },
    { codigo: 'PAD', nome: 'Padaria e Pastelaria' },
    { codigo: 'PRE', nome: 'Pré-preparados de Cozinha' },
];

async function main() {
    console.log('Start seeding families...');

    // Get the first tenant (demo tenant)
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error('No tenant found. Please run the main seed script first.');
        return;
    }

    console.log(`Seeding families for tenant: ${tenant.nome_restaurante} (${tenant.id})`);

    for (const family of families) {
        const exists = await prisma.familia.findFirst({
            where: {
                tenant_id: tenant.id,
                nome: family.nome,
            },
        });

        if (!exists) {
            await prisma.familia.create({
                data: {
                    tenant_id: tenant.id,
                    nome: family.nome,
                    codigo: family.codigo,
                },
            });
            console.log(`Created family: ${family.nome} (${family.codigo})`);
        } else {
            // Update code if missing
            if (!exists.codigo) {
                await prisma.familia.update({
                    where: { id: exists.id },
                    data: { codigo: family.codigo },
                });
                console.log(`Updated family code: ${family.nome} -> ${family.codigo}`);
            } else {
                console.log(`Family already exists: ${family.nome}`);
            }
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
