const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
    console.log('\n🔍 Testing purchases query...\n');

    const startDate = new Date('2025-12-07');
    const endDate = new Date('2025-12-31');
    endDate.setHours(23, 59, 59, 999);

    console.log('Date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    });

    // Test 1: Raw query
    console.log('\n--- Test 1: Raw SQL Query ---');
    const rawResult = await prisma.$queryRaw`
        SELECT 
            cf.data_fatura,
            cf.numero_fatura,
            ci.descricao,
            ci.preco_total
        FROM compras_itens ci
        JOIN compras_faturas cf ON cf.id = ci.compra_fatura_id
        WHERE ci.tenant_id = 1
          AND cf.data_fatura >= ${startDate}
          AND cf.data_fatura <= ${endDate}
    `;
    console.log('Raw result count:', rawResult.length);
    console.log('Sample:', rawResult.slice(0, 3));

    // Test 2: Prisma query (same as dashboard)
    console.log('\n--- Test 2: Prisma Query (Dashboard) ---');
    const purchaseItems = await prisma.compraItem.findMany({
        where: {
            tenant_id: 1,
            compraFatura: {
                data_fatura: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        },
        include: {
            compraFatura: true,
        },
    });

    console.log('Prisma result count:', purchaseItems.length);
    console.log('Total:', purchaseItems.reduce((sum, p) => sum + Number(p.preco_total), 0));

    // Test 3: Check all faturas dates
    console.log('\n--- Test 3: All Faturas Dates ---');
    const allFaturas = await prisma.compraFatura.findMany({
        where: { tenant_id: 1 },
        select: {
            id: true,
            numero_fatura: true,
            data_fatura: true,
            _count: {
                select: { itens: true }
            }
        }
    });

    console.log('All faturas:');
    allFaturas.forEach(f => {
        console.log(`  ID ${f.id}: ${f.numero_fatura} - ${f.data_fatura.toISOString()} - ${f._count.itens} items`);
    });

    await prisma.$disconnect();
}

testQuery().catch(console.error);
