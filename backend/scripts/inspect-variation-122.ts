
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Product 65 (Arroz) ---');

    // 1. Fetch ALL variations for Product 65, ignoring 'ativo' status
    const allVariations = await prisma.variacaoProduto.findMany({
        where: {
            produto_id: 65
        },
        include: {
            template: true
        }
    });

    console.log(`Found ${allVariations.length} total variations for Product 65.`);
    allVariations.forEach(v => {
        console.log(`- ID: ${v.id} | Name: ${v.tipo_unidade_compra} | Price: ${v.preco_compra} | Active: ${v.ativo} | Template: ${v.template?.nome}`);
    });

    // 2. Specifically check Variation 122 (found in your SQL dump)
    console.log('\n--- Inspecting Variation 122 ---');
    const var122 = await prisma.variacaoProduto.findUnique({
        where: { id: 122 },
        include: {
            template: true,
            produto: true
        }
    });

    if (var122) {
        console.log('Variation 122 FOUND:');
        console.log(JSON.stringify(var122, null, 2));
    } else {
        console.log('Variation 122 NOT FOUND in database via Prisma.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
