import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding purchase variation templates...');

    // Get the first tenant (for demo purposes)
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error('❌ No tenant found. Please create a tenant first.');
        return;
    }

    const tenantId = tenant.id;
    console.log(`📍 Using tenant: ${tenant.nome_restaurante} (ID: ${tenantId})`);

    // Templates for Liquids (L)
    const liquidTemplates = [
        { nome: 'Barril 50L', descricao: 'Barril de 50 litros', unidades_por_compra: 50, unidade_medida: 'L', ordem_exibicao: 1 },
        { nome: 'Barril 30L', descricao: 'Barril de 30 litros', unidades_por_compra: 30, unidade_medida: 'L', ordem_exibicao: 2 },
        { nome: 'Barril 20L', descricao: 'Barril de 20 litros', unidades_por_compra: 20, unidade_medida: 'L', ordem_exibicao: 3 },
        { nome: 'Pack 6x1.5L', descricao: 'Pack de 6 garrafas de 1.5L', unidades_por_compra: 9, unidade_medida: 'L', ordem_exibicao: 4 },
        { nome: 'Garrafa 5L', descricao: 'Garrafa de 5 litros', unidades_por_compra: 5, unidade_medida: 'L', ordem_exibicao: 5 },
        { nome: 'Garrafa 2L', descricao: 'Garrafa de 2 litros', unidades_por_compra: 2, unidade_medida: 'L', ordem_exibicao: 6 },
        { nome: 'Garrafa 1.5L', descricao: 'Garrafa de 1.5 litros', unidades_por_compra: 1.5, unidade_medida: 'L', ordem_exibicao: 7 },
        { nome: 'Garrafa 1L', descricao: 'Garrafa de 1 litro', unidades_por_compra: 1, unidade_medida: 'L', ordem_exibicao: 8 },
        { nome: 'Garrafa 75cl', descricao: 'Garrafa de 75 centilitros', unidades_por_compra: 0.75, unidade_medida: 'L', ordem_exibicao: 9 },
        { nome: 'Pack 12 latas 33cl', descricao: 'Pack de 12 latas de 33cl', unidades_por_compra: 3.96, unidade_medida: 'L', ordem_exibicao: 10 },
        { nome: 'Grade 24x33cl', descricao: 'Grade de 24 garrafas de 33cl', unidades_por_compra: 7.92, unidade_medida: 'L', ordem_exibicao: 11 },
        { nome: 'Lata 33cl', descricao: 'Lata de 33 centilitros', unidades_por_compra: 0.33, unidade_medida: 'L', ordem_exibicao: 12 },
        { nome: 'Garrafa 33cl', descricao: 'Garrafa de 33 centilitros', unidades_por_compra: 0.33, unidade_medida: 'L', ordem_exibicao: 13 },
        { nome: 'Garrafa 25cl', descricao: 'Garrafa de 25 centilitros', unidades_por_compra: 0.25, unidade_medida: 'L', ordem_exibicao: 14 },
    ];

    // Templates for Weight (KG)
    const weightTemplates = [
        { nome: 'Saco 25kg', descricao: 'Saco de 25 quilogramas', unidades_por_compra: 25, unidade_medida: 'KG', ordem_exibicao: 1 },
        { nome: 'Saco 20kg', descricao: 'Saco de 20 quilogramas', unidades_por_compra: 20, unidade_medida: 'KG', ordem_exibicao: 2 },
        { nome: 'Saco 10kg', descricao: 'Saco de 10 quilogramas', unidades_por_compra: 10, unidade_medida: 'KG', ordem_exibicao: 3 },
        { nome: 'Saco 5kg', descricao: 'Saco de 5 quilogramas', unidades_por_compra: 5, unidade_medida: 'KG', ordem_exibicao: 4 },
        { nome: 'Saco 2kg', descricao: 'Saco de 2 quilogramas', unidades_por_compra: 2, unidade_medida: 'KG', ordem_exibicao: 5 },
        { nome: 'Saco 1kg', descricao: 'Saco de 1 quilograma', unidades_por_compra: 1, unidade_medida: 'KG', ordem_exibicao: 6 },
        { nome: 'Caixa 10kg', descricao: 'Caixa de 10 quilogramas', unidades_por_compra: 10, unidade_medida: 'KG', ordem_exibicao: 7 },
        { nome: 'Caixa 5kg', descricao: 'Caixa de 5 quilogramas', unidades_por_compra: 5, unidade_medida: 'KG', ordem_exibicao: 8 },
        { nome: 'Embalagem 500g', descricao: 'Embalagem de 500 gramas', unidades_por_compra: 0.5, unidade_medida: 'KG', ordem_exibicao: 9 },
    ];

    // Templates for Units
    const unitTemplates = [
        { nome: 'Unidade', descricao: 'Unidade individual', unidades_por_compra: 1, unidade_medida: 'Unidade', ordem_exibicao: 1 },
        { nome: 'Pack 6un', descricao: 'Pack de 6 unidades', unidades_por_compra: 6, unidade_medida: 'Unidade', ordem_exibicao: 2 },
        { nome: 'Pack 12un', descricao: 'Pack de 12 unidades', unidades_por_compra: 12, unidade_medida: 'Unidade', ordem_exibicao: 3 },
        { nome: 'Caixa 24un', descricao: 'Caixa de 24 unidades', unidades_por_compra: 24, unidade_medida: 'Unidade', ordem_exibicao: 4 },
        { nome: 'Caixa 48un', descricao: 'Caixa de 48 unidades', unidades_por_compra: 48, unidade_medida: 'Unidade', ordem_exibicao: 5 },
        { nome: 'Caixa 100un', descricao: 'Caixa de 100 unidades', unidades_por_compra: 100, unidade_medida: 'Unidade', ordem_exibicao: 6 },
        { nome: 'Dúzia', descricao: 'Dúzia (12 unidades)', unidades_por_compra: 12, unidade_medida: 'Unidade', ordem_exibicao: 7 },
    ];

    const allTemplates = [...liquidTemplates, ...weightTemplates, ...unitTemplates];

    console.log(`📦 Creating ${allTemplates.length} templates...`);

    for (const template of allTemplates) {
        try {
            const existing = await prisma.templateVariacaoCompra.findFirst({
                where: {
                    tenant_id: tenantId,
                    nome: template.nome,
                    unidade_medida: template.unidade_medida,
                },
            });

            if (existing) {
                console.log(`⏭️  Template "${template.nome}" already exists, skipping...`);
                continue;
            }

            await prisma.templateVariacaoCompra.create({
                data: {
                    tenant_id: tenantId,
                    ...template,
                },
            });

            console.log(`✅ Created template: ${template.nome} (${template.unidade_medida})`);
        } catch (error) {
            console.error(`❌ Error creating template "${template.nome}":`, error);
        }
    }

    console.log('✨ Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
