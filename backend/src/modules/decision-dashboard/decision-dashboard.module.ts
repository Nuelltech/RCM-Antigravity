import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../core/database';
import redis from '../../core/redis';

// Expected response structure
export interface StructuralProblem {
    id: string; // menu_item_id as string
    name: string;
    loss: number;
    cmv: number;
    targetCmv: number;
    suggestedAction: string;
}

export interface RecentChange {
    id: string; // alert id as string
    name: string;
    deltaLoss: number;
    extraSalesNeeded?: number;
    priceAdjustment?: number;
    menuItemId: number;
}

export interface ActionTask {
    id: string;
    label: string;
    completed: boolean;
    linkedItemId: string;
    type: 'structural' | 'recent';
}

export async function decisionDashboardRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Decision Dashboard'],
            querystring: z.object({
                refresh: z.string().optional(),
            }),
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Querystring: { refresh?: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        try {
            // Check Redis Cache first (Optional)
            const cacheKey = `tenant:${req.tenantId}:decision_dashboard:v2`;
            const forceRefresh = req.query.refresh === 'true';

            try {
                if (!forceRefresh) {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        console.log('[Decision Dashboard] Serving from Cache');
                        return JSON.parse(cached);
                    }
                }
            } catch (cacheErr) {
                console.warn('[Decision Dashboard] Redis cache GET failed, continuing to compile data...', cacheErr);
            }

            console.log('[Decision Dashboard] Calculating Fresh Data...');
            
            // 0. Fetch Restaurant Settings for Target CMV
            const dadosRestaurante = await prisma.dadosRestaurante.findUnique({
                where: { tenant_id: req.tenantId }
            });
            const globalTargetCmv = Number(dadosRestaurante?.cmv_alerta_amarelo ?? 30);
            
            // 1. Fetch Radar (Recent Changes) - SUPER FAST
            const alerts = await prisma.alertaErosao.findMany({
                where: {
                    tenant_id: req.tenantId,
                    status: 'ATIVO'
                },
                include: {
                    menuItem: {
                        select: { nome_comercial: true }
                    }
                },
                orderBy: { perda_projetada: 'desc' },
                take: 10 // Top 10 worst recent offenders
            });

            // Map Radar to Response structure
            const recentChanges: RecentChange[] = alerts.map(a => ({
                id: a.id.toString(),
                name: a.menuItem.nome_comercial,
                deltaLoss: Number(a.perda_projetada) || 0,
                extraSalesNeeded: a.pratos_extra_necessarios || 0,
                priceAdjustment: Number(a.preco_sugerido) || 0,
                menuItemId: a.menu_item_id
            }));

            // Calculate total risk
            const additionalRisk = recentChanges.reduce((sum, item) => sum + item.deltaLoss, 0);

            // 2. Fetch Hemorrhage (Structural Problems) - HEAVY CALCULATION (30 days)
            let structuralProblems: StructuralProblem[] = [];
            let currentLoss = 0;
            let currentGain = 0;
            
            const now = new Date();
            const start = new Date(now);
            start.setDate(now.getDate() - 30);
            
            // Set time boundaries to cover the full day just like hemorragia
            start.setHours(0, 0, 0, 0);
            now.setHours(23, 59, 59, 999);

            const menuItems = await prisma.menuItem.findMany({
                where: { tenant_id: req.tenantId, ativo: true },
                include: {
                    receita: { select: { custo_por_porcao: true } },
                    combo: { select: { custo_total: true } },
                    formatoVenda: { select: { custo_unitario: true } },
                }
            });

            const salesAgg = await prisma.venda.groupBy({
                by: ['menu_item_id'],
                where: {
                    tenant_id: req.tenantId,
                    menu_item_id: { in: menuItems.map(i => i.id) },
                    data_venda: { gte: start, lte: now }
                },
                _sum: { quantidade: true, receita_total: true, custo_total: true }
            });

            // Map aggregate to dictionary for O(1) loop lookup
            const salesMap = new Map<number, { volumeVendas: number, totalRevenueSales: number, totalCusto: number }>();
            for (const agg of salesAgg) {
                if (agg.menu_item_id) {
                    salesMap.set(agg.menu_item_id, {
                        volumeVendas: Number(agg._sum.quantidade || 0),
                        totalRevenueSales: Number(agg._sum.receita_total || 0),
                        totalCusto: Number(agg._sum.custo_total || 0)
                    });
                }
            }

            let totalFaturacaoGlobal = 0;
            let totalCustoGlobal = 0;

            for (const item of menuItems) {
                const itemSales = salesMap.get(item.id);
                if (!itemSales) continue;

                const volumeVendas = itemSales.volumeVendas;
                if (volumeVendas === 0) continue;

                totalFaturacaoGlobal += itemSales.totalRevenueSales;
                totalCustoGlobal += itemSales.totalCusto;

                // USE HISTORICAL COST
                let custoUnitario = 0;
                if (itemSales.totalCusto > 0) {
                    custoUnitario = itemSales.totalCusto / volumeVendas;
                } else {
                    if (item.receita) custoUnitario = Number(item.receita.custo_por_porcao);
                    else if (item.combo) custoUnitario = Number(item.combo.custo_total);
                    else if (item.formatoVenda) custoUnitario = Number(item.formatoVenda.custo_unitario);
                }

                if (custoUnitario <= 0) continue;

                // Weighted average PVP
                const totalRevenueSales = itemSales.totalRevenueSales;
                const pvpMedio = volumeVendas > 0 ? totalRevenueSales / volumeVendas : Number(item.pvp);

                if (pvpMedio <= 0) continue;

                // CMV calculation
                const cmvAtual = (custoUnitario / pvpMedio) * 100;
                const cmvTarget = globalTargetCmv;

                const diffCMV = cmvAtual - cmvTarget;

                if (diffCMV > 0) {
                    const perdaUnitaria = pvpMedio * (diffCMV / 100);
                    const totalPerdido = perdaUnitaria * volumeVendas;

                    structuralProblems.push({
                        id: item.id.toString(),
                        name: item.nome_comercial,
                        loss: Math.round(totalPerdido * 100) / 100,
                        cmv: Math.round(cmvAtual * 10) / 10,
                        targetCmv: cmvTarget,
                        suggestedAction: 'Ajustar preço ou receita'
                    });
                } else {
                    const economiasCMV = Math.abs(diffCMV);
                    const ganhoUnitario = pvpMedio * (economiasCMV / 100);
                    const totalGanho = ganhoUnitario * volumeVendas;
                    currentGain += totalGanho;
                }
            }

            const totalItemsCount = structuralProblems.length;

            // Extract top offenders
            structuralProblems.sort((a, b) => b.loss - a.loss);

            currentLoss = structuralProblems.reduce((sum, p) => sum + p.loss, 0);

            // Setup overall CMV calculation (Raw Gross Accounting matching Main Dashboard)
            const allSalesForGlobalCmv = await prisma.venda.findMany({
                where: {
                    tenant_id: req.tenantId,
                    data_venda: { gte: start, lte: now }
                },
                include: { menuItem: { select: { pvp: true, margem_bruta: true } } }
            });

            let globalGrossRevenue = 0;
            let globalGrossCost = 0;

            for (const sale of allSalesForGlobalCmv) {
                globalGrossRevenue += Number(sale.receita_total || 0);
                
                let custoUnitario = 0;
                if (sale.menuItem) {
                    const pvp = Number(sale.menuItem.pvp || 0);
                    const margemBruta = Number(sale.menuItem.margem_bruta || 0);
                    custoUnitario = pvp - margemBruta;
                }
                
                const custoTotal = sale.custo_total 
                    ? Number(sale.custo_total) 
                    : (custoUnitario * sale.quantidade);
                    
                globalGrossCost += custoTotal;
            }

            const overallCmv = globalGrossRevenue > 0 ? (globalGrossCost / globalGrossRevenue) * 100 : 0;

            // ===== NEW: Calculate Real Occupancy Rate =====
            const numLugares = Number(dadosRestaurante?.numero_lugares || 0);
            // Default 2 as defined in schema changes
            const servicosDia = Number(dadosRestaurante?.servicos_por_dia || 2);
            const diasTrabalhoSemana = Number(dadosRestaurante?.dias_trabalho_semana || 5);
            
            const diasAbertosMes = (30 / 7) * diasTrabalhoSemana;
            const capacidadeRealMes = numLugares * servicosDia * Math.round(diasAbertosMes);
            
            // Using volumeVendas as a proxy for 'clientes servidos' (1 main plate = 1 customer approximately)
            const totalClientesServidos = Array.from(salesMap.values()).reduce((sum, item) => sum + item.volumeVendas, 0);

            let occupRate = 0;
            let occupLevel = "Desconhecido";

            if (numLugares > 0) {
                occupRate = (totalClientesServidos / capacidadeRealMes) * 100;
                
                // CriterioOcupacao Engine logic (fallback if DB query fails)
                if (occupRate < 30) occupLevel = "Crítico";
                else if (occupRate < 50) occupLevel = "Fraco";
                else if (occupRate < 65) occupLevel = "Médio";
                else if (occupRate < 80) occupLevel = "Bom";
                else if (occupRate < 90) occupLevel = "Muito Bom";
                else occupLevel = "Excelente";
            }


            // ===== NEW: Calculate Structural Costs for the Period =====
            const historicoCustos = await prisma.custoEstruturaHistorico.findMany({
                where: { tenant_id: req.tenantId }
            });

            let totalCustoEstruturaPeriodo = 0;
            const averageDaysInMonth = 30.44;

            const currentDay = new Date(start);
            const endLoop = new Date(now);
            currentDay.setHours(0, 0, 0, 0);
            endLoop.setHours(0, 0, 0, 0);

            while (currentDay <= endLoop) {
                const activeCosts = historicoCustos.filter(h => {
                    const startDate = new Date(h.data_inicio);
                    const endDate = h.data_fim ? new Date(h.data_fim) : null;
                    startDate.setHours(0, 0, 0, 0);
                    if (endDate) endDate.setHours(0, 0, 0, 0);
                    return startDate.getTime() <= currentDay.getTime() &&
                        (!endDate || endDate.getTime() >= currentDay.getTime());
                });

                const monthlyTotal = activeCosts.reduce((sum, h) => sum + Number(h.valor), 0);
                totalCustoEstruturaPeriodo += (monthlyTotal / averageDaysInMonth);
                currentDay.setDate(currentDay.getDate() + 1);
            }

            const custoEstruturaPeriodo = totalCustoEstruturaPeriodo;
            
            // ===== NEW: Calculate Structural Weight =====
            let structRate = 0;
            let structLevel = "Desconhecido";
            const vendas = globalGrossRevenue;
            
            if (vendas > 0) {
                structRate = (custoEstruturaPeriodo / vendas) * 100;
                
                if (structRate < 30) structLevel = "Eficiente";
                else if (structRate < 35) structLevel = "Controlado";
                else if (structRate < 40) structLevel = "Aceitável";
                else if (structRate < 45) structLevel = "Alto";
                else if (structRate < 55) structLevel = "Crítico";
                else structLevel = "Insustentável";
            }
            
            // ===== NEW: Execute the Rule Engine for the "Insight Message" =====
            const isProfit = (vendas - globalGrossCost - custoEstruturaPeriodo) >= 0;
            const isCmvOk = overallCmv <= globalTargetCmv;

            let finalInsight = "Preencha os seus Dados do Restaurante para podermos gerar uma análise avançada do seu fluxo.";
            
            try {
                const rules = await prisma.regraDecisaoDashboard.findMany({
                    orderBy: { prioridade: 'desc' }
                });

                const match = rules.find(r => 
                    (r.lucro_positivo === null || r.lucro_positivo === isProfit) &&
                    (r.cmv_controlado === null || r.cmv_controlado === isCmvOk) &&
                    (r.nivel_ocupacao === null || r.nivel_ocupacao === occupLevel) &&
                    (r.nivel_estrutura === null || r.nivel_estrutura === structLevel)
                );

                if (match) {
                    finalInsight = match.mensagem;
                }
            } catch (err) {
                console.warn("[Decision Dashboard] Error finding rule matching, continuing without contextual message", err);
            }
            
            
            // Define macro stats to send back
            const globalGrossStats = {
                vendas: Math.round(globalGrossRevenue * 100) / 100,
                custosMercadoria: Math.round(globalGrossCost * 100) / 100,
                custosEstrutura: Math.round(custoEstruturaPeriodo * 100) / 100,
                resultadoLiquido: Math.round((globalGrossRevenue - globalGrossCost - custoEstruturaPeriodo) * 100) / 100
            };

            // 3. Generate Actions List (Combines Top 3 of both)
            const tasks: ActionTask[] = [];
            
            // Add top 3 structural fixes
            structuralProblems.slice(0, 3).forEach(p => {
                tasks.push({
                    id: `struc_${p.id}`,
                    label: `Corrigir margem base: ${p.name}`,
                    completed: false,
                    linkedItemId: p.id,
                    type: 'structural'
                });
            });

            // Add top 3 recent changes fixes
            recentChanges.slice(0, 3).forEach(r => {
                tasks.push({
                    id: `recent_${r.id}`,
                    label: `Aceitar subida de preço: ${r.name}`,
                    completed: false,
                    linkedItemId: r.menuItemId.toString(),
                    type: 'recent'
                });
            });

            // Bundle Final Response
            const responseData = {
                globalMacro: globalGrossStats,
                marginStatus: {
                    currentLoss,
                    currentGain,
                    netBalance: currentLoss === 0 && currentGain === 0 ? 0 : currentGain - currentLoss,
                    additionalRisk,
                    cmv: overallCmv,
                    targetCmv: globalTargetCmv
                },
                occupancyData: {
                    rate: Math.round(occupRate),
                    level: occupLevel,
                    hasData: numLugares > 0
                },
                structureData: {
                    rate: Math.round(structRate),
                    level: structLevel,
                    breakEvenSales: Math.round(custoEstruturaPeriodo / 0.35)
                },
                insightMessage: finalInsight,
                structuralProblems: {
                    items: structuralProblems.slice(0, 5), // Only send top 5 to UI
                    totalItems: totalItemsCount
                },
                recentChanges: {
                    items: recentChanges.slice(0, 5),
                    totalItems: alerts.length
                },
                actionList: {
                    tasks
                }
            };

            // Cache in Redis for 4 hours (14400 seconds)
            // Users can burst cache via the "Refresh" button triggering the worker
            try {
                 await redis.setex(cacheKey, 14400, JSON.stringify(responseData));
            } catch (cacheErr) {
                 console.warn('[Decision Dashboard] Redis cache SET failed, skipping cache creation.', cacheErr);
            }

            return responseData;
        } catch (error) {
            req.log.error(error, '[Decision Dashboard] Error calculating data');
            return reply.status(500).send({ error: 'Internal Server Error calculating dashboard' });
        }
    });

}
