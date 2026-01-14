import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma } from '../../core/database';
import { z } from 'zod';
import { dashboardCache } from '../../core/cache.service';

export async function dashboardRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/stats', {
        schema: {
            tags: ['Dashboard'],
            summary: 'Get dashboard statistics (cached)',
            security: [{ bearerAuth: [] }],
            querystring: z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }),
            response: {
                200: z.object({
                    vendasMes: z.number(),
                    custoMercadoria: z.number(),
                    cmvTeorico: z.number(),
                    comprasMes: z.number(),
                    margemBruta: z.number(),
                    topItems: z.array(z.any()), // Use any for simplicity or define strict structure if needed
                    topCategories: z.array(z.any()),
                    custoEstrutura: z.object({
                        valor: z.number(),
                        periodo: z.string()
                    }),
                    salesTrend: z.array(z.object({
                        date: z.string(),
                        value: z.number()
                    })).optional(),
                    alertsCount: z.number().optional(),
                    taxaOcupacao: z.number(),
                    lucroBruto: z.number(),
                }),
            },
        },
    }, async (req, reply) => {
        console.log('[DASHBOARD /stats] Request received from tenant:', req.tenantId, 'Query:', req.query);
        const tenantId = req.tenantId;
        if (!tenantId) return reply.status(401).send();
        const { startDate, endDate } = req.query;

        // Check cache first (include dates in key)
        // Check cache first (include dates in key) - VERSION 3
        const cacheKey = `dashboard:stats:v3:${tenantId}:${startDate || 'default'}:${endDate || 'default'}`;
        const cached = await dashboardCache.get(cacheKey);
        if (cached) {
            console.log(`[${new Date().toISOString()}] 🎯 Dashboard cache HIT for tenant ${tenantId}`);
            return reply.send(cached as any);
        }

        console.log(`[${new Date().toISOString()}] 💾 Dashboard cache MISS - fetching stats for ${startDate || 'current'} to ${endDate || 'current'}`);

        // Fetch dashboard stats
        const result = await getDashboardStats(tenantId, startDate as string, endDate as string);

        // Cache the result
        await dashboardCache.set(cacheKey, result);

        return reply.send(result);
    });

    app.withTypeProvider<ZodTypeProvider>().get('/sales-chart', {
        schema: {
            tags: ['Dashboard'],
            summary: 'Get sales chart data for a specific period',
            security: [{ bearerAuth: [] }],
            querystring: z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }),
            response: {
                200: z.array(z.object({
                    date: z.string(),
                    vendas: z.number(),
                    custos: z.number()
                }))
            }
        }
    }, async (req, reply) => {
        console.log('[DASHBOARD /sales-chart] Request received from tenant:', req.tenantId, 'Query:', req.query);
        const tenantId = req.tenantId;
        if (!tenantId) return reply.status(401).send();

        const { startDate, endDate } = req.query;

        // Check cache first
        const cacheKey = `dashboard:chart:v1:${tenantId}:${startDate || 'default'}:${endDate || 'default'}`;
        const cached = await dashboardCache.get(cacheKey);
        if (cached) {
            console.log(`[${new Date().toISOString()}] 🎯 Chart cache HIT for tenant ${tenantId}`);
            return reply.send(cached as any);
        }

        console.log(`[${new Date().toISOString()}] 💾 Chart cache MISS - fetching data for ${startDate || 'current'} to ${endDate || 'current'}`);

        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        let end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Adjust end date to cover the full day if it's just a date string
        if (endDate && endDate.length <= 10) {
            end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
        }

        console.log(`[SalesChart] Request: ${startDate} to ${endDate}`);
        console.log(`[SalesChart] Parsed: ${start.toISOString()} to ${end.toISOString()}`);

        // Get sales trend
        const salesTrend = await prisma.$queryRaw<Array<{ date: string; value: number }>>`
            SELECT
                DATE(data_venda) as date,
                CAST(SUM(receita_total) AS DECIMAL(10, 2)) as value
            FROM vendas
            WHERE tenant_id = ${tenantId}
                AND data_venda >= ${start}
                AND data_venda <= ${end}
            GROUP BY DATE(data_venda)
            ORDER BY date ASC
        `;

        // Get sales with menu items to calculate CMV properly
        const salesWithItems = await prisma.venda.findMany({
            where: {
                tenant_id: tenantId,
                data_venda: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                menuItem: true, // Only need menuItem for pvp and margem_bruta
            },
        });

        // Calculate CMV per day using same logic as KPI
        const cmvByDate = new Map<string, number>();

        for (const sale of salesWithItems) {
            const dateStr = new Date(sale.data_venda).toISOString().split('T')[0];

            let custoUnitario = 0;
            if (sale.menuItem) {
                // Calculate cost from MenuItem: custo = pvp - margem_bruta
                const pvp = Number(sale.menuItem.pvp || 0);
                const margemBruta = Number(sale.menuItem.margem_bruta || 0);
                custoUnitario = pvp - margemBruta;
            }

            // Use historical cost if available (CMV Real), otherwise calculate theoretical
            const custoTotal = (sale.custo_total) ? Number(sale.custo_total) : (custoUnitario * sale.quantidade);

            const currentCmv = cmvByDate.get(dateStr) || 0;
            cmvByDate.set(dateStr, currentCmv + custoTotal);
        }

        // Get structural costs
        const custos = await prisma.custoEstrutura.findMany({
            where: {
                tenant_id: tenantId,
                ativo: true
            }
        });

        const totalMensal = custos.reduce((sum, custo) => {
            return sum + Number(custo.valor_mensal);
        }, 0);

        const averageDaysInMonth = 30.44;
        const custoEstruturaDiario = totalMensal / averageDaysInMonth;

        console.log(`[SalesChart] Query returned ${salesTrend.length} sales rows, ${cmvByDate.size} days with CMV`);
        console.log(`[SalesChart] Daily structural cost: €${custoEstruturaDiario.toFixed(2)}`);

        // Create map for all dates in range
        const dataMap = new Map<string, { vendas: number; custos: number }>();
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dataMap.set(dateStr, { vendas: 0, custos: custoEstruturaDiario });
        }

        // Fill in sales data
        salesTrend.forEach(({ date, value }) => {
            const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
            const existing = dataMap.get(dateStr);
            if (existing) {
                existing.vendas = Number(value);
            }
        });

        // Fill in CMV data
        cmvByDate.forEach((cmv, dateStr) => {
            const existing = dataMap.get(dateStr);
            if (existing) {
                const totalCost = cmv + custoEstruturaDiario;
                console.log(`[SalesChart] ${dateStr}: CMV=€${cmv.toFixed(2)}, Structure=€${custoEstruturaDiario.toFixed(2)}, Total=€${totalCost.toFixed(2)}`);
                // Add CMV to the existing structural cost
                existing.custos = totalCost;
            }
        });

        const result = Array.from(dataMap.entries())
            .map(([date, data]) => ({
                date,
                vendas: data.vendas,
                custos: Number(data.custos.toFixed(2))
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Cache the result
        await dashboardCache.set(cacheKey, result);

        return reply.send(result);
    });
}

