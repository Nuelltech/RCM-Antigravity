
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIntegrity() {
    try {
        console.log('Checking Menu Item integrity...');
        const menuItems = await prisma.menuItem.findMany({
            include: {
                receita: true,
                combo: true,
                formatoVenda: true
            }
        });

        console.log(`Scanned ${menuItems.length} menu items.`);
        let issues = 0;

        for (const item of menuItems) {
            if (item.receita_id && !item.receita) {
                console.error(`[ISSUE] Item '${item.nome_comercial}' (ID: ${item.id}) points to Receita ID ${item.receita_id}, but it was not found.`);
                issues++;
            }
            if (item.combo_id && !item.combo) {
                console.error(`[ISSUE] Item '${item.nome_comercial}' (ID: ${item.id}) points to Combo ID ${item.combo_id}, but it was not found.`);
                issues++;
            }
            if (item.formato_venda_id && !item.formatoVenda) {
                console.error(`[ISSUE] Item '${item.nome_comercial}' (ID: ${item.id}) points to FormatoVenda ID ${item.formato_venda_id}, but it was not found.`);
                issues++;
            }
        }

        if (issues === 0) {
            console.log('✅ No data integrity issues found (no orphaned relations).');
        } else {
            console.log(`❌ Found ${issues} integrity issues.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkIntegrity();
