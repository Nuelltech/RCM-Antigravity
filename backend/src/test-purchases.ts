import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🔍 Testing Purchases Dashboard Query...\n');

    // Test 1: Count total items
    const totalItems = await prisma.compraItem.count({
        where: { tenant_id: 1 }
    });
    console.log('✅ Test 1 - Total Items:', totalItems);

    // Test 2: All faturas with items count
    const faturas = await prisma.compraFatura.findMany({
        where: { tenant_id: 1 },
        include: {
            _count: {
                select: { itens: true }
            }
        },
        orderBy: { data_fatura: 'desc' }
    });

    console.log('\n✅ Test 2 - All Faturas:');
    faturas.forEach(f => {
        console.log(`  ID ${f.id}: ${f.numero_fatura} - ${f.data_fatura.toISOString()} - ${f._count.itens} items`);
    });

    // Test 3: Query with date filter (same as dashboard)
    const startDate = new Date('2025-12-07');
    const endDate = new Date('2026-01-06');
    endDate.setHours(23, 59, 59, 999);

    console.log(`\n✅ Test 3 - Query with Date Filter:`);
    console.log(`  Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

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

    console.log(`  Found: ${purchaseItems.length} items`);
    const total = purchaseItems.reduce((sum, p) => sum + Number(p.preco_total), 0);
    console.log(`  Total: €${total.toFixed(2)}`);

    if (purchaseItems.length > 0) {
        console.log('\n  Sample items:');
        purchaseItems.slice(0, 5).forEach(item => {
            console.log(`    - ${item.descricao}: €${item.preco_total} (${item.compraFatura.data_fatura.toISOString()})`);
        });
    }

    console.log('\n✅ Done!\n');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
