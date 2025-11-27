import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SalesService {
    constructor(private prisma: PrismaService) { }

    async getDashboardData(tenantId: number, startDate: string, endDate: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Adjust end date to include the full day
        end.setHours(23, 59, 59, 999);

        // 1. Sales Trend (Daily Totals)
        const sales = await this.prisma.venda.findMany({
            where: {
                tenant_id: tenantId,
                data_venda: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                data_venda: 'asc',
            },
        });

        // Group by date for the trend chart
        const trendMap = new Map<string, number>();
        sales.forEach(sale => {
            const dateKey = sale.data_venda.toISOString().split('T')[0];
            const currentTotal = trendMap.get(dateKey) || 0;
            trendMap.set(dateKey, currentTotal + Number(sale.receita_total));
        });

        const trend = Array.from(trendMap.entries()).map(([date, total]) => ({
            date,
            total,
        }));

        // 2. Product Histogram (Top selling items)
        // Filter only ITEM type sales for this
        const itemSales = sales.filter(s => s.tipo === 'ITEM' && s.menu_item_id);

        // We need menu item names. If we didn't include them in the query, we might need to fetch or group.
        // Let's do a grouping query or manual aggregation.
        // Since we have the sales list, let's aggregate manually but we need names.
        // A better approach for histogram might be a groupBy query, but Prisma's groupBy is limited with relations.
        // Let's fetch menu items to map names.

        const menuItemIds = [...new Set(itemSales.map(s => s.menu_item_id!))];
        const menuItems = await this.prisma.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
            },
            select: { id: true, nome_comercial: true },
        });

        const menuItemMap = new Map(menuItems.map(i => [i.id, i.nome_comercial]));

        const histogramMap = new Map<string, number>();
        itemSales.forEach(sale => {
            const name = menuItemMap.get(sale.menu_item_id!) || 'Unknown';
            const currentTotal = histogramMap.get(name) || 0;
            histogramMap.set(name, currentTotal + Number(sale.receita_total));
        });

        const histogram = Array.from(histogramMap.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10); // Top 10

        // 3. Menu Items List with Sales Data
        // We can reuse the histogram data or calculate more details (qty, etc)
        const itemsListMap = new Map<number, { id: number, name: string, quantity: number, total: number }>();

        itemSales.forEach(sale => {
            const id = sale.menu_item_id!;
            const existing = itemsListMap.get(id) || {
                id,
                name: menuItemMap.get(id) || 'Unknown',
                quantity: 0,
                total: 0
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
            totalSales: sales.reduce((sum, s) => sum + Number(s.receita_total), 0),
        };
    }

    async createSale(tenantId: number, userId: number, data: any) {
        // data can be:
        // 1. { type: 'TOTAL', date: '...', amount: 100, comment: '...' }
        // 2. { type: 'ITEMIZED', date: '...', items: [{ id: 1, qty: 2 }, ...], comment: '...' }

        const date = new Date(data.date);

        if (data.type === 'TOTAL') {
            return this.prisma.venda.create({
                data: {
                    tenant_id: tenantId,
                    user_id: userId,
                    data_venda: date,
                    tipo: 'TOTAL',
                    receita_total: data.amount,
                    pvp_praticado: data.amount, // For total sales, pvp is the total
                    quantidade: 1,
                    metodo_entrada: 'Manual',
                    observacoes: data.comment,
                },
            });
        } else if (data.type === 'ITEMIZED') {
            // Need to fetch item prices to calculate totals and verify
            const itemIds = data.items.map((i: any) => i.id);
            const menuItems = await this.prisma.menuItem.findMany({
                where: {
                    id: { in: itemIds },
                    tenant_id: tenantId,
                },
            });

            const salesToCreate = data.items.map((item: any) => {
                const menuItem = menuItems.find(mi => mi.id === item.id);
                if (!menuItem) return null;

                const total = Number(menuItem.pvp) * item.qty;

                return {
                    tenant_id: tenantId,
                    user_id: userId,
                    data_venda: date,
                    tipo: 'ITEM',
                    menu_item_id: item.id,
                    quantidade: item.qty,
                    pvp_praticado: menuItem.pvp,
                    receita_total: total,
                    metodo_entrada: 'Manual',
                    observacoes: data.comment,
                };
            }).filter((s: any) => s !== null);

            if (salesToCreate.length > 0) {
                return this.prisma.venda.createMany({
                    data: salesToCreate,
                });
            }
        }

        return { success: true };
    }

    async getItemSales(tenantId: number, itemId: number, startDate: string, endDate: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const sales = await this.prisma.venda.findMany({
            where: {
                tenant_id: tenantId,
                menu_item_id: itemId,
                data_venda: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                data_venda: 'asc',
            },
        });

        const trendMap = new Map<string, number>();
        sales.forEach(sale => {
            const dateKey = sale.data_venda.toISOString().split('T')[0];
            const currentTotal = trendMap.get(dateKey) || 0;
            trendMap.set(dateKey, currentTotal + Number(sale.receita_total));
        });

        const trend = Array.from(trendMap.entries()).map(([date, total]) => ({
            date,
            total,
        }));

        return {
            trend,
            totalSales: sales.reduce((sum, s) => sum + Number(s.receita_total), 0),
            totalQuantity: sales.reduce((sum, s) => sum + s.quantidade, 0),
        };
    }
}
