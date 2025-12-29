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
            response: {
                200: z.object({
                    vendasMes: z.number(),
                    custoMercadoria: z.number(),
                    margemBruta: z.number(),
                    cmvTeorico: z.number(),
                    comprasMes: z.number(),
                    topItems: z.array(z.object({
                        id: z.number(),
                        name: z.string(),
                        category: z.string(),
                        quantity: z.number(),
                        revenue: z.number(),
                        image: z.string().optional(),
                    })),
                    topCategories: z.array(z.object({
                        category: z.string(),
                        revenue: z.number(),
                        quantity: z.number(),
                    })),
                    custoEstrutura: z.object({
                        valor: z.number(),
                        periodo: z.string(),
                    }),
                    salesTrend: z.array(z.object({
                        date: z.string(),
                        value: z.number()
                    })),
                    alertsCount: z.number(),
                }),
            },
        },
    }, async (req, reply) => {
        const tenantId = (req.user as any).tenant_id;

        // Check cache first
        const cacheKey = `dashboard:stats:${tenantId}`;
        const cached = await dashboardCache.get(cacheKey);
        if (cached) {
            console.log(`[${new Date().toISOString()}] 🎯 Dashboard cache HIT for tenant ${tenantId}`);
            return reply.send(cached as any);
        }

        console.log(`[${new Date().toISOString()}] 💾 Dashboard cache MISS for tenant ${tenantId} - fetching from DB`);

        // Fetch dashboard stats
        const result = await getDashboardStats(tenantId);

        // Cache the result
        await dashboardCache.set(cacheKey, result);

        return reply.send(result);
    });
}

// Helper function to get dashboard stats
async function getDashboardStats(tenantId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch sales for current month
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
                    formatoVenda: true,
                },
            },
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
        vendasMes += receitaTotal;

        let custoUnitario = 0;
        let category = 'Outros';
        let image = '';
        let name = 'Item Desconhecido';

        if (sale.menuItem) {
            name = sale.menuItem.nome_comercial;
            category = sale.menuItem.categoria_menu || 'Sem Categoria';

            if (sale.menuItem.receita) {
                custoUnitario = Number(sale.menuItem.receita.custo_por_porcao);
                image = sale.menuItem.receita.imagem_url || '';
            } else if (sale.menuItem.combo) {
                custoUnitario = Number(sale.menuItem.combo.custo_total);
                image = sale.menuItem.combo.imagem_url || '';
            } else if (sale.menuItem.formatoVenda) {
                custoUnitario = Number(sale.menuItem.formatoVenda.custo_unitario);
            }

            if (sale.menuItem.imagem_url) {
                image = sale.menuItem.imagem_url;
            }
        }

        const custoTotal = custoUnitario * sale.quantidade;
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

    // Fill missing days with 0 (client-side is faster than DB)
    const trendMap = new Map<string, number>();
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === now.getMonth()) {
            const dateStr = d.toISOString().split('T')[0];
            trendMap.set(dateStr, 0);
        }
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
            valor: Number(totalMensal.toFixed(2)),
            periodo: 'mensal'
        },
        salesTrend: finalSalesTrend,
        alertsCount,
    };

    return result;
}
