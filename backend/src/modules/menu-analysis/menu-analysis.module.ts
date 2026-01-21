import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';
import { subDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

// Types
type Classification = 'star' | 'puzzle' | 'workhorse' | 'dog';

interface MenuAnalysisItem {
    id: number;
    nome_comercial: string;
    categoria_menu: string | null;
    pvp: number;
    margemContribuicao: number;
    margemPercentual: number;
    volumeVendas: number;
    receitaTotal: number;
    custoMedio: number;
    classification: Classification;
    imagemUrl: string | null;
}

interface MenuAnalysisSummary {
    totalItems: number;
    totalRevenue: number;
    avgMarginPercent: number;
    categories: {
        stars: number;
        puzzles: number;
        workhorses: number;
        dogs: number;
    };
    thresholds: {
        medianMargin: number;
        medianVolume: number;
    };
}

interface MenuAnalysisResponse {
    items: MenuAnalysisItem[];
    summary: MenuAnalysisSummary;
}

class MenuAnalysisService {
    constructor(private tenantId: number) { }

    async analyze(startDate: Date, endDate: Date, categoriaMenu?: string): Promise<MenuAnalysisResponse> {
        // 1. Fetch all active menu items
        const menuItems = await prisma.menuItem.findMany({
            where: {
                tenant_id: this.tenantId,
                ativo: true,
                ...(categoriaMenu ? { categoria_menu: categoriaMenu } : {})
            },
            include: {
                receita: {
                    select: {
                        custo_por_porcao: true
                    }
                },
                combo: {
                    select: {
                        custo_total: true
                    }
                },
                formatoVenda: {
                    select: {
                        custo_unitario: true
                    }
                }
            }
        });

        // 2. For each item, calculate metrics
        const itemsWithMetrics: MenuAnalysisItem[] = [];

        for (const item of menuItems) {
            // Fetch sales for this item in the period
            const sales = await prisma.venda.findMany({
                where: {
                    tenant_id: this.tenantId,
                    menu_item_id: item.id,
                    data_venda: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                select: {
                    quantidade: true,
                    receita_total: true,
                    custo_total: true,
                    pvp_praticado: true  // IMPORTANT: Historical price
                }
            });

            // Calculate metrics
            const volumeVendas = sales.reduce((sum, sale) => sum + sale.quantidade, 0);
            const receitaTotal = Number(sales.reduce((sum, sale) => sum + Number(sale.receita_total), 0));

            // Calculate margin using HISTORICAL prices (pvp_praticado) and costs
            let margemContribuicao = 0;
            let pvpMedio = Number(item.pvp); // Fallback to current PVP

            if (sales.length > 0 && sales.some(s => s.custo_total)) {
                // Calculate weighted average margin from actual sales
                const totalMargin = sales.reduce((sum, sale) => {
                    const pvpSale = Number(sale.pvp_praticado);
                    const custoUnitario = Number(sale.custo_total || 0) / sale.quantidade;
                    const margemSale = pvpSale - custoUnitario;
                    return sum + (margemSale * sale.quantidade); // weighted by quantity
                }, 0);

                // Weighted average PVP
                const totalPvpWeighted = sales.reduce((sum, sale) => {
                    return sum + (Number(sale.pvp_praticado) * sale.quantidade);
                }, 0);

                margemContribuicao = volumeVendas > 0 ? totalMargin / volumeVendas : 0;
                pvpMedio = volumeVendas > 0 ? totalPvpWeighted / volumeVendas : Number(item.pvp);
            } else {
                // Fallback: no sales with cost data, use current item data
                let custoMedio = 0;
                if (item.receita) {
                    custoMedio = Number(item.receita.custo_por_porcao);
                } else if (item.combo) {
                    custoMedio = Number(item.combo.custo_total);
                } else if (item.formatoVenda) {
                    custoMedio = Number(item.formatoVenda.custo_unitario);
                }
                margemContribuicao = Number(item.pvp) - custoMedio;
                pvpMedio = Number(item.pvp);
            }

            const margemPercentual = pvpMedio > 0 ? (margemContribuicao / pvpMedio) * 100 : 0;
            const custoMedio = pvpMedio - margemContribuicao;

            itemsWithMetrics.push({
                id: item.id,
                nome_comercial: item.nome_comercial,
                categoria_menu: item.categoria_menu,
                pvp: pvpMedio, // Now represents average historical PVP
                margemContribuicao,
                margemPercentual,
                volumeVendas,
                receitaTotal,
                custoMedio,
                classification: 'dog', // Will be calculated later
                imagemUrl: item.imagem_url
            });
        }

        // 3. Calculate thresholds (median)
        const margins = itemsWithMetrics.map(i => i.margemContribuicao).sort((a, b) => a - b);
        const volumes = itemsWithMetrics.map(i => i.volumeVendas).sort((a, b) => a - b);

        const medianMargin = this.calculateMedian(margins);
        const medianVolume = this.calculateMedian(volumes);

        // 4. Classify each item
        itemsWithMetrics.forEach(item => {
            item.classification = this.classifyItem(
                item.margemContribuicao,
                item.volumeVendas,
                medianMargin,
                medianVolume
            );
        });

        // 5. Calculate summary
        const totalRevenue = itemsWithMetrics.reduce((sum, i) => sum + i.receitaTotal, 0);
        const avgMarginPercent = itemsWithMetrics.length > 0
            ? itemsWithMetrics.reduce((sum, i) => sum + i.margemPercentual, 0) / itemsWithMetrics.length
            : 0;

        const categories = {
            stars: itemsWithMetrics.filter(i => i.classification === 'star').length,
            puzzles: itemsWithMetrics.filter(i => i.classification === 'puzzle').length,
            workhorses: itemsWithMetrics.filter(i => i.classification === 'workhorse').length,
            dogs: itemsWithMetrics.filter(i => i.classification === 'dog').length
        };

        const summary: MenuAnalysisSummary = {
            totalItems: itemsWithMetrics.length,
            totalRevenue,
            avgMarginPercent,
            categories,
            thresholds: {
                medianMargin,
                medianVolume
            }
        };

        return {
            items: itemsWithMetrics,
            summary
        };
    }

    private calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
            return sorted[mid];
        }
    }

    private classifyItem(
        margin: number,
        volume: number,
        medianMargin: number,
        medianVolume: number
    ): Classification {
        const highMargin = margin > medianMargin;
        const highVolume = volume > medianVolume;

        if (highMargin && highVolume) return 'star';
        if (highMargin && !highVolume) return 'puzzle';
        if (!highMargin && highVolume) return 'workhorse';
        return 'dog';
    }
}

