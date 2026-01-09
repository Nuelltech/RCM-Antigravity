
import { RecipeService } from '../modules/receitas/receitas.module';
import { prisma } from '../core/database';

async function main() {
    const tenantId = 1; // Default dev tenant
    const service = new RecipeService(tenantId);

    console.log('--- Listing Recipes ---');
    const list = await service.list({ limit: 5 });
    console.log(`Found ${list.meta.total} recipes.`);

    if (list.data.length === 0) {
        console.log('No recipes found.');
        return;
    }

    // Pick a recipe that has ingredients if possible
    let targetRecipeId = list.data[0].id;
    for (const r of list.data) {
        // @ts-ignore
        if (r._count?.ingredientes > 0) {
            targetRecipeId = r.id;
            break;
        }
    }

    console.log(`--- Inspecting Recipe ID: ${targetRecipeId} ---`);
    try {
        const recipe = await service.getById(targetRecipeId);
        console.log('Recipe Name:', recipe.nome);
        console.log('Ingredients Count:', recipe.ingredientes.length);
        console.log('First Ingredient:', JSON.stringify(recipe.ingredientes[0], null, 2));

        // Check for specific fields expected by frontend
        if (recipe.ingredientes.length > 0) {
            const ing = recipe.ingredientes[0];
            console.log('Field Check:');
            console.log(' - produto_id:', ing.produto_id);
            console.log(' - receita_preparo_id:', ing.receita_preparo_id);
            // @ts-ignore
            console.log(' - produto (relation):', ing.produto ? 'Present' : 'Missing');
            // @ts-ignore
            console.log(' - receitaPreparo (relation):', ing.receitaPreparo ? 'Present' : 'Missing');
        }

    } catch (error) {
        console.error('Error fetching recipe:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
