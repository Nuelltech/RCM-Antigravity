
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for any variation with price 8.90...');
    const variations = await prisma.variacaoProduto.findMany({
        where: {
            preco_compra: 8.90
        },
        include: {
            produto: true,
            template: true
        }
    });

    console.log(`Found ${variations.length} variations with price 8.90:`);
    console.log(JSON.stringify(variations, null, 2));

    console.log('\nSearching for variations with "5 kg" in tipo_unidade_compra...');
    const variationsByName = await prisma.variacaoProduto.findMany({
        where: {
            tipo_unidade_compra: { contains: '5 kg' }
        },
        include: {
            produto: true
        }
    });
    console.log(`Found ${variationsByName.length} variations with "5 kg" in name.`);
    if (variationsByName.length > 0) {
        console.log(JSON.stringify(variationsByName[0], null, 2)); // Just show first one
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
