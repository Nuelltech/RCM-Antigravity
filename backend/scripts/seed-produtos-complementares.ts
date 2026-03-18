import { prisma } from '../src/core/database';

/**
 * Seed de produtos complementares necessários para as receitas
 * Adiciona produtos que não existem no seed-produtos.ts principal
 */

const produtosComplementares = [
    // Gorduras e óleos
    { familia: 'OLE', subfamilia: 'Gorduras Animais', nome: 'Banha', unidade: 'KG', preco: 4.50 },

    // Temperos e condimentos
    { familia: 'TEM', subfamilia: 'Temperos Secos', nome: 'Pimentão-doce', unidade: 'KG', preco: 12.80 },
    { familia: 'TEM', subfamilia: 'Temperos Secos', nome: 'Louro (Folhas)', unidade: 'KG', preco: 18.50, descricao: 'Folhas secas de louro' },
    { familia: 'TEM', subfamilia: 'Temperos Secos', nome: 'Pau de Canela', unidade: 'KG', preco: 24.00, descricao: 'Canela em pau' },

    // Leguminosas
    { familia: 'MER', subfamilia: 'Leguminosas e Grãos', nome: 'Feijão Vermelho', unidade: 'KG', preco: 2.80 },

    // Legumes
    { familia: 'LEG', subfamilia: 'Frescos', nome: 'Alho Francês', unidade: 'KG', preco: 2.50 },
    { familia: 'LEG', subfamilia: 'Frescos', nome: 'Nabo', unidade: 'KG', preco: 1.20 },
    { familia: 'LEG', subfamilia: 'Frescos', nome: 'Curgete', unidade: 'KG', preco: 1.80 },
    { familia: 'LEG', subfamilia: 'Frescos', nome: 'Couve Portuguesa', unidade: 'KG', preco: 1.40 },

    // Charcutaria
    { familia: 'CAR', subfamilia: 'Enchidos e Charcutaria', nome: 'Carnes Fumadas', unidade: 'KG', preco: 8.90 },
    { familia: 'CAR', subfamilia: 'Enchidos e Charcutaria', nome: 'Linguiça', unidade: 'KG', preco: 7.50 },
    { familia: 'CAR', subfamilia: 'Enchidos e Charcutaria', nome: 'Presunto', unidade: 'KG', preco: 18.50 },

    // Farinhas e amidos
    { familia: 'MER', subfamilia: 'Farinhas e Amidos', nome: 'Maisena', unidade: 'KG', preco: 3.20 },

    // Bebidas alcoólicas
    { familia: 'BEB', subfamilia: 'Vinhos', nome: 'Vinho do Porto', unidade: 'L', preco: 12.50 },

    // Doçaria e sobremesas
    { familia: 'PAD', subfamilia: 'Sobremesas e Bolos', nome: 'Chocolate Culinária', unidade: 'KG', preco: 8.50 },
    { familia: 'PAD', subfamilia: 'Sobremesas e Bolos', nome: 'Gelado Baunilha', unidade: 'KG', preco: 12.00, descricao: 'Gelado artesanal de baunilha' },

    // Frutas (para receitas)
    { familia: 'FRU', subfamilia: 'Frutas Frescas', nome: 'Limão', unidade: 'KG', preco: 2.80 },

    // Temperos frescos (se não existir)
    { familia: 'TEM', subfamilia: 'Temperos Frescos', nome: 'Salsa Fresca', unidade: 'KG', preco: 8.50 },
    { familia: 'TEM', subfamilia: 'Temperos Frescos', nome: 'Malagueta', unidade: 'KG', preco: 15.00 },
];

async function main() {
    console.log('🚀 Starting complementary products seed...\n');

    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error('❌ No tenant found! Please run seed.ts first.');
        return;
    }

    console.log(`✓ Using tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const produtoData of produtosComplementares) {
        try {
            // Find or create familia
            let familia = await prisma.familia.findFirst({
                where: {
                    tenant_id: tenant.id,
                    codigo: produtoData.familia,
                },
            });

            if (!familia) {
                console.log(`  ⚠️  Familia ${produtoData.familia} not found. Skipping ${produtoData.nome}`);
                skipped++;
                continue;
            }

            // Find or create subfamilia
            let subfamilia = await prisma.subfamilia.findFirst({
                where: {
                    tenant_id: tenant.id,
                    familia_id: familia.id,
                    nome: produtoData.subfamilia,
                },
            });

            if (!subfamilia) {
                // Create subfamilia if it doesn't exist
                subfamilia = await prisma.subfamilia.create({
                    data: {
                        tenant_id: tenant.id,
                        familia_id: familia.id,
                        nome: produtoData.subfamilia,
                        codigo: produtoData.subfamilia.substring(0, 3).toUpperCase(),
                    },
                });
                console.log(`    ➕ Created subfamilia: ${produtoData.subfamilia}`);
            }

            // Check if product already exists by name
            const existing = await prisma.produto.findFirst({
                where: {
                    tenant_id: tenant.id,
                    subfamilia_id: subfamilia.id,
                    nome: produtoData.nome,
                },
            });

            if (existing) {
                console.log(`  ⊘ Skipped: ${produtoData.nome} - already exists`);
                skipped++;
                continue;
            }

            // Create product
            const produto = await prisma.produto.create({
                data: {
                    tenant_id: tenant.id,
                    nome: produtoData.nome,
                    subfamilia_id: subfamilia.id,
                    unidade_medida: produtoData.unidade,
                    descricao: produtoData.descricao || null,
                    ativo: true,
                },
            });

            // Create default variation with price
            await prisma.variacaoProduto.create({
                data: {
                    tenant_id: tenant.id,
                    produto_id: produto.id,
                    tipo_unidade_compra: `Por ${produtoData.unidade}`,
                    unidades_por_compra: 1,
                    preco_compra: produtoData.preco,
                    preco_unitario: produtoData.preco,
                    ativo: true,
                },
            });

            console.log(`  ✓ Created: ${produtoData.nome} - €${produtoData.preco}/${produtoData.unidade}`);
            created++;

        } catch (error: any) {
            console.error(`  ✗ Error creating ${produtoData.nome}: ${error.message}`);
            errors++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Complementary Products Seed Summary:');
    console.log(`  ✓ Created: ${created} products`);
    console.log(`  ⊘ Skipped: ${skipped} products (already exist or familia missing)`);
    console.log(`  ✗ Errors: ${errors} products`);
    console.log('='.repeat(60));
    console.log('\n✨ Complementary products seed completed!\n');
}

main()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
