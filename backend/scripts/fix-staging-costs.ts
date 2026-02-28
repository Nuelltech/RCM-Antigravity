
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCosts() {
    console.log('🛠️ Fixing Missing Cost History...');

    const costs = await prisma.custoEstrutura.findMany({
        include: { historico: true }
    });

    console.log(`Found ${costs.length} cost records.`);

    let fixedCount = 0;

    for (const cost of costs) {
        if (cost.historico.length === 0) {
            console.log(`Fixing cost: ${cost.descricao} (€${cost.valor_mensal})`);

            // Set start date to Jan 1st 2024 to ensure it covers current and past periods
            const startDate = new Date('2024-01-01');

            await prisma.custoEstruturaHistorico.create({
                data: {
                    tenant_id: cost.tenant_id,
                    custo_estrutura_id: cost.id,
                    valor: cost.valor_mensal,
                    data_inicio: startDate,
                    data_fim: null, // Null means it's the current active cost
                    motivo_mudanca: 'Auto-fix: Missing history record',
                    criado_por: 1 // Assuming generic admin user or system
                }
            });
            fixedCount++;
        }
    }

    console.log(`\n✅ Fixed ${fixedCount} costs. Dashboard should now show values.`);
}

fixCosts()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
