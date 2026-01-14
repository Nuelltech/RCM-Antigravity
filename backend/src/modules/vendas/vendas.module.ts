import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';
import { prisma } from '../../core/database';
import { dashboardCache } from '../../core/cache.service';

const createBatchSalesSchema = z.object({
    date: z.string().datetime(),
    comment: z.string().optional(),
    type: z.enum(['ITEM', 'TOTAL']),
    amount: z.number().optional(), // For TOTAL
    items: z.array(z.object({
        id: z.number(),
        qty: z.number(),
    })).optional(), // For ITEMIZED
});

export async function salesRoutes(app: FastifyInstance) {
    // Dashboard Data
    app.withTypeProvider<ZodTypeProvider>().get('/dashboard', {
        schema: {
            querystring: z.object({
                startDate: z.string(),
                endDate: z.string(),
            }),
            tags: ['Sales'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Querystring: { startDate: string; endDate: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const sales = await prisma.venda.findMany({
            where: {
                tenant_id: req.tenantId,
                data_venda: {
                    gte: start,
                    lte: end,
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
            orderBy: { data_venda: 'asc' },
        });

        // 1. Trend
        const trendMap = new Map<string, number>();
        sales.forEach((sale: any) => {
            const dateKey = sale.data_venda.toISOString().split('T')[0];
            const currentTotal = trendMap.get(dateKey) || 0;
            trendMap.set(dateKey, currentTotal + Number(sale.receita_total));
        });
        const trend = Array.from(trendMap.entries()).map(([date, total]) => ({ date, total }));

        // 2. Histogram (Top Items)
        const itemSales = sales.filter((s: any) => s.tipo === 'ITEM' && s.menu_item_id);
        const histogramMap = new Map<string, number>();
        itemSales.forEach((sale: any) => {
            const name = sale.menuItem?.nome_comercial || 'Unknown';
            const currentTotal = histogramMap.get(name) || 0;
            histogramMap.set(name, currentTotal + Number(sale.receita_total));
        });
        const histogram = Array.from(histogramMap.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // 3. Items List with Cost
        const itemsListMap = new Map<number, { id: number, name: string, quantity: number, total: number, cmv: number }>();
        itemSales.forEach((sale: any) => {
            const id = sale.menu_item_id!;

            // Calculate cost based on source
            let cost = 0;
            if (sale.menuItem?.receita) {
                cost = Number(sale.menuItem.receita.custo_por_porcao || 0);
            } else if (sale.menuItem?.combo) {
                cost = Number(sale.menuItem.combo.custo_total || 0);
            } else if (sale.menuItem?.formatoVenda) {
                cost = Number(sale.menuItem.formatoVenda.custo_unitario || 0);
            }

            const existing = itemsListMap.get(id) || {
                id,
                name: sale.menuItem?.nome_comercial || 'Unknown',
                quantity: 0,
                total: 0,
                cmv: cost
            };
            existing.quantity += sale.quantidade;
            existing.total += Number(sale.receita_total);
            itemsListMap.set(id, existing);
        });
        const itemsList = Array.from(itemsListMap.values()).sort((a, b) => b.total - a.total);

        return {
            trend,
            histogram,
            itemsList,
            totalSales: sales.reduce((sum: number, s: any) => sum + Number(s.receita_total), 0),
        };
    });

    // Create Sale (Batch or Single)
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createBatchSalesSchema,
            tags: ['Sales'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Body: z.infer<typeof createBatchSalesSchema> }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);
        const { date, comment, type, amount, items } = req.body;
        const dataVenda = new Date(date);

        if (type === 'TOTAL' && amount) {
            await db.create('venda', {
                data_venda: dataVenda,
                tipo: 'TOTAL',
                receita_total: amount,
                pvp_praticado: amount,
                quantidade: 1,
                metodo_entrada: 'Manual',
                observacoes: comment,
            });
        } else if (type === 'ITEM' && items) {
            const itemIds = items.map((i: any) => i.id);
            const menuItems = await prisma.menuItem.findMany({
                where: { id: { in: itemIds }, tenant_id: req.tenantId }
            });

            for (const item of items) {
                const menuItem = menuItems.find((mi: any) => mi.id === item.id);
                if (menuItem) {
                    // Calculate cost from MenuItem: custo = pvp - margem_bruta
                    const pvp = Number(menuItem.pvp || 0);
                    const margemBruta = Number(menuItem.margem_bruta || 0);
                    const custoUnitario = pvp - margemBruta;
                    const custoTotal = custoUnitario * item.qty;

                    await db.create('venda', {
                        data_venda: dataVenda,
                        tipo: 'ITEM',
                        menu_item_id: item.id,
                        quantidade: item.qty,
                        pvp_praticado: menuItem.pvp,
                        receita_total: Number(menuItem.pvp) * item.qty,
                        custo_total: custoTotal, // ✅ Store historical cost
                        metodo_entrada: 'Manual',
                        observacoes: comment,
                    });
                }
            }
        }

        // Invalidate dashboard cache after creating sales
        await dashboardCache.invalidateTenant(req.tenantId);
        console.log(`[CACHE INVALIDATE] Dashboard cache cleared for tenant ${req.tenantId} after sales creation`);

        return { success: true };
    });

    // Item Details
    app.withTypeProvider<ZodTypeProvider>().get('/item/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            querystring: z.object({
                startDate: z.string(),
                endDate: z.string(),
            }),
            tags: ['Sales'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Params: { id: string }, Querystring: { startDate: string; endDate: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const itemId = parseInt(req.params.id);

        const sales = await prisma.venda.findMany({
            where: {
                tenant_id: req.tenantId,
                menu_item_id: itemId,
                data_venda: { gte: start, lte: end },
            },
            orderBy: { data_venda: 'asc' },
        });

        const trendMap = new Map<string, number>();
        sales.forEach((sale: any) => {
            const dateKey = sale.data_venda.toISOString().split('T')[0];
            const currentTotal = trendMap.get(dateKey) || 0;
            trendMap.set(dateKey, currentTotal + Number(sale.receita_total));
        });
        const trend = Array.from(trendMap.entries()).map(([date, total]) => ({ date, total }));

        return {
            trend,
            totalSales: sales.reduce((sum: number, s: any) => sum + Number(s.receita_total), 0),
            totalQuantity: sales.reduce((sum: number, s: any) => sum + s.quantidade, 0),
        };
    });
}
