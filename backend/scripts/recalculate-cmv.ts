import { prisma } from '../src/core/database';
import { Decimal } from '@prisma/client/runtime/library';

async function recalculateCMV() {
    console.log('🔄 Recalculando CMV para todos os itens do menu...\n');

    const menuItems = await prisma.menuItem.findMany({
        include: {
            receita: {
                select: {
                    custo_por_porcao: true
                }
            },
            combo: {
                select: {
                    custo_total: true
                }
            },
            formatoVenda: {
                select: {
                    custo_unitario: true
                }
            }
        }
    });

    let updated = 0;
    let skipped = 0;

    for (const item of menuItems) {
        const pvp = Number(item.pvp);
        let custo = 0;

        if (item.receita_id && item.receita) {
            custo = Number(item.receita.custo_por_porcao);
        } else if (item.combo_id && item.combo) {
            custo = Number(item.combo.custo_total);
        } else if (item.formato_venda_id && item.formatoVenda) {
            custo = Number(item.formatoVenda.custo_unitario);
        }

        if (pvp === 0) {
            console.log(`⚠️  ${item.nome_comercial}: PVP = 0, pulando...`);
            skipped++;
            continue;
        }

        const cmv = (custo / pvp) * 100;

        await prisma.menuItem.update({
            where: { id: item.id },
            data: {
                cmv_percentual: new Decimal(cmv.toFixed(2))
            }
        });

        console.log(`✅ ${item.nome_comercial}: CMV = ${cmv.toFixed(2)}% (Custo: €${custo.toFixed(2)}, PVP: €${pvp.toFixed(2)})`);
        updated++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Atualizados: ${updated}`);
    console.log(`   ⚠️  Pulados: ${skipped}`);
    console.log(`   📝 Total: ${menuItems.length}`);
}

recalculateCMV()
    .then(() => {
        console.log('\n✅ Concluído!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erro:', error);
        process.exit(1);
    });
