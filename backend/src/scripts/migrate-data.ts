import { PrismaClient } from '@prisma/client';

// Base de dados de origem (localhost)
const sourceDb = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:@localhost:3306/rcm_dev',
        },
    },
});

// Base de dados de destino (produção)
const targetDb = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function migrateData() {
    try {
        console.log('🚀 Iniciando migração de dados...\n');

        // 1. Migrar Famílias
        console.log('📦 Migrando famílias...');
        const familias = await sourceDb.familia.findMany();
        for (const familia of familias) {
            await targetDb.familia.upsert({
                where: { id: familia.id },
                update: familia,
                create: familia,
            });
        }
        console.log(`✅ ${familias.length} famílias migradas\n`);

        // 2. Migrar Subfamílias
        console.log('📦 Migrando subfamílias...');
        const subfamilias = await sourceDb.subfamilia.findMany();
        for (const subfamilia of subfamilias) {
            await targetDb.subfamilia.upsert({
                where: { id: subfamilia.id },
                update: subfamilia,
                create: subfamilia,
            });
        }
        console.log(`✅ ${subfamilias.length} subfamílias migradas\n`);

        // 3. Migrar Produtos
        console.log('📦 Migrando produtos...');
        const produtos = await sourceDb.produto.findMany({
            include: {
                variacoes_compra: true,
                formatos_venda: true,
            },
        });

        for (const produto of produtos) {
            const { variacoes_compra, formatos_venda, ...produtoData } = produto;

            // Criar produto
            await targetDb.produto.upsert({
                where: { id: produto.id },
                update: produtoData,
                create: produtoData,
            });

            // Migrar variações de compra
            for (const variacao of variacoes_compra) {
                await targetDb.variacaoCompra.upsert({
                    where: { id: variacao.id },
                    update: variacao,
                    create: variacao,
                });
            }

            // Migrar formatos de venda
            for (const formato of formatos_venda) {
                await targetDb.formatoVenda.upsert({
                    where: { id: formato.id },
                    update: formato,
                    create: formato,
                });
            }
        }
        console.log(`✅ ${produtos.length} produtos migrados\n`);

        // 4. Migrar Receitas
        console.log('📦 Migrando receitas...');
        const receitas = await sourceDb.receita.findMany({
            include: {
                ingredientes: true,
            },
        });

        for (const receita of receitas) {
            const { ingredientes, ...receitaData } = receita;

            // Criar receita
            await targetDb.receita.upsert({
                where: { id: receita.id },
                update: receitaData,
                create: receitaData,
            });

            // Migrar ingredientes
            for (const ingrediente of ingredientes) {
                await targetDb.ingredienteReceita.upsert({
                    where: { id: ingrediente.id },
                    update: ingrediente,
                    create: ingrediente,
                });
            }
        }
        console.log(`✅ ${receitas.length} receitas migradas\n`);

        // 5. Migrar Combos
        console.log('📦 Migrando combos...');
        const combos = await sourceDb.combo.findMany({
            include: {
                itens_simples: true,
                itens_complexos: true,
            },
        });

        for (const combo of combos) {
            const { itens_simples, itens_complexos, ...comboData } = combo;

            // Criar combo
            await targetDb.combo.upsert({
                where: { id: combo.id },
                update: comboData,
                create: comboData,
            });

            // Migrar itens simples
            for (const item of itens_simples) {
                await targetDb.itemComboSimples.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item,
                });
            }

            // Migrar itens complexos
            for (const item of itens_complexos) {
                await targetDb.itemComboComplexo.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item,
                });
            }
        }
        console.log(`✅ ${combos.length} combos migrados\n`);

        // 6. Migrar Menu
        console.log('📦 Migrando itens do menu...');
        const menuItems = await sourceDb.itemMenu.findMany();
        for (const item of menuItems) {
            await targetDb.itemMenu.upsert({
                where: { id: item.id },
                update: item,
                create: item,
            });
        }
        console.log(`✅ ${menuItems.length} itens do menu migrados\n`);

        console.log('🎉 Migração concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        throw error;
    } finally {
        await sourceDb.$disconnect();
        await targetDb.$disconnect();
    }
}

migrateData()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
