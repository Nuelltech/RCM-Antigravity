import { prisma } from '../src/core/database';

async function diagnoseAlerts() {
    console.log('=== DIAGNÓSTICO DE ALERTAS ===\n');

    // Get tenant ID (assuming first tenant for now)
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.log('❌ Nenhum tenant encontrado');
        return;
    }

    console.log(`✅ Tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})\n`);

    // Get alert thresholds
    const settings = await prisma.dadosRestaurante.findUnique({
        where: { tenant_id: tenant.id }
    });

    const cmvWarning = Number(settings?.cmv_alerta_amarelo || 30);
    const cmvHigh = Number(settings?.cmv_alerta_vermelho || 35);

    console.log(`📊 Thresholds: Warning=${cmvWarning}%, High=${cmvHigh}%\n`);

    // Get all menu items with CMV
    const menuItems = await prisma.menuItem.findMany({
        where: { tenant_id: tenant.id, ativo: true },
        select: {
            id: true,
            nome_comercial: true,
            cmv_percentual: true,
            receita_id: true,
            combo_id: true,
            formato_venda_id: true
        },
        orderBy: { cmv_percentual: 'desc' }
    });

    console.log(`📋 Total de itens no menu: ${menuItems.length}\n`);
    console.log('Itens com CMV >= 30%:');
    console.log('─'.repeat(80));

    for (const item of menuItems) {
        const cmv = Number(item.cmv_percentual || 0);
        if (cmv >= cmvWarning) {
            const type = item.receita_id ? 'Receita' : item.combo_id ? 'Combo' : 'Produto';
            const severity = cmv >= cmvHigh ? '🔴 HIGH' : '🟡 WARNING';
            console.log(`${severity} | ${item.nome_comercial.padEnd(50)} | CMV: ${cmv.toFixed(1)}% | ${type}`);
        }
    }

    // Check for existing alerts
    console.log('\n\n🔔 Alertas existentes (não arquivados):');
    console.log('─'.repeat(80));

    const alerts = await prisma.alertaAi.findMany({
        where: {
            tenant_id: tenant.id,
            tipo_alerta: 'cmv',
            arquivado: false
        },
        orderBy: { createdAt: 'desc' }
    });

    for (const alert of alerts) {
        const status = alert.lido ? '✓ Lido' : '✗ Não lido';
        console.log(`${status} | ${alert.titulo.padEnd(50)} | ${alert.mensagem}`);
    }

    console.log(`\n📊 Total de alertas CMV ativos: ${alerts.length}`);

    // Check for archived alerts
    const archivedAlerts = await prisma.alertaAi.findMany({
        where: {
            tenant_id: tenant.id,
            tipo_alerta: 'cmv',
            arquivado: true
        }
    });

    console.log(`📦 Total de alertas CMV arquivados: ${archivedAlerts.length}`);

    // Find items that should have alerts but don't
    console.log('\n\n⚠️  Itens com CMV alto SEM alerta:');
    console.log('─'.repeat(80));

    for (const item of menuItems) {
        const cmv = Number(item.cmv_percentual || 0);
        if (cmv >= cmvWarning) {
            const hasAlert = alerts.some(a => a.entidade_id === item.id.toString());
            if (!hasAlert) {
                console.log(`❌ ${item.nome_comercial} | CMV: ${cmv.toFixed(1)}% | ID: ${item.id}`);
            }
        }
    }

    await prisma.$disconnect();
}

diagnoseAlerts().catch(console.error);
