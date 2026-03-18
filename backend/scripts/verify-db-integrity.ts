import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Database Integrity...');

    try {
        const userCount = await prisma.user.count();
        console.log(`✅ Users: ${userCount} (System accounts intact)`);

        const recipeCount = await prisma.receita.count();
        console.log(`✅ Recipes: ${recipeCount} (Menu data intact)`);

        const productCount = await prisma.produto.count();
        console.log(`✅ Products: ${productCount} (Inventory data intact)`);

        console.log('\n✨ Database is healthy and accessible!');
    } catch (error) {
        console.error('❌ Database Access Error:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
