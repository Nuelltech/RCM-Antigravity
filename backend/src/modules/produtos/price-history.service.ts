import { prisma } from '../../core/database';
import { Decimal } from '@prisma/client/runtime/library';

export class PriceHistoryService {
    /**
     * Create a price history record
     */
    async createPriceHistory(params: {
        tenantId: number;
        variacaoId: number;
        precoAnterior: Decimal;
        precoNovo: Decimal;
        precoUnitarioAnterior?: Decimal;
        precoUnitarioNovo?: Decimal;
        origem: 'MANUAL' | 'COMPRA' | 'SISTEMA';
        alteradoPor?: number;
        receitasAfetadas?: number;
        menusAfetados?: number;
    }) {
        let percentualMudanca = new Decimal(0);

        if (params.precoUnitarioAnterior && params.precoUnitarioNovo && params.precoUnitarioAnterior.greaterThan(0)) {
            percentualMudanca = params.precoUnitarioNovo
                .minus(params.precoUnitarioAnterior)
                .dividedBy(params.precoUnitarioAnterior)
                .times(100);
        } else if (params.precoAnterior.greaterThan(0)) {
            percentualMudanca = params.precoNovo
                .minus(params.precoAnterior)
                .dividedBy(params.precoAnterior)
                .times(100);
        }

        return await prisma.historicoPreco.create({
            data: {
                tenant_id: params.tenantId,
                variacao_produto_id: params.variacaoId,
                preco_anterior: params.precoAnterior,
                preco_novo: params.precoNovo,
                preco_unitario_anterior: params.precoUnitarioAnterior,
                preco_unitario_novo: params.precoUnitarioNovo,
                percentual_mudanca: percentualMudanca,
                origem: params.origem,
                alterado_por: params.alteradoPor,
                receitas_afetadas: params.receitasAfetadas || 0,
                menus_afetados: params.menusAfetados || 0,
            },
            include: {
                variacao: {
                    include: {
                        produto: true,
                    },
                },
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Get price history for a product variation
     */
    async getPriceHistory(variacaoId: number, limit: number = 50) {
        return await prisma.historicoPreco.findMany({
            where: {
                variacao_produto_id: variacaoId,
            },
            include: {
                variacao: {
                    include: {
                        produto: {
                            select: {
                                id: true,
                                nome: true,
                                codigo_interno: true,
                            },
                        },
                    },
                },
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                data_mudanca: 'desc',
            },
            take: limit,
        });
    }

    /**
     * Get the most recent price change
     */
    async getLastPriceChange(variacaoId: number) {
        return await prisma.historicoPreco.findFirst({
            where: {
                variacao_produto_id: variacaoId,
            },
            orderBy: {
                data_mudanca: 'desc',
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
            },
        });
    }

    /**
     * Get price trend statistics
     */
    async getPriceTrend(variacaoId: number, days: number = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const history = await prisma.historicoPreco.findMany({
            where: {
                variacao_produto_id: variacaoId,
                data_mudanca: {
                    gte: since,
                },
            },
            orderBy: {
                data_mudanca: 'asc',
            },
        });

        if (history.length === 0) {
            return null;
        }

        const firstPrice = history[0].preco_anterior;
        const lastPrice = history[history.length - 1].preco_novo;
        const totalChange = lastPrice.minus(firstPrice);
        const percentChange = firstPrice.greaterThan(0)
            ? totalChange.dividedBy(firstPrice).times(100)
            : new Decimal(0);

        return {
            period_days: days,
            initial_price: firstPrice,
            final_price: lastPrice,
            total_change: totalChange,
            percent_change: percentChange,
            num_changes: history.length,
            trend: totalChange.greaterThan(0) ? 'UP' : totalChange.lessThan(0) ? 'DOWN' : 'STABLE',
        };
    }
}

export const priceHistoryService = new PriceHistoryService();
