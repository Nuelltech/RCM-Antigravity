import { prisma } from '../src/core/database';

async function main() {
    console.log('🔍 Inspecting Structural Costs and History...');

    const costs = await prisma.custoEstrutura.findMany({
        include: {
            historico: {
                orderBy: { data_inicio: 'desc' }
            }
        }
    });

    console.log(`Found ${costs.length} cost items.`);
    console.log('-'.repeat(50));

    for (const cost of costs) {
        console.log(`[${cost.id}] ${cost.descricao} | €${cost.valor_mensal} | Ativo: ${cost.ativo}`);

        if (cost.historico.length === 0) {
            console.log('   ⚠️ NO HISTORY RECORDS FOUND!');
        } else {
            for (const h of cost.historico) {
                console.log(`   - Hist [#${h.id}]: €${h.valor} | Início: ${h.data_inicio.toISOString()} | Fim: ${h.data_fim ? h.data_fim.toISOString() : 'PRESENT'}`);
            }
        }
        console.log('-'.repeat(50));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
