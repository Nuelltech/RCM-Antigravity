import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🍺 Seeding beverage subfamilies...');

    // Get tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error('No tenant found. Run seed.ts first.');
    }

    // Get or create BEB (Bebidas) family
    let familiaBebidas = await prisma.familia.findFirst({
        where: {
            tenant_id: tenant.id,
            codigo: 'BEB',
        },
    });

    if (!familiaBebidas) {
        familiaBebidas = await prisma.familia.create({
            data: {
                tenant_id: tenant.id,
                codigo: 'BEB',
                nome: 'Bebidas',
            },
        });
        console.log('✅ Created BEB family');
    }

    // Subfamilies data
    const subfamilias = [
        { codigo: 'REF', nome: 'Refrigerantes' },
        { codigo: 'AGU', nome: 'Águas' },
        { codigo: 'SUM', nome: 'Sumos e Néctares' },
        { codigo: 'CEV', nome: 'Cervejas' },
        { codigo: 'VINT', nome: 'Vinhos Tintos' },
        { codigo: 'VINB', nome: 'Vinhos Brancos' },
        { codigo: 'VINR', nome: 'Vinhos Rosés' },
        { codigo: 'VINE', nome: 'Vinhos Espumantes' },
        { codigo: 'VINV', nome: 'Vinhos Verdes' },
        { codigo: 'VINP', nome: 'Vinhos do Porto e Fortificados' },
        { codigo: 'ESP', nome: 'Espirituosas' },
        { codigo: 'LIC', nome: 'Licores e Digestivos' },
        { codigo: 'CAF', nome: 'Café, Chá e Infusões' },
        { codigo: 'OUT', nome: 'Outras Bebidas' },
    ];

    let created = 0;
    let skipped = 0;

    for (const sub of subfamilias) {
        const existing = await prisma.subfamilia.findFirst({
            where: {
                tenant_id: tenant.id,
                familia_id: familiaBebidas.id,
                nome: sub.nome,
            },
        });

        if (existing) {
            console.log(`⏭️  Skipped: ${sub.codigo} - ${sub.nome} (already exists)`);
            skipped++;
            continue;
        }

        await prisma.subfamilia.create({
            data: {
                tenant_id: tenant.id,
                familia_id: familiaBebidas.id,
                nome: sub.nome,
                codigo: sub.codigo,
            },
        });

        console.log(`✅ Created: ${sub.codigo} - ${sub.nome}`);
        created++;
    }

    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
