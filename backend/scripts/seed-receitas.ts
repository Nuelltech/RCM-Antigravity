import { prisma } from '../src/core/database';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Seed de Receitas - 10 receitas portuguesas tradicionais
 * 9 receitas finais + 1 pré-preparo (Arroz Branco)
 */

// Helper para calcular rentabilidade
function calcularRentabilidade(qtdBruta: number, qtdLiquida: number): number {
    if (qtdBruta === 0) return 100;
    return (qtdLiquida / qtdBruta) * 100;
}

interface IngredienteReceita {
    nome: string;
    quantidade_bruta: number; // em KG, L ou Unidade
    quantidade_liquida: number;
    observacoes?: string;
}

interface ReceitaData {
    nome: string;
    tipo: 'Final' | 'Pre-preparo';
    numero_porcoes: number;
    tempo_preparacao: number; // minutos
    quantidade_total_produzida?: number;
    unidade_medida?: string;
    categoria: string;
    descricao?: string;
    dificuldade: 'Fácil' | 'Média' | 'Difícil';
    ingredientes: IngredienteReceita[];
    etapas: string[];
}

const receitas: ReceitaData[] = [
    // ===== 1. SOPA DE LEGUMES =====
    {
        nome: 'Sopa de Legumes',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 45,
        quantidade_total_produzida: 1,
        unidade_medida: 'L',
        categoria: 'Sopas',
        dificuldade: 'Fácil',
        ingredientes: [
            { nome: 'Batata', quantidade_bruta: 0.210, quantidade_liquida: 0.160 },
            { nome: 'Cenoura', quantidade_bruta: 0.150, quantidade_liquida: 0.120 },
            { nome: 'Cebola', quantidade_bruta: 0.100, quantidade_liquida: 0.080 },
            { nome: 'Alho Francês', quantidade_bruta: 0.110, quantidade_liquida: 0.080 },
            { nome: 'Nabo', quantidade_bruta: 0.110, quantidade_liquida: 0.080 },
            { nome: 'Curgete', quantidade_bruta: 0.100, quantidade_liquida: 0.080 },
            { nome: 'Couve Portuguesa', quantidade_bruta: 0.100, quantidade_liquida: 0.080 },
            { nome: 'Azeite', quantidade_bruta: 0.020, quantidade_liquida: 0.020 }, // 20ml ≈ 0.020L
            { nome: 'Sal', quantidade_bruta: 0.005, quantidade_liquida: 0.005, observacoes: 'q.b.' }, // quantidade simbólica
        ],
        etapas: [
            'Lave, descasque, pese os ingredientes brutos e prepare os legumes até alcançar as quantidades líquidas necessárias.',
            'Coza legumes em água com sal, triture, junte couve, coza mais e finalize com azeite.',
        ],
    },

    // ===== 2. LOMBO DE PORCO ASSADO =====
    {
        nome: 'Lombo de Porco Assado',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 90,
        quantidade_total_produzida: 1.1,
        unidade_medida: 'KG',
        categoria: 'Carnes',
        dificuldade: 'Média',
        ingredientes: [
            { nome: 'Lombo de Porco', quantidade_bruta: 0.900, quantidade_liquida: 0.720 },
            { nome: 'Banha', quantidade_bruta: 0.040, quantidade_liquida: 0.040 },
            { nome: 'Óleo Vegetal', quantidade_bruta: 0.028, quantidade_liquida: 0.028 }, // 28ml ≈ 0.028L
            { nome: 'Vinho Branco', quantidade_bruta: 0.036, quantidade_liquida: 0.036 }, // 36ml ≈ 0.036L
            { nome: 'Alho', quantidade_bruta: 0.016, quantidade_liquida: 0.012 },
            { nome: 'Pimentão-doce', quantidade_bruta: 0.008, quantidade_liquida: 0.008 },
            { nome: 'Salsa Fresca', quantidade_bruta: 0.010, quantidade_liquida: 0.008 },
            { nome: 'Louro (Folhas)', quantidade_bruta: 0.002, quantidade_liquida: 0.002, observacoes: '4 folhas' }, // aprox. 0.5g por folha = 2g
            { nome: 'Sal', quantidade_bruta: 0.005, quantidade_liquida: 0.005, observacoes: 'q.b.' },
            { nome: 'Batata', quantidade_bruta: 0.500, quantidade_liquida: 0.400 },
        ],
        etapas: [
            'Pese carne limpa ou limpe e pese a quantidade líquida após descontar ossos/gorduras.',
            'Tempere e asse com acompanhamentos, controlando perdas ao final do procedimento.',
        ],
    },

    // ===== 3. ARROZ BRANCO (PRÉ-PREPARO) =====
    {
        nome: 'Arroz Branco',
        tipo: 'Pre-preparo',
        numero_porcoes: 4,
        tempo_preparacao: 20,
        quantidade_total_produzida: 0.6,
        unidade_medida: 'KG',
        categoria: 'Acompanhamentos',
        dificuldade: 'Fácil',
        ingredientes: [
            { nome: 'Arroz', quantidade_bruta: 0.240, quantidade_liquida: 0.240 },
            { nome: 'Sal', quantidade_bruta: 0.008, quantidade_liquida: 0.008 },
            { nome: 'Óleo Vegetal', quantidade_bruta: 0.012, quantidade_liquida: 0.012 }, // 12ml ≈ 0.012L
        ],
        etapas: [
            'Todos os ingredientes medidos em bruto igual à líquida (sem preparação extra).',
            'Cozinhar normalmente.',
        ],
    },

    // ===== 4. FEIJOADA À TRANSMONTANA =====
    {
        nome: 'Feijoada à Transmontana',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 150,
        quantidade_total_produzida: 1,
        unidade_medida: 'KG',
        categoria: 'Carnes',
        dificuldade: 'Média',
        ingredientes: [
            { nome: 'Feijão Vermelho', quantidade_bruta: 0.400, quantidade_liquida: 0.320, observacoes: 'Seco, antes de demolho' },
            { nome: 'Carnes Fumadas', quantidade_bruta: 0.200, quantidade_liquida: 0.160 },
            { nome: 'Linguiça', quantidade_bruta: 0.050, quantidade_liquida: 0.040 },
            { nome: 'Presunto', quantidade_bruta: 0.050, quantidade_liquida: 0.040 },
            { nome: 'Cebola', quantidade_bruta: 0.100, quantidade_liquida: 0.080 },
            { nome: 'Salsa Fresca', quantidade_bruta: 0.010, quantidade_liquida: 0.008 },
            { nome: 'Alho', quantidade_bruta: 0.010, quantidade_liquida: 0.008 },
            { nome: 'Louro (Folhas)', quantidade_bruta: 0.002, quantidade_liquida: 0.002, observacoes: '4 folhas' },
            { nome: 'Azeite', quantidade_bruta: 0.024, quantidade_liquida: 0.024 }, // 24ml ≈ 0.024L
            { nome: 'Malagueta', quantidade_bruta: 0.002, quantidade_liquida: 0.002, observacoes: 'Temperos, q.b.' },
        ],
        etapas: [
            'Prepare os ingredientes considerando o rendimento final esperado ao limpar e processar.',
            'Coza e refogue como indicado.',
        ],
    },

    // ===== 5. BIFE À PORTUGUESA =====
    {
        nome: 'Bife à Portuguesa',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 40,
        quantidade_total_produzida: 1.2,
        unidade_medida: 'KG',
        categoria: 'Carnes',
        dificuldade: 'Média',
        ingredientes: [
            { nome: 'Vazia', quantidade_bruta: 0.900, quantidade_liquida: 0.720, observacoes: 'Bife lombo cru' },
            { nome: 'Presunto', quantidade_bruta: 0.075, quantidade_liquida: 0.060 },
            { nome: 'Batata', quantidade_bruta: 0.600, quantidade_liquida: 0.480 },
            { nome: 'Alho', quantidade_bruta: 0.010, quantidade_liquida: 0.008 },
            { nome: 'Vinho Branco', quantidade_bruta: 0.040, quantidade_liquida: 0.040 }, // 40ml ≈ 0.040L
            { nome: 'Azeite', quantidade_bruta: 0.032, quantidade_liquida: 0.032 }, // 32ml ≈ 0.032L
            { nome: 'Louro (Folhas)', quantidade_bruta: 0.002, quantidade_liquida: 0.002, observacoes: '4 folhas' },
        ],
        etapas: [
            'Retire excessos/gorduras dos bifes (quantidade final líquida).',
            'Proceda normalmente.',
        ],
    },

    // ===== 6. DOURADA GRELHADA =====
    {
        nome: 'Dourada Grelhada',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 30,
        quantidade_total_produzida: 1.2,
        unidade_medida: 'KG',
        categoria: 'Peixes',
        dificuldade: 'Fácil',
        ingredientes: [
            { nome: 'Dourada', quantidade_bruta: 1.600, quantidade_liquida: 1.200, observacoes: 'Peixe inteiro, após limpeza' },
            { nome: 'Azeite', quantidade_bruta: 0.040, quantidade_liquida: 0.040 }, // 40ml ≈ 0.040L
            { nome: 'Limão', quantidade_bruta: 0.075, quantidade_liquida: 0.060 },
            { nome: 'Sal', quantidade_bruta: 0.008, quantidade_liquida: 0.008 },
        ],
        etapas: [
            'Limpe peixe (retire vísceras e barbatanas).',
            'Proceda normalmente.',
        ],
    },

    // ===== 7. FILETES DE PESCADA COM ARROZ DE TOMATE =====
    {
        nome: 'Filetes de Pescada com Arroz de Tomate',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 45,
        quantidade_total_produzida: 1.1,
        unidade_medida: 'KG',
        categoria: 'Peixes',
        dificuldade: 'Média',
        ingredientes: [
            { nome: 'Pescada', quantidade_bruta: 0.600, quantidade_liquida: 0.480, observacoes: 'Filetes limpos' },
            { nome: 'Limão', quantidade_bruta: 0.050, quantidade_liquida: 0.040 },
            { nome: 'Farinha de Trigo', quantidade_bruta: 0.060, quantidade_liquida: 0.060 },
            { nome: 'Tomate', quantidade_bruta: 0.150, quantidade_liquida: 0.120 },
            { nome: 'Arroz', quantidade_bruta: 0.240, quantidade_liquida: 0.240 },
            { nome: 'Cebola', quantidade_bruta: 0.075, quantidade_liquida: 0.060 },
            { nome: 'Alho', quantidade_bruta: 0.015, quantidade_liquida: 0.012 },
            { nome: 'Azeite', quantidade_bruta: 0.032, quantidade_liquida: 0.032 }, // 32ml ≈ 0.032L
            { nome: 'Salsa Fresca', quantidade_bruta: 0.010, quantidade_liquida: 0.008 },
        ],
        etapas: [
            'Filete peixe fresco ou pese já limpo como base líquida.',
            'Proceda normalmente.',
        ],
    },

    // ===== 8. LEITE CREME =====
    {
        nome: 'Leite Creme',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 25,
        quantidade_total_produzida: 0.5,
        unidade_medida: 'L',
        categoria: 'Sobremesas',
        dificuldade: 'Média',
        ingredientes: [
            { nome: 'Leite Integral', quantidade_bruta: 0.320, quantidade_liquida: 0.320 }, // 320ml ≈ 0.320L
            { nome: 'Açúcar', quantidade_bruta: 0.064, quantidade_liquida: 0.064 },
            { nome: 'Limão', quantidade_bruta: 0.010, quantidade_liquida: 0.008, observacoes: 'Casca de limão' },
            { nome: 'Maisena', quantidade_bruta: 0.016, quantidade_liquida: 0.016 },
            { nome: 'Pau de Canela', quantidade_bruta: 0.004, quantidade_liquida: 0.004, observacoes: '2 unidades' },
            { nome: 'Açúcar', quantidade_bruta: 0.020, quantidade_liquida: 0.020, observacoes: 'Para queimar' },
        ],
        etapas: [
            'Separe gemas (peso líquido), pese canela/casca já limpa.',
        ],
    },

    // ===== 9. PUDIM FRANCÊS =====
    {
        nome: 'Pudim Francês',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 60,
        quantidade_total_produzida: 0.5,
        unidade_medida: 'KG',
        categoria: 'Sobremesas',
        dificuldade: 'Média',
        ingredientes: [
            { nome: 'Açúcar', quantidade_bruta: 0.080, quantidade_liquida: 0.080 },
            { nome: 'Leite Integral', quantidade_bruta: 0.160, quantidade_liquida: 0.160 }, // 160ml ≈ 0.160L
            { nome: 'Vinho do Porto', quantidade_bruta: 0.008, quantidade_liquida: 0.008 }, // 8ml ≈ 0.008L
            { nome: 'Limão', quantidade_bruta: 0.005, quantidade_liquida: 0.004, observacoes: 'Casca citrinos' },
        ],
        etapas: [],
    },

    // ===== 10. PETIT GATEAUX COM BOLA DE GELADO =====
    {
        nome: 'Petit Gateaux com Bola de Gelado',
        tipo: 'Final',
        numero_porcoes: 4,
        tempo_preparacao: 35,
        quantidade_total_produzida: 0.6,
        unidade_medida: 'KG',
        categoria: 'Sobremesas',
        dificuldade: 'Difícil',
        ingredientes: [
            { nome: 'Chocolate Culinária', quantidade_bruta: 0.120, quantidade_liquida: 0.120 },
            { nome: 'Manteiga Com Sal', quantidade_bruta: 0.080, quantidade_liquida: 0.080 },
            { nome: 'Açúcar', quantidade_bruta: 0.080, quantidade_liquida: 0.080 },
            { nome: 'Farinha de Trigo', quantidade_bruta: 0.040, quantidade_liquida: 0.040 },
            { nome: 'Gelado Baunilha', quantidade_bruta: 0.200, quantidade_liquida: 0.200, observacoes: '4 bolas, ~50g cada' },
        ],
        etapas: [],
    },
];

