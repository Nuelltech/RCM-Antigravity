
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    console.log('🔍 Checking Structural Cost Data...');

    const tenants = await prisma.tenant.findMany({
        select: { id: true, nome_restaurante: true }
    });

    for (const tenant of tenants) {
        console.log(`\n🏢 Tenant: ${tenant.nome_restaurante} (${tenant.id})`);

        // Check CustoEstrutura (The list user sees in Settings)
        const costs = await prisma.custoEstrutura.findMany({
            where: { tenant_id: tenant.id }
        });
        console.log(`   📋 CustoEstrutura count: ${costs.length}`);
        costs.forEach(c => {
            console.log(`      - ${c.descricao}: €${c.valor_mensal} (${c.classificacao}) - Ativo: ${c.ativo}`);
        });

        // Check CustoEstruturaHistorico (The data used for Dashboard)
        const history = await prisma.custoEstruturaHistorico.findMany({
            where: { tenant_id: tenant.id },
            orderBy: { data_inicio: 'desc' }
        });
        console.log(`   📜 CustoEstruturaHistorico count: ${history.length}`);

        if (history.length === 0 && costs.length > 0) {
            console.error(`   ⚠️  MISMATCH: Costs exist but no history records found! Dashboard will show 0.`);
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Simulate Dashboard Logic
        const activeHistory = history.filter(h => {
            const startDate = new Date(h.data_inicio);
            const endDate = h.data_fim ? new Date(h.data_fim) : null;
            // Simple overlap check for current month
            return startDate <= now && (!endDate || endDate >= startOfMonth);
        });

        console.log(`   ✅ Active History for Current Month: ${activeHistory.length}`);
        const total = activeHistory.reduce((sum, h) => sum + Number(h.valor), 0);
        console.log(`   💰 Calculated Monthly Total: €${total.toFixed(2)}`);
    }
}

checkData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
