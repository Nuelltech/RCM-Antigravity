import { prisma } from '../src/core/database';

// Mapeamento de subfamílias para códigos abreviados (3 letras)
const subfamiliaCodigos: Record<string, string> = {
    // Carnes
    "Bovino": "BOV",
    "Suíno": "SUI",
    "Aves": "AVE",
    // Peixes
    "Bacalhau": "BAC",
    "Peixe Branco": "PBR",
    "Peixe Azul": "PAZ",
    "Marisco": "MAR",
    // Legumes
    "Raízes": "RAI",
    "Folhas": "FOL",
    "Frutas-Legume": "FRL",
    "Vagens": "VAG",
    // Laticínios
    "Leite": "LEI",
    "Queijo": "QUE",
    "Iogurte": "IOG",
    "Manteiga": "MAN",
    // Despensa
    "Grãos": "GRA",
    "Óleos": "OLE",
    "Condimentos": "CON",
    "Molhos": "MOL",
    // Bebidas
    "Refrigerantes": "REF",
    "Sumos": "SUM",
    "Águas": "AGU",
    "Vinhos": "VIN",
    "Cervejas": "CER",
};

// Produto data - formato: FAM-SUB-SEQ
const produtosData = [
    // CARNES - Bovino
    { familia: "CAR", subfamilia: "Bovino", nome: "Alcatra", unidade: "KG", preco: 12.50 },
    { familia: "CAR", subfamilia: "Bovino", nome: "Vazia", unidade: "KG", preco: 11.80 },
    { familia: "CAR", subfamilia: "Bovino", nome: "Lombo", unidade: "KG", preco: 14.20 },
    { familia: "CAR", subfamilia: "Bovino", nome: "Picanha", unidade: "KG", preco: 16.50 },
    { familia: "CAR", subfamilia: "Bovino", nome: "Maminha", unidade: "KG", preco: 13.90 },
    { familia: "CAR", subfamilia: "Bovino", nome: "Fraldinha", unidade: "KG", preco: 10.50 },
    { familia: "CAR", subfamilia: "Bovino", nome: "Contra-Filé", unidade: "KG", preco: 15.80 },
    { familia: "CAR", subfamilia: "Bovino", nome: "Filé Mignon", unidade: "KG", preco: 28.50 },
    // CARNES - Suíno
    { familia: "CAR", subfamilia: "Suíno", nome: "Lombo de Porco", unidade: "KG", preco: 6.80 },
    { familia: "CAR", subfamilia: "Suíno", nome: "Costela de Porco", unidade: "KG", preco: 5.50 },
    { familia: "CAR", subfamilia: "Suíno", nome: "Barriga de Porco", unidade: "KG", preco: 4.90 },
    { familia: "CAR", subfamilia: "Suíno", nome: "Entrecosto", unidade: "KG", preco: 5.20 },
    // CARNES - Aves
    { familia: "CAR", subfamilia: "Aves", nome: "Peito de Frango", unidade: "KG", preco: 5.80 },
    { familia: "CAR", subfamilia: "Aves", nome: "Coxa de Frango", unidade: "KG", preco: 4.20 },
    { familia: "CAR", subfamilia: "Aves", nome: "Asa de Frango", unidade: "KG", preco: 3.80 },
    { familia: "CAR", subfamilia: "Aves", nome: "Frango Inteiro", unidade: "KG", preco: 4.50 },
    { familia: "CAR", subfamilia: "Aves", nome: "Peru", unidade: "KG", preco: 8.90 },
    { familia: "CAR", subfamilia: "Aves", nome: "Pato", unidade: "KG", preco: 12.50 },

    // PEIXES - Bacalhau
    { familia: "PEI", subfamilia: "Bacalhau", nome: "Bacalhau do Porto", unidade: "KG", preco: 22.50 },
    { familia: "PEI", subfamilia: "Bacalhau", nome: "Bacalhau Crescido", unidade: "KG", preco: 18.90 },
    { familia: "PEI", subfamilia: "Bacalhau", nome: "Bacalhau Demolhado", unidade: "KG", preco: 14.50 },
    // PEIXES - Peixe Branco
    { familia: "PEI", subfamilia: "Peixe Branco", nome: "Robalo", unidade: "KG", preco: 16.80 },
    { familia: "PEI", subfamilia: "Peixe Branco", nome: "Dourada", unidade: "KG", preco: 15.50 },
    { familia: "PEI", subfamilia: "Peixe Branco", nome: "Pescada", unidade: "KG", preco: 12.30 },
    { familia: "PEI", subfamilia: "Peixe Branco", nome: "Linguado", unidade: "KG", preco: 18.90 },
    // PEIXES - Peixe Azul
    { familia: "PEI", subfamilia: "Peixe Azul", nome: "Salmão", unidade: "KG", preco: 14.90 },
    { familia: "PEI", subfamilia: "Peixe Azul", nome: "Atum", unidade: "KG", preco: 19.50 },
    { familia: "PEI", subfamilia: "Peixe Azul", nome: "Sardinha", unidade: "KG", preco: 4.80 },
    { familia: "PEI", subfamilia: "Peixe Azul", nome: "Cavala", unidade: "KG", preco: 5.20 },
    // PEIXES - Marisco
    { familia: "PEI", subfamilia: "Marisco", nome: "Camarão", unidade: "KG", preco: 18.50 },
    { familia: "PEI", subfamilia: "Marisco", nome: "Ameijoas", unidade: "KG", preco: 8.90 },
    { familia: "PEI", subfamilia: "Marisco", nome: "Mexilhão", unidade: "KG", preco: 6.50 },
    { familia: "PEI", subfamilia: "Marisco", nome: "Polvo", unidade: "KG", preco: 16.80 },
    { familia: "PEI", subfamilia: "Marisco", nome: "Lulas", unidade: "KG", preco: 12.50 },

    // LEGUMES - Raízes
    { familia: "LEG", subfamilia: "Raízes", nome: "Batata", unidade: "KG", preco: 0.85 },
    { familia: "LEG", subfamilia: "Raízes", nome: "Cenoura", unidade: "KG", preco: 0.95 },
    { familia: "LEG", subfamilia: "Raízes", nome: "Cebola", unidade: "KG", preco: 0.75 },
    { familia: "LEG", subfamilia: "Raízes", nome: "Alho", unidade: "KG", preco: 6.50 },
    { familia: "LEG", subfamilia: "Raízes", nome: "Beterraba", unidade: "KG", preco: 1.20 },
    // LEGUMES - Folhas
    { familia: "LEG", subfamilia: "Folhas", nome: "Alface", unidade: "Unidade", preco: 0.80 },
    { familia: "LEG", subfamilia: "Folhas", nome: "Espinafre", unidade: "KG", preco: 3.20 },
    { familia: "LEG", subfamilia: "Folhas", nome: "Couve", unidade: "KG", preco: 1.50 },
    { familia: "LEG", subfamilia: "Folhas", nome: "Rúcula", unidade: "KG", preco: 4.50 },
    // LEGUMES - Frutas-Legume
    { familia: "LEG", subfamilia: "Frutas-Legume", nome: "Tomate", unidade: "KG", preco: 1.80 },
    { familia: "LEG", subfamilia: "Frutas-Legume", nome: "Pimento", unidade: "KG", preco: 2.20 },
    { familia: "LEG", subfamilia: "Frutas-Legume", nome: "Beringela", unidade: "KG", preco: 1.95 },
    { familia: "LEG", subfamilia: "Frutas-Legume", nome: "Abobrinha", unidade: "KG", preco: 1.60 },
    { familia: "LEG", subfamilia: "Frutas-Legume", nome: "Abóbora", unidade: "KG", preco: 1.20 },
    // LEGUMES - Vagens
    { familia: "LEG", subfamilia: "Vagens", nome: "Ervilha", unidade: "KG", preco: 3.50 },
    { familia: "LEG", subfamilia: "Vagens", nome: "Feijão Verde", unidade: "KG", preco: 2.80 },
    { familia: "LEG", subfamilia: "Vagens", nome: "Grão-de-Bico", unidade: "KG", preco: 2.50 },
    { familia: "LEG", subfamilia: "Vagens", nome: "Feijão Preto", unidade: "KG", preco: 2.20 },

    // LATICÍNIOS - Leite
    { familia: "LAT", subfamilia: "Leite", nome: "Leite Integral", unidade: "L", preco: 0.95 },
    { familia: "LAT", subfamilia: "Leite", nome: "Leite Desnatado", unidade: "L", preco: 0.98 },
    { familia: "LAT", subfamilia: "Leite", nome: "Nata", unidade: "L", preco: 3.50 },
    // LATICÍNIOS - Queijo
    { familia: "LAT", subfamilia: "Queijo", nome: "Queijo Mussarela", unidade: "KG", preco: 8.50 },
    { familia: "LAT", subfamilia: "Queijo", nome: "Queijo Parmesão", unidade: "KG", preco: 15.80 },
    { familia: "LAT", subfamilia: "Queijo", nome: "Queijo Serra da Estrela", unidade: "KG", preco: 22.50 },
    { familia: "LAT", subfamilia: "Queijo", nome: "Queijo Fresco", unidade: "KG", preco: 6.20 },
    { familia: "LAT", subfamilia: "Queijo", nome: "Requeijão", unidade: "KG", preco: 5.80 },
    // LATICÍNIOS - Iogurte
    { familia: "LAT", subfamilia: "Iogurte", nome: "Iogurte Natural", unidade: "L", preco: 2.50 },
    { familia: "LAT", subfamilia: "Iogurte", nome: "Iogurte Grego", unidade: "KG", preco: 4.80 },
    // LATICÍNIOS - Manteiga
    { familia: "LAT", subfamilia: "Manteiga", nome: "Manteiga Com Sal", unidade: "KG", preco: 7.50 },
    { familia: "LAT", subfamilia: "Manteiga", nome: "Manteiga Sem Sal", unidade: "KG", preco: 7.80 },

    // DESPENSA - Grãos
    { familia: "DES", subfamilia: "Grãos", nome: "Arroz", unidade: "KG", preco: 1.20 },
    { familia: "DES", subfamilia: "Grãos", nome: "Massa", unidade: "KG", preco: 1.50 },
    { familia: "DES", subfamilia: "Grãos", nome: "Farinha de Trigo", unidade: "KG", preco: 0.85 },
    { familia: "DES", subfamilia: "Grãos", nome: "Aveia", unidade: "KG", preco: 2.20 },
    // DESPENSA - Óleos
    { familia: "DES", subfamilia: "Óleos", nome: "Azeite", unidade: "L", preco: 8.50 },
    { familia: "DES", subfamilia: "Óleos", nome: "Óleo Vegetal", unidade: "L", preco: 2.80 },
    // DESPENSA - Condimentos
    { familia: "DES", subfamilia: "Condimentos", nome: "Sal", unidade: "KG", preco: 0.60 },
    { familia: "DES", subfamilia: "Condimentos", nome: "Pimenta Preta", unidade: "KG", preco: 12.50 },
    { familia: "DES", subfamilia: "Condimentos", nome: "Açúcar", unidade: "KG", preco: 0.95 },
    { familia: "DES", subfamilia: "Condimentos", nome: "Vinagre", unidade: "L", preco: 1.20 },
    // DESPENSA - Molhos
    { familia: "DES", subfamilia: "Molhos", nome: "Molho de Tomate", unidade: "KG", preco: 1.80 },
    { familia: "DES", subfamilia: "Molhos", nome: "Mostarda", unidade: "KG", preco: 3.50 },
    { familia: "DES", subfamilia: "Molhos", nome: "Ketchup", unidade: "KG", preco: 2.80 },
    { familia: "DES", subfamilia: "Molhos", nome: "Maionese", unidade: "KG", preco: 4.20 },

    // BEBIDAS - Refrigerantes
    { familia: "BEB", subfamilia: "Refrigerantes", nome: "Coca-Cola", unidade: "L", preco: 1.50 },
    { familia: "BEB", subfamilia: "Refrigerantes", nome: "Sprite", unidade: "L", preco: 1.50 },
    { familia: "BEB", subfamilia: "Refrigerantes", nome: "Fanta", unidade: "L", preco: 1.50 },
    // BEBIDAS - Sumos
    { familia: "BEB", subfamilia: "Sumos", nome: "Sumo de Laranja", unidade: "L", preco: 2.80 },
    { familia: "BEB", subfamilia: "Sumos", nome: "Sumo de Maçã", unidade: "L", preco: 2.50 },
    // BEBIDAS - Águas
    { familia: "BEB", subfamilia: "Águas", nome: "Água Mineral", unidade: "L", preco: 0.50 },
    { familia: "BEB", subfamilia: "Águas", nome: "Água com Gás", unidade: "L", preco: 0.65 },
    // BEBIDAS - Vinhos
    { familia: "BEB", subfamilia: "Vinhos", nome: "Vinho Tinto", unidade: "L", preco: 7.50 },
    { familia: "BEB", subfamilia: "Vinhos", nome: "Vinho Branco", unidade: "L", preco: 6.80 },
    { familia: "BEB", subfamilia: "Vinhos", nome: "Vinho Verde", unidade: "L", preco: 5.50 },
    // BEBIDAS - Cervejas
    { familia: "BEB", subfamilia: "Cervejas", nome: "Cerveja Super Bock", unidade: "L", preco: 1.20 },
    { familia: "BEB", subfamilia: "Cervejas", nome: "Cerveja Sagres", unidade: "L", preco: 1.20 },
];