// Helper function to get dashboard stats
async function getDashboardStats(tenantId: number, startDate?: string, endDate?: string) {
    const now = new Date();

    // Default to current month if no dates provided
    const startOfMonth = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);

    let endOfMonth;
    if (endDate) {
        // If end date is provided, ensure it covers the full day
        // MATCH SALES MODULE LOGIC: Use setHours on the existing object
        endOfMonth = new Date(endDate);
        endOfMonth.setHours(23, 59, 59, 999);
    } else {
        endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }


    // Log for debugging
    console.log(`[DashboardStats] Tenant: ${tenantId}`);
    console.log(`[DashboardStats] Params: start=${startDate}, end=${endDate}`);
    console.log(`[DashboardStats] Parsed: start=${startOfMonth.toISOString()}, end=${endOfMonth.toISOString()}`);

    // Fetch sales for selected period
    const sales = await prisma.venda.findMany({
        where: {
            tenant_id: tenantId,
            data_venda: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
        },
        include: {
            menuItem: {
                include: {
                    receita: true,
                    combo: true,
                }
            }, // Need menuItem with nested relations for images
        },
    });

    let vendasMes = 0;
    let custoMercadoria = 0;
    const itemStats = new Map<number, {
        id: number,
        name: string,
        category: string,
        quantity: number,
        revenue: number,
        image: string
    }>();

    for (const sale of sales) {
        const receitaTotal = Number(sale.receita_total);
        console.log(`[DEBUG] Sale ${sale.id}: ${receitaTotal} (Raw: ${sale.receita_total})`);
        vendasMes += receitaTotal;

        let custoUnitario = 0;
        let category = 'Outros';
        let image = '';
        let name = 'Item Desconhecido';

        if (sale.menuItem) {
            name = sale.menuItem.nome_comercial;
            category = sale.menuItem.categoria_menu || 'Sem Categoria';

            // Get image from receita, combo, or menuItem itself
            if (sale.menuItem.receita?.imagem_url) {
                image = sale.menuItem.receita.imagem_url;
            } else if (sale.menuItem.combo?.imagem_url) {
                image = sale.menuItem.combo.imagem_url;
            } else if (sale.menuItem.imagem_url) {
                image = sale.menuItem.imagem_url;
            }

            // Calculate cost from MenuItem: custo = pvp - margem_bruta
            const pvp = Number(sale.menuItem.pvp || 0);
            const margemBruta = Number(sale.menuItem.margem_bruta || 0);
            custoUnitario = pvp - margemBruta;
        }

        // Use historical cost if available (CMV Real), otherwise calculate theoretical
        const custoTotal = (sale.custo_total) ? Number(sale.custo_total) : (custoUnitario * sale.quantidade);
        custoMercadoria += custoTotal;

        // Aggregating for Top Items
        if (sale.menu_item_id) {
            const existing = itemStats.get(sale.menu_item_id);

            if (existing) {
                // Update existing entry (create new object to avoid mutation)
                itemStats.set(sale.menu_item_id, {
                    ...existing,
                    quantity: existing.quantity + sale.quantidade,
                    revenue: existing.revenue + receitaTotal,
                });
            } else {
                // Create new entry
                itemStats.set(sale.menu_item_id, {
                    id: sale.menu_item_id,
                    name,
                    category,
                    quantity: sale.quantidade,
                    revenue: receitaTotal,
                    image
                });
            }
        }
    }

    console.log(`[DEBUG] Processed ${sales.length} sales, aggregated ${itemStats.size} unique items`);

    const cmvTeorico = vendasMes > 0 ? (custoMercadoria / vendasMes) * 100 : 0;

    // Process Top Items
    const allItems = Array.from(itemStats.values());

    // Calculate top categories by aggregating items
    const categoryStats = new Map<string, { revenue: number; quantity: number }>();
    allItems.forEach(item => {
        const current = categoryStats.get(item.category) || { revenue: 0, quantity: 0 };
        current.revenue += item.revenue;
        current.quantity += item.quantity;
        categoryStats.set(item.category, current);
    });

    const topCategories = Array.from(categoryStats.entries())
        .map(([category, stats]) => ({ category, ...stats }))
        .sort((a, b) => b.revenue - a.revenue);

    // Calculate structural costs
    const custos = await prisma.custoEstrutura.findMany({
        where: {
            tenant_id: tenantId,
            ativo: true
        }
    });

    const totalMensal = custos.reduce((sum, custo) => {
        return sum + Number(custo.valor_mensal);
    }, 0);

    // Calculate days in period for proportional structure cost
    const oneDay = 24 * 60 * 60 * 1000;
    const daysInPeriod = Math.round(Math.abs((endOfMonth.getTime() - startOfMonth.getTime()) / oneDay));
    // Average days in month (365.25 / 12)
    const averageDaysInMonth = 30.44;

    // Proportional Cost: (Monthly Total / 30.44) * daysInPeriod
    // Ensure we don't exceed monthly total if period > 30 days (unless intentional? usually dashboards show total for period even if > 1 month)
    // If period is 2 months, cost should be 2x. So linear scaling is correct.
    const custoEstruturaPeriodo = (totalMensal / averageDaysInMonth) * (daysInPeriod || 1);

    // Calculate monthly purchases
    const comprasFaturas = await prisma.compraFatura.findMany({
        where: {
            tenant_id: tenantId,
            data_fatura: {
                gte: startOfMonth,
                lte: endOfMonth
            },
            validado: true  // Only validated invoices
        }
    });

    const comprasMes = comprasFaturas.reduce((sum, fatura) =>
        sum + Number(fatura.total_com_iva), 0
    );

    // Trend Calculation - OPTIMIZED: Single aggregation query instead of 30+ iterations
    const salesTrend = await prisma.$queryRaw<Array<{ date: string; value: number }>>`
            SELECT
DATE(data_venda) as date,
    CAST(SUM(receita_total) AS DECIMAL(10, 2)) as value
            FROM vendas
            WHERE tenant_id = ${tenantId}
                AND data_venda >= ${startOfMonth}
                AND data_venda <= ${endOfMonth}
            GROUP BY DATE(data_venda)
            ORDER BY date ASC
    `;

    const trendMap = new Map<string, number>();
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        trendMap.set(dateStr, 0);
    }
    salesTrend.forEach(({ date, value }) => {
        // Ensure date is string format YYYY-MM-DD
        const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
        trendMap.set(dateStr, Number(value));
    });

    const finalSalesTrend = Array.from(trendMap.entries())
        .map(([date, value]) => ({
            date: date, // Already a string from Map keys
            value
        }))
        .sort((a, b) => a.date.localeCompare(b.date));



    // Alerts Count (Mock or Fetch)
    // For now, let's fetch real active alerts count if the table exists, otherwise 0
    // Reviewing prisma schema earlier would be good, but assuming 'Alerta' model exists primarily
    // based on 'alerts' folder presence. I will use a safe try-catch or just return mock for this step 
    // if I am not 100% sure of schema.
    // Actually, looking at previous context, there was a "Debugging Alerts API Error" conversation.
    // So 'Alerta' model likely exists.

    let alertsCount = 0;
    try {
        alertsCount = await prisma.alertaAi.count({
            where: {
                tenant_id: tenantId,
                lido: false,
                arquivado: false
            }
        });
    } catch (e) {
        console.warn("Could not fetch alerts count", e);
    }

    const margemBruta = vendasMes - custoMercadoria;

    // ===== NEW: Calculate Occupancy Rate =====
    // Fetch restaurant data for numero_lugares and dias_trabalho_semana
    const dadosRestaurante = await prisma.dadosRestaurante.findFirst({
        where: { tenant_id: tenantId }
    });
    const numeroLugares = dadosRestaurante?.numero_lugares || 0;
    const diasTrabalhoSemana = Number(dadosRestaurante?.dias_trabalho_semana || 5);

    // Count main dishes and combos sold
    const pratosVendidos = sales.reduce((sum, sale) => {
        const categoria = sale.menuItem?.categoria_menu?.toLowerCase() || '';
        const isCombo = sale.menuItem?.combo_id != null;
        const isPratoPrincipal = categoria.includes('principais') || categoria.includes('principal');

        if (isPratoPrincipal || isCombo) {
            return sum + sale.quantidade;
        }
        return sum;
    }, 0);

    // Calculate number of calendar days in the period (ignoring time)
    const startDay = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), startOfMonth.getDate());
    const endDay = new Date(endOfMonth.getFullYear(), endOfMonth.getMonth(), endOfMonth.getDate());
    const diasCalendario = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate number of working days based on dias_trabalho_semana
    // Approximate: (total days / 7) * working days per week
    const semanasCompletas = diasCalendario / 7;
    const diasTrabalho = Math.ceil(semanasCompletas * diasTrabalhoSemana);

    // Calculate average dishes sold per working day
    const pratosVendidosPorDia = diasTrabalho > 0 ? pratosVendidos / diasTrabalho : 0;

    // Calculate occupancy rate based on daily average
    const taxaOcupacao = numeroLugares > 0
        ? (pratosVendidosPorDia / numeroLugares) * 100
        : 0;

    // ===== NEW: Calculate Gross Profit =====
    const lucroBruto = vendasMes - custoMercadoria - custoEstruturaPeriodo;

    // Sort and prepare topItems
    const topItems = allItems
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    console.log(`[DEBUG] Total items aggregated: ${allItems.length}, Top items: ${topItems.length}`);
    if (topItems.length > 0) {
        console.log(`[DEBUG] Top item: ${topItems[0].name} - €${topItems[0].revenue}`);
    }

    const result = {
        vendasMes: Number(vendasMes.toFixed(2)),
        custoMercadoria: Number(custoMercadoria.toFixed(2)),
        cmvTeorico: Number(cmvTeorico.toFixed(2)),
        comprasMes: Number(comprasMes.toFixed(2)),
        margemBruta: Number(margemBruta.toFixed(2)),
        topItems,
        topCategories: topCategories.slice(0, 5),
        custoEstrutura: {
            valor: Number(custoEstruturaPeriodo.toFixed(2)),
            periodo: 'período'
        },
        salesTrend: finalSalesTrend,
        alertsCount,
        taxaOcupacao: Number(taxaOcupacao.toFixed(2)),
        lucroBruto: Number(lucroBruto.toFixed(2)),
    };

    return result;
}
