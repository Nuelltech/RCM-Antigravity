import { prisma } from '../src/core/database';
import { recalculationService } from '../src/modules/produtos/recalculation.service';
import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

async function checkDatabase() {
    try {
        console.log("Connecting to the database via Prisma...");
        const produtoId = 79;
        
        console.log("\n--- PRODUTo E VARIACOES (Produto 79) ---");
        const produto = await prisma.produto.findUnique({
            where: { id: produtoId },
            include: {
                variacoes: {
                    orderBy: [
                        { data_ultima_compra: 'desc' },
                        { id: 'desc' }
                    ],
                    take: 5
                }
            }
        });
        
        console.log(`Produto: ${produto?.nome}`);
        produto?.variacoes.forEach(v => {
            console.log(`  - Variacao ${v.id}: Unitario=${v.preco_unitario}, Compra=${v.preco_compra}, Ativo=${v.ativo}, Data=${v.data_ultima_compra}`);
        });
        
        console.log("\n--- FORMATOS VENDA (Produto 79) ---");
        const formatos = await prisma.formatoVenda.findMany({
            where: { produto_id: produtoId }
        });
        
        formatos.forEach(f => {
            console.log(`  - Formato ${f.id}: Nome='${f.nome}', Qtd=${f.quantidade_vendida}${f.unidade_medida}, CustoUnit=${f.custo_unitario}, Ativo=${f.ativo}`);
        });

        if (formatos.length > 0) {
            const formatoIds = formatos.map(f => f.id);
            const menuItems = await prisma.menuItem.findMany({
                where: { formato_venda_id: { in: formatoIds } }
            });
            
            console.log(`\n--- MENU ITEMS (Formats ${formatoIds.join(', ')}) ---`);
            menuItems.forEach(mi => {
                console.log(`  - Menu ${mi.id}: Nome='${mi.nome_comercial}', Ativo=${mi.ativo}, FormatoId=${mi.formato_venda_id}, Margem=${mi.margem_percentual}%, CMV=${mi.cmv_percentual}%`);
            });
        }
        
    } catch (e) {
        console.error("Error connecting or querying:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
