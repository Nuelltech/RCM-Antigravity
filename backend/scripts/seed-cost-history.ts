import { prisma } from '../src/core/database';
import { Decimal } from '@prisma/client/runtime/library';

async function main() {
    console.log('🌱 Seeding structural cost history...');

    const costs = await prisma.custoEstrutura.findMany({
        include: {
            historico: true
        }
    });

    console.log(`Found ${costs.length} cost items.`);

    let updated = 0;

    for (const cost of costs) {
        if (cost.historico.length === 0) {
            console.log(`Creating initial history for: ${cost.descricao} (${cost.valor_mensal}€)`);

            await prisma.custoEstruturaHistorico.create({
                data: {
                    tenant_id: cost.tenant_id,
                    custo_estrutura_id: cost.id,
                    valor: cost.valor_mensal,
                    data_inicio: cost.createdAt, // Assume valid since creation
                    motivo_mudanca: 'Migração Inicial'
                }
            });
            updated++;
        }
    }

    console.log(`✅ Finished! Created history for ${updated} items.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