export async function menuAnalysisRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/analysis', {
        schema: {
            tags: ['Menu Analysis'],
            security: [{ bearerAuth: [] }],
            querystring: z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                categoriaMenu: z.string().optional()
            }),
            response: {
                200: z.object({
                    items: z.array(z.object({
                        id: z.number(),
                        nome_comercial: z.string(),
                        categoria_menu: z.string().nullable(),
                        pvp: z.number(),
                        margemContribuicao: z.number(),
                        margemPercentual: z.number(),
                        volumeVendas: z.number(),
                        receitaTotal: z.number(),
                        custoMedio: z.number(),
                        classification: z.enum(['star', 'puzzle', 'workhorse', 'dog']),
                        imagemUrl: z.string().nullable()
                    })),
                    summary: z.object({
                        totalItems: z.number(),
                        totalRevenue: z.number(),
                        avgMarginPercent: z.number(),
                        categories: z.object({
                            stars: z.number(),
                            puzzles: z.number(),
                            workhorses: z.number(),
                            dogs: z.number()
                        }),
                        thresholds: z.object({
                            medianMargin: z.number(),
                            medianVolume: z.number()
                        })
                    })
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        // Default to last 30 days if not provided
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : subDays(endDate, 30);

        const categoriaMenu = req.query.categoriaMenu;

        const service = new MenuAnalysisService(req.tenantId);
        const result = await service.analyze(startDate, endDate, categoriaMenu);

        return result;
    });
}

export { MenuAnalysisService };
