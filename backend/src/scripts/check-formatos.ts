import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    console.log('🔍 Checking FormatoVenda table...\n');

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.log('❌ No tenant found');
        return;
    }

    const formatos = await prisma.formatoVenda.findMany({
        where: {
            tenant_id: tenant.id,
        },
        include: {
            produto: {
                select: {
                    nome: true,
                    vendavel: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    console.log(`📊 Total Formatos de Venda: ${formatos.length}\n`);

    if (formatos.length === 0) {
        console.log('⚠️  No sell formats found in database');
        console.log('💡 Run: npx tsx scripts/seed-formatos-quick.ts\n');
        return;
    }

    console.log('📋 Formatos de Venda:\n');
    formatos.forEach((f, i) => {
        console.log(`${i + 1}. ${f.nome}`);
        console.log(`   Produto: ${f.produto.nome} (vendável: ${f.produto.vendavel ? '✅' : '❌'})`);
        console.log(`   PVP: €${f.preco_venda.toFixed(2)} | Custo: €${f.custo_unitario.toFixed(2)} | Margem: ${f.margem_percentual.toFixed(1)}%`);
        console.log(`   Quantidade: ${f.quantidade_vendida} ${f.unidade_medida}`);
        console.log(`   Ativo: ${f.ativo ? '✅' : '❌'} | Menu: ${f.disponivel_menu ? '✅' : '❌'}`);
        console.log('');
    });
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
