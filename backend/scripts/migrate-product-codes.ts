import { prisma } from '../src/core/database';

/**
 * Script de Migração: Atualiza códigos de produtos existentes para o formato FAM-SUB-SEQ
 * 
 * IMPORTANTE: Este script NÃO apaga nem cria novos produtos.
 * Apenas atualiza o campo `codigo_interno` dos produtos existentes.
 * Receitas e variações permanecem intactas.
 */

// Mapeamento de subfamílias para códigos abreviados (3 letras)
const subfamiliaCodigos: Record<string, string> = {
    // Carnes
    "Bovino": "BOV",
    "Suíno": "SUI",
    "Aves": "AVE",
    "Aves e Outras Carnes": "AVE",
    "Enchidos e Charcutaria": "CHA",
    "Porco": "POR",
    "Vitela": "VIT",
    // Peixes
    "Peixes": "PEI",
    "Bacalhau": "BAC",
    "Peixe Branco": "PBR",
    "Peixe Azul": "PAZ",
    "Marisco": "MAR",
    "Mariscos e Moluscos": "MAR",
    // Legumes
    "Raízes": "RAI",
    "Folhas": "FOL",
    "Frutas-Legume": "FRL",
    "Vagens": "VAG",
    "Frescos": "VER",
    "Congelados": "CON",
    // Laticínios
    "Leite": "LEI",
    "Leites e Natas": "LEI",
    "Queijo": "QUE",
    "Queijos e Derivados": "QUE",
    "Iogurte": "IOG",
    "Manteiga": "MAN",
    "Manteigas e Gorduras Animais": "MAN",
    "Ovos": "OVO",
    // Despensa
    "Grãos": "GRA",
    "Arroz": "ARZ",
    "Massas": "MAS",
    "Farinhas e Amidos": "FAR",
    "Leguminosas e Grãos": "LEG",
    "Açúcares e Doces Secos": "DOC",
    "Óleos": "OLE",
    "Azeites": "AZE",
    "Óleos Vegetais": "OLI",
    "Condimentos": "CON",
    "Temperos Secos": "TSE",
    "Molhos": "MOL",
    "Molhos e Caldos Industriais": "MOL",
    // Bebidas
    "Refrigerantes": "REF",
    "Sumos": "SUM",
    "Águas": "AGU",
    "Vinhos": "VIN",
    "Cervejas": "CER",
    // Outros
    "Frutas Frescas": "FRF",
    "Frutas Enlatadas": "FRE",
    "Peixes e Patés": "PAT",
    "Legumes e Outros Enlatados": "ENC",
    "Pães e Derivados": "PAN",
    "Sobremesas e Bolos": "SOB",
    "Molhos e Reduções": "PMO",
    "Caldos e Fundos": "PCA",
    "Marinadas e Temperos Prontos": "PMA",
    "Cremes, Purés e Sopas Base": "PCR",
    "Semi-acabados (bases, recheios, etc.)": "PSE",
    "Sobremesas Base": "PSO",
    "Diversos": "OUT",
};

async function main() {
    console.log('🔄 Starting product code migration...\n');

    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error('❌ No tenant found!');
        return;
    }

    console.log(`✓ Using tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})\n`);

    // Buscar todos os produtos com suas subfamílias e famílias
    const produtos = await prisma.produto.findMany({
        where: {
            tenant_id: tenant.id,
        },
        include: {
            subfamilia: {
                include: {
                    familia: true,
                },
            },
        },
        orderBy: [
            { subfamilia: { familia: { codigo: 'asc' } } },
            { subfamilia: { nome: 'asc' } },
            { nome: 'asc' },
        ],
    });

    console.log(`📦 Found ${produtos.length} products to process\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Agrupar por subfamília para gerar sequências corretas
    const sequenceCounters: Record<string, number> = {};

    for (const produto of produtos) {
        try {
            if (!produto.subfamilia?.familia) {
                console.warn(`  ⚠️  Skipped: ${produto.nome} - missing familia/subfamilia`);
                skipped++;
                continue;
            }

            const familiaCodigo = produto.subfamilia.familia.codigo;
            const subfamiliaNome = produto.subfamilia.nome;
            const subfamiliaCodigo = subfamiliaCodigos[subfamiliaNome] || 'XXX';

            const subfamiliaKey = `${familiaCodigo}-${subfamiliaCodigo}`;

            // Inicializar contador se não existir
            if (!sequenceCounters[subfamiliaKey]) {
                sequenceCounters[subfamiliaKey] = 1;
            }

            const sequencia = String(sequenceCounters[subfamiliaKey]).padStart(3, '0');
            const novoCodigo = `${familiaCodigo}-${subfamiliaCodigo}-${sequencia}`;
            sequenceCounters[subfamiliaKey]++;

            // Verificar se o código já está correto
            if (produto.codigo_interno === novoCodigo) {
                console.log(`  ⊘ Unchanged: ${produto.nome} → ${novoCodigo}`);
                skipped++;
                continue;
            }

            // Atualizar o código
            await prisma.produto.update({
                where: { id: produto.id },
                data: { codigo_interno: novoCodigo },
            });

            console.log(`  ✓ Updated: ${produto.nome}`);
            console.log(`    Old code: ${produto.codigo_interno || '(none)'}`);
            console.log(`    New code: ${novoCodigo}`);
            updated++;

        } catch (error: any) {
            console.error(`  ✗ Error updating ${produto.nome}: ${error.message}`);
            errors++;
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 Migration Summary:');
    console.log(`  ✓ Updated: ${updated} products`);
    console.log(`  ⊘ Unchanged/Skipped: ${skipped} products`);
    console.log(`  ✗ Errors: ${errors} products`);
    console.log('='.repeat(70));
    console.log('\n✨ Product code migration completed!\n');

    if (updated > 0) {
        console.log('🔗 All product relationships (receitas, variações) remain intact!');
    }
}

main()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
