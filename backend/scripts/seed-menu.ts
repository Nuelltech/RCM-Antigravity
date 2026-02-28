
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Menu Seeding...');

    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error('❌ No tenant found! Please run seed.ts first.');
        return;
    }

    console.log(`✓ Using tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})\n`);

    // 1. Seed Menu Items from RECIPES (Final Dishes)
    const receitas = await prisma.receita.findMany({
        where: {
            tenant_id: tenant.id,
            tipo: 'Final',
            ativa: true
        }
    });

    console.log(`Found ${receitas.length} recipes to convert to menu items.`);

    for (const receita of receitas) {
        // Check if menu item already exists
        const existing = await prisma.menuItem.findFirst({
            where: {
                tenant_id: tenant.id,
                receita_id: receita.id
            }
        });

        if (existing) {
            console.log(`  ⊘ Skipped: ${receita.nome} - already exists`);
            continue;
        }

        // Calculate a mock price (cost * 3.5)
        const cost = Number(receita.custo_por_porcao) || 0;
        const price = cost > 0 ? cost * 3.5 : 12.50;

        await prisma.menuItem.create({
            data: {
                tenant_id: tenant.id,
                receita_id: receita.id,
                nome_comercial: receita.nome,
                categoria_menu: receita.categoria || 'Pratos Principais',
                descricao_menu: receita.descricao,
                pvp: new Decimal(price),
                margem_bruta: new Decimal(price - cost),
                margem_percentual: new Decimal(price > 0 ? ((price - cost) / price) * 100 : 0),
                cmv_percentual: new Decimal(price > 0 ? (cost / price) * 100 : 0),
                ativo: true,
                posicao_menu: 0,
                imagem_url: receita.imagem_url
            }
        });
        console.log(`  + Added Menu Item (Recipe): ${receita.nome} - €${price.toFixed(2)}`);
    }

    // 2. Seed Menu Items from DRINKS (Products in 'Bebidas' family)
    const familiaBebidas = await prisma.familia.findFirst({
        where: {
            tenant_id: tenant.id,
            nome: { contains: 'Bebidas' } // Looser match just in case
        }
    });

    if (familiaBebidas) {
        const bebidas = await prisma.produto.findMany({
            where: {
                tenant_id: tenant.id,
                subfamilia: {
                    familia_id: familiaBebidas.id
                },
                ativo: true
            },
            include: {
                variacoes: true,
                formatosVenda: true // Check if already has formats
            }
        });

        console.log(`Found ${bebidas.length} drinks to convert to menu items.`);

        for (const bebida of bebidas) {
            // Calculate a mock price (cost * 4 for drinks)
            const cost = Number(bebida.variacoes[0]?.preco_unitario) || 0.50;
            const price = cost * 4 || 2.00;

            // 2a. Find or Create FormatoVenda
            let formatoVenda = await prisma.formatoVenda.findFirst({
                where: {
                    tenant_id: tenant.id,
                    produto_id: bebida.id,
                    nome: { equals: bebida.unidade_medida } // Simple match, e.g., 'Unidade' or 'L'
                }
            });

            if (!formatoVenda) {
                // Create a default sale format (e.g., "Garrafa", "Lata", or just the Unit)
                formatoVenda = await prisma.formatoVenda.create({
                    data: {
                        tenant_id: tenant.id,
                        produto_id: bebida.id,
                        nome: bebida.unidade_medida === 'L' ? 'Garrafa 1L' : 'Unidade',
                        quantidade_vendida: new Decimal(1), // 1 unit/L
                        unidade_medida: bebida.unidade_medida,
                        preco_venda: new Decimal(price),
                        custo_unitario: new Decimal(cost),
                        margem_percentual: new Decimal(price > 0 ? ((price - cost) / price) * 100 : 0),
                        conversao_necessaria: false,
                        ativo: true,
                        disponivel_menu: true
                    }
                });
                console.log(`    > Created FormatoVenda for ${bebida.nome}`);
            }

            // 2b. Create MenuItem linked to FormatoVenda
            const existingMenu = await prisma.menuItem.findFirst({
                where: {
                    tenant_id: tenant.id,
                    formato_venda_id: formatoVenda.id
                }
            });

            if (existingMenu) {
                console.log(`  ⊘ Skipped: ${bebida.nome} - already exists in menu`);
                continue;
            }

            await prisma.menuItem.create({
                data: {
                    tenant_id: tenant.id,
                    formato_venda_id: formatoVenda.id,
                    nome_comercial: bebida.nome,
                    categoria_menu: 'Bebidas',
                    descricao_menu: bebida.descricao,
                    pvp: new Decimal(price),
                    margem_bruta: new Decimal(price - cost),
                    margem_percentual: new Decimal(price > 0 ? ((price - cost) / price) * 100 : 0),
                    cmv_percentual: new Decimal(price > 0 ? (cost / price) * 100 : 0),
                    ativo: true,
                    posicao_menu: 0,
                    imagem_url: bebida.imagem_url
                }
            });
            console.log(`  + Added Menu Item (Drink): ${bebida.nome}`);
        }
    } else {
        console.log('⚠️ Family "Bebidas" not found (or no products), skipping drink menu items.');
    }

    console.log('✅ Menu Seeding Completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
