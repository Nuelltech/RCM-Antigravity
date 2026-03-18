import { Worker, Job } from 'bullmq';
import { redisOptions } from '../core/redis';
import { env } from '../core/env';
import { prisma } from '../core/database';
import { subDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

const WORKER_NAME = 'AlertsProcessor';

export interface AlertsJobData {
    tenantId: number;
    userId?: number;
    forceRecalculation?: boolean;
}

const worker = new Worker<AlertsJobData>(
    'alerts-processing',
    async (job: Job<AlertsJobData>) => {
        const { tenantId, userId, forceRecalculation } = job.data;
        console.log(`[${WORKER_NAME}] 🔔 Começando processamento de alertas para o tenant ${tenantId}...`);

        try {
            await processAlerts(tenantId);
            console.log(`[${WORKER_NAME}] ✅ Concluído processamento de alertas para o tenant ${tenantId}.`);
            return { success: true };
        } catch (error) {
            console.error(`[${WORKER_NAME}] ❌ Falhou a processar alertas do tenant ${tenantId}:`, error);
            throw error;
        }
    },
    {
        connection: redisOptions,
        concurrency: 2,
    }
);

worker.on('ready', () => {
    console.log(`[${WORKER_NAME}] Worker started (concurrency: 2)`);
});

worker.on('error', err => {
    console.error(`[${WORKER_NAME}] Error:`, err);
});

async function processAlerts(tenantId: number) {
    const validAlertIds = new Set<number>();

    // 1. Get thresholds or create defaults
    let settings = await prisma.dadosRestaurante.findUnique({
        where: { tenant_id: tenantId }
    });

    if (!settings) {
        settings = await prisma.dadosRestaurante.create({
            data: {
                tenant_id: tenantId,
                numero_lugares: 0,
                dias_trabalho_semana: new Decimal(5),
                horas_trabalho_dia: new Decimal(8),
                cmv_alerta_amarelo: new Decimal(30),
                cmv_alerta_vermelho: new Decimal(35),
                alerta_aumento_custo_leve: new Decimal(5),
                alerta_aumento_custo_medio: new Decimal(10),
                alerta_aumento_custo_grave: new Decimal(15),
                alerta_inatividade_leve: 3,
                alerta_inatividade_medio: 6,
                alerta_inatividade_grave: 10,
                dias_alerta_preco_estagnado: 30
            }
        });
    }

    const cmvWarning = Number(settings.cmv_alerta_amarelo);
    const cmvHigh = Number(settings.cmv_alerta_vermelho);
    const costIncreaseLow = Number(settings.alerta_aumento_custo_leve);
    const costIncreaseMed = Number(settings.alerta_aumento_custo_medio);
    const costIncreaseHigh = Number(settings.alerta_aumento_custo_grave);
    const inactivityMed = settings.alerta_inatividade_medio;
    const inactivityHigh = settings.alerta_inatividade_grave;
    const stalePriceDays = settings.dias_alerta_preco_estagnado || 30;

    // 2. CMV Alerts
    const menuItems = await prisma.menuItem.findMany({
        where: { tenant_id: tenantId, ativo: true },
        select: { id: true, nome_comercial: true, cmv_percentual: true }
    });

    for (const item of menuItems) {
        const cmv = Number(item.cmv_percentual || 0);
        if (cmv === 0) continue;

        let severity = '';
        let message = '';

        if (cmv >= cmvHigh) {
            severity = 'high';
            message = `CMV muito alto (${cmv.toFixed(1)}%). Meta: <${cmvWarning}%`;
        } else if (cmv >= cmvWarning) {
            severity = 'warning';
            message = `CMV elevado (${cmv.toFixed(1)}%). Atenção necessária.`;
        }

        if (severity) {
            await upsertAlert(tenantId, {
                tipo_alerta: 'cmv',
                titulo: item.nome_comercial,
                mensagem: message,
                severidade: severity,
                entidade_tipo: 'MenuItem',
                entidade_id: item.id.toString(),
                dados_contexto: { value: cmv, threshold: severity === 'high' ? cmvHigh : cmvWarning }
            }, validAlertIds);
        }
    }

    // 3. Cost Increase Alerts (FIX: Ignora primeiros precos na plataforma / old_price null - ou neste caso a logica existente ajustada para a variacao de % apenas onde ha mudanca real)
    // Para resolver os alertas 100% dos novos produtos. Vamos buscar registos que representem de facto MUDANCA de preço e não criação.
    // Filtrar onde preco_antigo_unidade > 0 OU se não existir isso no schema baseamo-nos no comment do bug.
    const recentChanges = await prisma.historicoPreco.findMany({
        where: {
            tenant_id: tenantId,
            data_mudanca: { gte: subDays(new Date(), 30) },
            percentual_mudanca: { gt: 0 },
            // THE FIX: ignore new product first price entries (preco_unitario_anterior = 0 means it's a new product)
            preco_unitario_anterior: { gt: 0 }
        },
        include: { variacao: { include: { produto: true } } },
        orderBy: { data_mudanca: 'desc' },
        take: 20
    });

    for (const change of recentChanges) {
        const percent = Number(change.percentual_mudanca);
        const productName = change.variacao.produto.nome;
        let severity = '';
        let message = '';

        if (percent >= costIncreaseHigh) {
            severity = 'high';
            message = `Aumento grave de custo: +${percent.toFixed(1)}%`;
        } else if (percent >= costIncreaseMed) {
            severity = 'warning';
            message = `Aumento considerável de custo: +${percent.toFixed(1)}%`;
        } else if (percent >= costIncreaseLow) {
            severity = 'info';
            message = `Ligeiro aumento de custo: +${percent.toFixed(1)}%`;
        }

        if (severity) {
            await upsertAlert(tenantId, {
                tipo_alerta: 'cost_increase',
                titulo: productName,
                mensagem: message,
                severidade: severity,
                entidade_tipo: 'HistoricoPreco',
                entidade_id: change.id.toString(),
                dados_contexto: { value: percent, threshold: costIncreaseLow }
            }, validAlertIds);
        }
    }

    // 4. Inactivity Alerts
    const lastSale = await prisma.venda.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { data_venda: 'desc' }
    });

    const lastPurchase = await prisma.compra.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { data_compra: 'desc' }
    });

    const now = new Date();

    if (lastSale) {
        const daysSinceSale = Math.floor((now.getTime() - lastSale.data_venda.getTime()) / (1000 * 60 * 60 * 24));
        let severity = '';

        if (daysSinceSale >= inactivityHigh) severity = 'high';
        else if (daysSinceSale >= inactivityMed) severity = 'warning';

        if (severity) {
            await upsertAlert(tenantId, {
                tipo_alerta: 'inactivity',
                titulo: 'Vendas',
                mensagem: `Sem vendas registadas há ${daysSinceSale} dias.`,
                severidade: severity,
                entidade_tipo: 'Venda',
                entidade_id: lastSale.id.toString(),
                dados_contexto: { value: daysSinceSale, threshold: inactivityMed }
            }, validAlertIds);
        }
    }

    if (lastPurchase) {
        const daysSincePurchase = Math.floor((now.getTime() - lastPurchase.data_compra.getTime()) / (1000 * 60 * 60 * 24));
        let severity = '';

        if (daysSincePurchase >= inactivityHigh) severity = 'high';
        else if (daysSincePurchase >= inactivityMed) severity = 'warning';

        if (severity) {
            await upsertAlert(tenantId, {
                tipo_alerta: 'inactivity',
                titulo: 'Compras',
                mensagem: `Sem compras registadas há ${daysSincePurchase} dias.`,
                severidade: severity,
                entidade_tipo: 'Compra',
                entidade_id: lastPurchase.id.toString(),
                dados_contexto: { value: daysSincePurchase, threshold: inactivityMed }
            }, validAlertIds);
        }
    }

    // 5. Stale Price Alerts
    const activeProductIds = new Set<number>();

    const recipeIngredients = await prisma.ingredienteReceita.findMany({
        where: { tenant_id: tenantId, produto_id: { not: null } },
        select: { produto_id: true }
    });
    recipeIngredients.forEach((i: any) => i.produto_id && activeProductIds.add(i.produto_id));

    const comboItems = await prisma.comboItem.findMany({
        where: { tenant_id: tenantId, produto_id: { not: null } },
        select: { produto_id: true }
    });
    comboItems.forEach((i: any) => i.produto_id && activeProductIds.add(i.produto_id));

    const menuFormats = await prisma.menuItem.findMany({
        where: { tenant_id: tenantId, formato_venda_id: { not: null } },
        include: { formatoVenda: true }
    });
    menuFormats.forEach((m: any) => m.formatoVenda?.produto_id && activeProductIds.add(m.formatoVenda.produto_id));

    if (activeProductIds.size > 0) {
        const productsToCheck = await prisma.produto.findMany({
            where: {
                id: { in: Array.from(activeProductIds) },
                tenant_id: tenantId,
                ativo: true
            },
            include: {
                variacoes: {
                    where: { ativo: true },
                    include: {
                        historicoPrecos: {
                            orderBy: { data_mudanca: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        for (const product of productsToCheck) {
            let hasRecentUpdate = false;
            let lastUpdateDate: Date | null = null;

            for (const variation of product.variacoes) {
                const lastHistory = variation.historicoPrecos[0];
                if (lastHistory) {
                    if (!lastUpdateDate || lastHistory.data_mudanca > lastUpdateDate) {
                        lastUpdateDate = lastHistory.data_mudanca;
                    }
                    const daysSinceUpdate = Math.floor((now.getTime() - lastHistory.data_mudanca.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysSinceUpdate <= stalePriceDays) {
                        hasRecentUpdate = true;
                    }
                }
            }

            if (!hasRecentUpdate && product.variacoes.length > 0) {
                const daysStale = lastUpdateDate
                    ? Math.floor((now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24))
                    : -1;

                const message = daysStale >= 0
                    ? `Preço não atualizado há ${daysStale} dias.`
                    : `Preço nunca atualizado.`;

                await upsertAlert(tenantId, {
                    tipo_alerta: 'stale_price',
                    titulo: product.nome,
                    mensagem: message,
                    severidade: 'warning',
                    entidade_tipo: 'Produto',
                    entidade_id: product.id.toString(),
                    dados_contexto: { value: daysStale >= 0 ? daysStale : null, threshold: stalePriceDays }
                }, validAlertIds);
            }
        }
    }

    // 6. Cleanup obsolete active alerts
    if (validAlertIds.size > 0) {
        await prisma.alertaAi.updateMany({
            where: {
                tenant_id: tenantId,
                arquivado: false,
                NOT: { id: { in: Array.from(validAlertIds) } }
            },
            data: { arquivado: true }
        });
    } else {
        await prisma.alertaAi.updateMany({
            where: { tenant_id: tenantId, arquivado: false },
            data: { arquivado: true }
        });
    }
}

async function upsertAlert(tenantId: number, data: {
    tipo_alerta: string;
    titulo: string;
    mensagem: string;
    severidade: string;
    entidade_tipo: string;
    entidade_id: string;
    dados_contexto: any;
}, validAlertIds: Set<number>) {
    const existing = await prisma.alertaAi.findFirst({
        where: {
            tenant_id: tenantId,
            entidade_tipo: data.entidade_tipo,
            entidade_id: data.entidade_id,
            arquivado: false,
            tipo_alerta: data.tipo_alerta
        }
    });

    if (!existing) {
        const newAlert = await prisma.alertaAi.create({
            data: { tenant_id: tenantId, ...data }
        });
        validAlertIds.add(newAlert.id);
    } else {
        if (existing.severidade !== data.severidade || existing.mensagem !== data.mensagem) {
            await prisma.alertaAi.update({
                where: { id: existing.id },
                data: {
                    severidade: data.severidade,
                    mensagem: data.mensagem,
                    dados_contexto: data.dados_contexto,
                    lido: false
                }
            });
        }
        validAlertIds.add(existing.id);
    }
}
