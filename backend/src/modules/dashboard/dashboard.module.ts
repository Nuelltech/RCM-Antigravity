import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma } from '../../core/database';
import { z } from 'zod';

export async function dashboardRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/stats', {
        schema: {
            tags: ['Dashboard'],
            security: [{ bearerAuth: [] }],
            response: {
                200: z.object({
                    vendasMes: z.number(),
                    custoMercadoria: z.number(),
                    cmvTeorico: z.number(),
                    allItems: z.array(z.object({
                        id: z.number(),
                        name: z.string(),
                        category: z.string(),
                        quantity: z.number(),
                        revenue: z.number(),
                        image: z.string(),
                    })),
                    categories: z.array(z.string()),
                    custoEstrutura: z.object({
                        valor: z.number(),
                        periodo: z.string(),
                    }),
                }),
            },
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Fetch sales for current month
        const sales = await prisma.venda.findMany({
            where: {
                tenant_id: req.tenantId,
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
                const current = itemStats.get(sale.menu_item_id) || {
                    id: sale.menu_item_id,
                    name,
                    category,
                    quantity: 0,
                    revenue: 0,
                    image
                };

                current.quantity += sale.quantidade;
                current.revenue += receitaTotal;
                itemStats.set(sale.menu_item_id, current);
            }
        }

        const cmvTeorico = vendasMes > 0 ? (custoMercadoria / vendasMes) * 100 : 0;

        // Process Top Items
        const allItems = Array.from(itemStats.values());

        // Calculate structural costs
        const custos = await prisma.custoEstrutura.findMany({
            where: {
                tenant_id: req.tenantId,
                ativo: true
            }
        });

        const totalMensal = custos.reduce((sum, custo) => {
            return sum + Number(custo.valor_mensal);
        }, 0);

        return {
            vendasMes: Number(vendasMes.toFixed(2)),
            custoMercadoria: Number(custoMercadoria.toFixed(2)),
            cmvTeorico: Number(cmvTeorico.toFixed(2)),
            allItems,
            categories: Array.from(new Set(allItems.map(i => i.category))).sort(),
            custoEstrutura: {
                valor: Number(totalMensal.toFixed(2)),
                periodo: 'Mês',
            }
        };
    });
}