async function main() {
    console.log('🚀 Starting recipes seed...\n');

    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error('❌ No tenant found! Please run seed.ts first.');
        return;
    }

    console.log(`✓ Using tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const receitaData of receitas) {
        try {
            // Check if recipe already exists
            const existing = await prisma.receita.findFirst({
                where: {
                    tenant_id: tenant.id,
                    nome: receitaData.nome,
                },
            });

            if (existing) {
                console.log(`  ⊘ Skipped: ${receitaData.nome} - already exists`);
                skipped++;
                continue;
            }

            // Create recipe in transaction
            await prisma.$transaction(async (tx) => {
                // 1. Create recipe
                const receita = await tx.receita.create({
                    data: {
                        tenant_id: tenant.id,
                        nome: receitaData.nome,
                        tipo: receitaData.tipo,
                        numero_porcoes: new Decimal(receitaData.numero_porcoes),
                        tempo_preparacao: receitaData.tempo_preparacao,
                        quantidade_total_produzida: receitaData.quantidade_total_produzida
                            ? new Decimal(receitaData.quantidade_total_produzida)
                            : null,
                        unidade_medida: receitaData.unidade_medida,
                        categoria: receitaData.categoria,
                        descricao: receitaData.descricao,
                        dificuldade: receitaData.dificuldade,
                        ativa: true,
                    },
                });

                // 2. Add ingredients and calculate costs
                let custoTotal = new Decimal(0);

                for (const ing of receitaData.ingredientes) {
                    // Find product
                    const produto = await tx.produto.findFirst({
                        where: {
                            tenant_id: tenant.id,
                            nome: ing.nome,
                        },
                        include: {
                            variacoes: {
                                where: { ativo: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        },
                    });

                    if (!produto) {
                        console.warn(`    ⚠️  Product not found: ${ing.nome} - skipping ingredient`);
                        continue;
                    }

                    // Get unit price
                    const precoUnitario = produto.variacoes[0]?.preco_unitario || new Decimal(0);
                    const custoIngrediente = new Decimal(ing.quantidade_bruta).mul(precoUnitario);
                    custoTotal = custoTotal.add(custoIngrediente);

                    // Calculate rentabilidade
                    const rentabilidade = calcularRentabilidade(ing.quantidade_bruta, ing.quantidade_liquida);

                    // Create ingredient
                    await tx.ingredienteReceita.create({
                        data: {
                            tenant_id: tenant.id,
                            receita_id: receita.id,
                            produto_id: produto.id,
                            quantidade_bruta: new Decimal(ing.quantidade_bruta),
                            quantidade_liquida: new Decimal(ing.quantidade_liquida),
                            rentabilidade: new Decimal(rentabilidade),
                            unidade: produto.unidade_medida,
                            custo_ingrediente: custoIngrediente,
                            notas: ing.observacoes,
                            ordem: 0,
                        },
                    });
                }

                // 3. Calculate cost per portion
                const custoPorPorcao = custoTotal.div(new Decimal(receitaData.numero_porcoes));

                // 4. Update recipe with costs
                await tx.receita.update({
                    where: { id: receita.id },
                    data: {
                        custo_total: custoTotal,
                        custo_por_porcao: custoPorPorcao,
                    },
                });

                // 5. Add steps
                if (receitaData.etapas && receitaData.etapas.length > 0) {
                    for (let i = 0; i < receitaData.etapas.length; i++) {
                        await tx.etapaReceita.create({
                            data: {
                                tenant_id: tenant.id,
                                receita_id: receita.id,
                                numero_etapa: i + 1,
                                descricao: receitaData.etapas[i],
                            },
                        });
                    }
                }

                console.log(`  ✓ Created: ${receitaData.nome} (${receitaData.tipo}) - €${Number(custoPorPorcao).toFixed(2)}/porção`);
            });

            created++;

        } catch (error: any) {
            console.error(`  ✗ Error creating ${receitaData.nome}: ${error.message}`);
            errors++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Recipes Seed Summary:');
    console.log(`  ✓ Created: ${created} recipes`);
    console.log(`  ⊘ Skipped: ${skipped} recipes (already exist)`);
    console.log(`  ✗ Errors: ${errors} recipes`);
    console.log('='.repeat(60));
    console.log('\n✨ Recipes seed completed!\n');
}

main()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
