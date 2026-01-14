import { prisma } from '../core/database';

/**
 * Script to check actual menu categories in the database
 */

async function checkMenuCategories() {
    console.log('🔍 Checking menu categories...\n');

    try {
        // Get all menu items with their categories
        const menuItems = await prisma.menuItem.findMany({
            select: {
                id: true,
                nome_comercial: true,
                categoria_menu: true,
                receita_id: true,
                combo_id: true,
                formato_venda_id: true,
            },
            take: 100, // Limit to avoid too much output
        });

        console.log(`Found ${menuItems.length} menu items\n`);

        // Group by category
        const categoryGroups = new Map<string, number>();
        const comboItems: any[] = [];
        const receitaItems: any[] = [];
        const formatoItems: any[] = [];

        menuItems.forEach(item => {
            const cat = item.categoria_menu || 'NULL';
            categoryGroups.set(cat, (categoryGroups.get(cat) || 0) + 1);

            if (item.combo_id) {
                comboItems.push(item);
            } else if (item.receita_id) {
                receitaItems.push(item);
            } else if (item.formato_venda_id) {
                formatoItems.push(item);
            }
        });

        console.log('📊 Categories found:');
        console.log('='.repeat(60));
        Array.from(categoryGroups.entries())
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, count]) => {
                console.log(`  ${cat}: ${count} items`);
            });

        console.log('\n📦 Item types:');
        console.log('='.repeat(60));
        console.log(`  Combos: ${comboItems.length}`);
        console.log(`  Receitas: ${receitaItems.length}`);
        console.log(`  Formatos de Venda: ${formatoItems.length}`);

        if (comboItems.length > 0) {
            console.log('\n🍱 Sample combos:');
            comboItems.slice(0, 5).forEach(item => {
                console.log(`  - ${item.nome_comercial} (categoria: ${item.categoria_menu || 'NULL'})`);
            });
        }

        console.log('\n✅ Analysis complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMenuCategories();