async function main() {
    console.log('🚀 Starting product seed...\n');

    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error('❌ No tenant found! Please create a tenant first.');
        return;
    }

    console.log(`✓ Using tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    // Track sequence numbers for each subfamilia
    const sequenceCounters: Record<string, number> = {};

    for (const produtoData of produtosData) {
        try {
            // Find or create familia
            let familia = await prisma.familia.findFirst({
                where: {
                    tenant_id: tenant.id,
                    codigo: produtoData.familia,
                },
            });

            if (!familia) {
                const familiaNames: Record<string, string> = {
                    'CAR': 'Carnes',
                    'PEI': 'Peixes e Mariscos',
                    'LEG': 'Legumes e Vegetais',
                    'LAT': 'Laticínios',
                    'DES': 'Despensa',
                    'BEB': 'Bebidas',
                };

                familia = await prisma.familia.create({
                    data: {
                        tenant_id: tenant.id,
                        codigo: produtoData.familia,
                        nome: familiaNames[produtoData.familia] || produtoData.familia,
                    },
                });
                console.log(`  ➕ Created familia: ${familia.nome}`);
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
                subfamilia = await prisma.subfamilia.create({
                    data: {
                        tenant_id: tenant.id,
                        familia_id: familia.id,
                        nome: produtoData.subfamilia,
                    },
                });
                console.log(`    ➕ Created subfamilia: ${produtoData.subfamilia}`);
            }

            // Generate codigo no formato FAM-SUB-SEQ
            const subfamiliaCodigo = subfamiliaCodigos[produtoData.subfamilia] || 'XXX';
            const subfamiliaKey = `${produtoData.familia}-${subfamiliaCodigo}`;

            if (!sequenceCounters[subfamiliaKey]) {
                sequenceCounters[subfamiliaKey] = 1;
            }

            const sequencia = String(sequenceCounters[subfamiliaKey]).padStart(3, '0');
            const codigoProduto = `${produtoData.familia}-${subfamiliaCodigo}-${sequencia}`;
            sequenceCounters[subfamiliaKey]++;

            // Check if product already exists
            const existing = await prisma.produto.findFirst({
                where: {
                    tenant_id: tenant.id,
                    codigo_interno: codigoProduto,
                },
            });

            if (existing) {
                console.log(`  ⊘ Skipped: ${produtoData.nome} (${codigoProduto}) - already exists`);
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
                    codigo_interno: codigoProduto,
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

            console.log(`  ✓ Created: ${produtoData.nome} (${codigoProduto}) - €${produtoData.preco}/${produtoData.unidade}`);
            created++;

        } catch (error: any) {
            console.error(`  ✗ Error creating ${produtoData.nome}: ${error.message}`);
            errors++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Seed Summary:');
    console.log(`  ✓ Created: ${created} products`);
    console.log(`  ⊘ Skipped: ${skipped} products (already exist)`);
    console.log(`  ✗ Errors: ${errors} products`);
    console.log('='.repeat(60));
    console.log('\n✨ Product seed completed!\n');
}

main()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
