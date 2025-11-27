import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Quick Seed - Creates sell formats for existing products
 * This adapts to whatever products you have in the database
 */

async function main() {
    console.log('🍺 Quick Seed: Creating sell formats for existing products...\n');

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error('❌ No tenant found. Run seed.ts first.');
    }

    // Get all products with variations
    const produtos = await prisma.produto.findMany({
        where: {
            tenant_id: tenant.id,
        },
        include: {
            variacoes: {
                where: {
                    ativo: true,
                },
            },
        },
    });

    console.log(`📦 Found ${produtos.length} products\n`);

    let created = 0;
    let skipped = 0;

    for (const produto of produtos) {
        if (produto.variacoes.length === 0) {
            console.log(`⏭️  ${produto.nome}: No variations, skipping`);
            continue;
        }

        // Mark as sellable if it has variations
        if (!produto.vendavel) {
            await prisma.produto.update({
                where: { id: produto.id },
                data: { vendavel: true },
            });
            console.log(`✅ Marked "${produto.nome}" as sellable`);
        }

        // Create a format for the first variation
        const variacao = produto.variacoes[0];

        // Check if format already exists
        const existing = await prisma.formatoVenda.findFirst({
            where: {
                tenant_id: tenant.id,
                produto_id: produto.id,
                variacao_origem_id: variacao.id,
                data_fim_vigencia: null,
            },
        });

        if (existing) {
            console.log(`⏭️  ${produto.nome}: Format already exists`);
            skipped++;
            continue;
        }

        // Extract quantity from tipo_unidade_compra (e.g., "Garrafa 50cl" -> 0.5L)
        const tipoUnidade = variacao.tipo_unidade_compra || '';
        let quantidade = 1;
        let unidade = produto.unidade_medida;

        // Try to parse quantity from variation type
        const match = tipoUnidade.match(/(\d+\.?\d*)\s*(cl|ml|L|kg|g|un)/i);
        if (match) {
            const valor = parseFloat(match[1]);
            const unidadeMatch = match[2].toLowerCase();

            // Convert to base unit
            if (unidadeMatch === 'cl') {
                quantidade = valor / 100; // cl to L
                unidade = 'L';
            } else if (unidadeMatch === 'ml') {
                quantidade = valor / 1000; // ml to L
                unidade = 'L';
            } else if (unidadeMatch === 'g') {
                quantidade = valor / 1000; // g to kg
                unidade = 'kg';
            } else {
                quantidade = valor;
                unidade = unidadeMatch.toUpperCase();
            }
        }

        // Calculate pricing (40% margin as default)
        const custoUnitario = Number(variacao.preco_unitario) * quantidade;
        const pvp = custoUnitario * 1.4; // 40% margin
        const margem = 40;

        // Create format
        const formatoNome = `${produto.nome} (${tipoUnidade || 'Unidade'})`;

        await prisma.formatoVenda.create({
            data: {
                tenant_id: tenant.id,
                produto_id: produto.id,
                nome: formatoNome,
                quantidade_vendida: quantidade,
                unidade_medida: unidade,
                preco_venda: pvp,
                custo_unitario: custoUnitario,
                margem_percentual: margem,
                variacao_origem_id: variacao.id,
                conversao_necessaria: false,
                ativo: true,
                disponivel_menu: true,
            },
        });

        console.log(
            `✅ "${formatoNome}" - PVP: €${pvp.toFixed(2)} | Custo: €${custoUnitario.toFixed(2)}`
        );
        created++;
    }

    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
    console.log('✅ Done! You can now use these products in combos.\n');
}

main()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
