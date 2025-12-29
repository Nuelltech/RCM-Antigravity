import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed de Formatos de Venda - Exemplos
 * Cria formatos de venda para produtos vendáveis (bebidas principalmente)
 */

interface FormatoVendaData {
    produtoNome: string;
    variacaoTipo: string; // Tipo de variação origem
    formato: {
        nome: string;
        quantidade: number;
        unidade: string;
        pvp: number;
        conversao: boolean;
    };
}

const formatosVenda: FormatoVendaData[] = [
    // Coca-Cola (exemplo completo)
    {
        produtoNome: 'Coca-Cola',
        variacaoTipo: 'Lata 33cl',
        formato: {
            nome: 'Coca-Cola Lata 33cl',
            quantidade: 0.33,
            unidade: 'L',
            pvp: 2.50,
            conversao: false, // Venda direta
        },
    },
    {
        produtoNome: 'Coca-Cola',
        variacaoTipo: 'Garrafa 50cl',
        formato: {
            nome: 'Coca-Cola Garrafa 50cl',
            quantidade: 0.50,
            unidade: 'L',
            pvp: 3.00,
            conversao: false,
        },
    },
    {
        produtoNome: 'Coca-Cola',
        variacaoTipo: 'Garrafa 2L',
        formato: {
            nome: 'Coca-Cola Copo 25cl',
            quantidade: 0.25,
            unidade: 'L',
            pvp: 2.00,
            conversao: true, // Convertido da garrafa 2L
        },
    },

    // Cerveja Superbock (exemplo do utilizador)
    {
        produtoNome: 'Cerveja Super Bock',
        variacaoTipo: 'Grade 24x33cl',
        formato: {
            nome: 'Super Bock Garrafa 33cl',
            quantidade: 0.33,
            unidade: 'L',
            pvp: 2.50,
            conversao: false,
        },
    },
    {
        produtoNome: 'Cerveja Super Bock',
        variacaoTipo: 'Grade 24x22cl',
        formato: {
            nome: 'Super Bock Garrafa 22cl',
            quantidade: 0.22,
            unidade: 'L',
            pvp: 2.00,
            conversao: false,
        },
    },
    {
        produtoNome: 'Cerveja Super Bock',
        variacaoTipo: 'Barril 50L',
        formato: {
            nome: 'Super Bock Copo 22cl',
            quantidade: 0.22,
            unidade: 'L',
            pvp: 2.20,
            conversao: true, // Vem do barril
        },
    },
    {
        produtoNome: 'Cerveja Super Bock',
        variacaoTipo: 'Barril 50L',
        formato: {
            nome: 'Super Bock Caneca 40cl',
            quantidade: 0.40,
            unidade: 'L',
            pvp: 3.50,
            conversao: true,
        },
    },

    // Água (simples)
    {
        produtoNome: 'Água Mineral',
        variacaoTipo: 'Garrafa 50cl',
        formato: {
            nome: 'Água 50cl',
            quantidade: 0.50,
            unidade: 'L',
            pvp: 1.50,
            conversao: false,
        },
    },
];

async function main() {
    console.log('🍺 Seeding sell formats...\n');

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error('No tenant found. Run seed.ts first.');
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const data of formatosVenda) {
        try {
            // Find product
            const produto = await prisma.produto.findFirst({
                where: {
                    tenant_id: tenant.id,
                    nome: data.produtoNome,
                },
            });

            if (!produto) {
                console.log(`⚠️  Product not found: ${data.produtoNome}`);
                errors++;
                continue;
            }

            // Mark product as sellable
            if (!produto.vendavel) {
                await prisma.produto.update({
                    where: { id: produto.id },
                    data: { vendavel: true },
                });
                console.log(`✅ Marked ${data.produtoNome} as sellable`);
            }

            // Find origin variation
            const variacao = await prisma.variacaoProduto.findFirst({
                where: {
                    tenant_id: tenant.id,
                    produto_id: produto.id,
                    tipo_unidade_compra: {
                        contains: data.variacaoTipo,
                    },
                },
            });

            if (!variacao) {
                console.log(`⚠️  Variation not found: ${data.produtoNome} - ${data.variacaoTipo}`);
                errors++;
                continue;
            }

            // Check if format already exists
            const existing = await prisma.formatoVenda.findFirst({
                where: {
                    tenant_id: tenant.id,
                    produto_id: produto.id,
                    nome: data.formato.nome,
                    data_fim_vigencia: null, // Only active
                },
            });

            if (existing) {
                console.log(`⏭️  Skipped: ${data.formato.nome} (already exists)`);
                skipped++;
                continue;
            }

            // Calculate cost
            const custoUnitario = Number(variacao.preco_unitario) * data.formato.quantidade;
            const margem = ((data.formato.pvp - custoUnitario) / custoUnitario) * 100;

            // Create format
            await prisma.formatoVenda.create({
                data: {
                    tenant_id: tenant.id,
                    produto_id: produto.id,
                    nome: data.formato.nome,
                    quantidade_vendida: data.formato.quantidade,
                    unidade_medida: data.formato.unidade,
                    preco_venda: data.formato.pvp,
                    custo_unitario: custoUnitario,
                    margem_percentual: margem,
                    variacao_origem_id: variacao.id,
                    conversao_necessaria: data.formato.conversao,
                    ativo: true,
                    disponivel_menu: true,
                },
            });

            console.log(
                `✅ Created: ${data.formato.nome} - PVP: €${data.formato.pvp} | Custo: €${custoUnitario.toFixed(2)} | Margem: ${margem.toFixed(1)}%`
            );
            created++;
        } catch (error: any) {
            console.error(`❌ Error processing ${data.produtoNome}: ${error.message}`);
            errors++;
        }
    }

    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped, ${errors} errors`);
}

main()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
