import { FastifyInstance } from 'fastify';
import { prisma } from '../../core/database';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// DTO for consumption query
const consumptionQuerySchema = z.object({
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// DTO for simulation
const simulationSchema = z.object({
    itens: z.array(z.object({
        tipo: z.enum(['receita', 'combo']),
        id: z.number(),
        quantidade: z.number().min(0),
    })),
});

interface ProductConsumption {
    produto_id: number;
    codigo: string;
    nome: string;
    unidade_medida: string;
    quantidade_consumida: number;
    preco_unitario: number;
    custo_total: number;
}

class ConsumptionService {
    private tenantId: number;
    private consumptionMap: Map<number, { quantidade: Decimal; produto: any }>;

    constructor(tenantId: number) {
        this.tenantId = tenantId;
        this.consumptionMap = new Map();
    }

    /**
     * Calculate consumption for a date range
     */
    async calculateConsumption(dataInicio: string, dataFim: string) {
        this.consumptionMap.clear();

        // Fetch all sales in the period
        const vendas = await prisma.venda.findMany({
            where: {
                tenant_id: this.tenantId,
                data_venda: {
                    gte: new Date(dataInicio),
                    lte: new Date(`${dataFim}T23:59:59`),
                },
            },
            include: {
                menuItem: {
                    include: {
                        receita: true,
                        combo: true,
                    },
                },
            },
        });

        // Process each sale
        for (const venda of vendas) {
            if (!venda.menuItem) continue;

            const quantidade = venda.quantidade;

            if (venda.menuItem.receita_id) {
                await this.processRecipe(venda.menuItem.receita_id, quantidade);
            } else if (venda.menuItem.combo_id) {
                await this.processCombo(venda.menuItem.combo_id, quantidade);
            }
        }

        const consumos = await this.getConsumptionsList();

        return {
            periodo: {
                inicio: dataInicio,
                fim: dataFim,
            },
            total_vendas: vendas.length,
            custo_total: consumos.reduce((sum, c) => sum + c.custo_total, 0),
            consumos,
        };
    }

    /**
     * Calculate consumption for a simulation (list of items)
     */
    async calculateSimulation(itens: { tipo: 'receita' | 'combo'; id: number; quantidade: number }[]) {
        this.consumptionMap.clear();

        for (const item of itens) {
            if (item.tipo === 'receita') {
                await this.processRecipe(item.id, item.quantidade);
            } else if (item.tipo === 'combo') {
                await this.processCombo(item.id, item.quantidade);
            }
        }

        const consumos = await this.getConsumptionsList();

        return {
            total_itens: itens.length,
            custo_total: consumos.reduce((sum, c) => sum + c.custo_total, 0),
            consumos,
        };
    }

    /**
     * Convert map to array and fetch current prices
     */
    private async getConsumptionsList(): Promise<ProductConsumption[]> {
        const consumos: ProductConsumption[] = [];

        for (const [produtoId, data] of this.consumptionMap.entries()) {
            // Fetch current unit price
            const variacao = await prisma.variacaoProduto.findFirst({
                where: {
                    produto_id: produtoId,
                    ativo: true,
                },
                orderBy: [
                    { data_ultima_compra: 'desc' },
                    { id: 'desc' },
                ],
            });

            const precoUnitario = variacao?.preco_unitario || new Decimal(0);
            const quantidadeNum = Number(data.quantidade);
            const precoNum = Number(precoUnitario);

            consumos.push({
                produto_id: produtoId,
                codigo: data.produto.codigo,
                nome: data.produto.nome,
                unidade_medida: data.produto.unidade_medida,
                quantidade_consumida: quantidadeNum,
                preco_unitario: precoNum,
                custo_total: quantidadeNum * precoNum,
            });
        }

        // Sort by cost (descending)
        consumos.sort((a, b) => b.custo_total - a.custo_total);

        return consumos;
    }

    /**
     * Process a recipe and add ingredients to consumption map
     */
    private async processRecipe(receitaId: number, multiplicador: number) {
        const receita = await prisma.receita.findUnique({
            where: { id: receitaId },
            include: {
                ingredientes: {
                    include: {
                        produto: true,
                        receitaPreparo: true,
                    },
                },
            },
        });

        if (!receita) return;

        for (const ingrediente of receita.ingredientes) {
            if (ingrediente.produto_id) {
                // Direct product ingredient
                this.addConsumption(
                    ingrediente.produto_id,
                    ingrediente.produto!,
                    new Decimal(ingrediente.quantidade_bruta).times(multiplicador)
                );
            } else if (ingrediente.receita_preparo_id) {
                // Pre-prep recipe - process recursively
                await this.processRecipe(ingrediente.receita_preparo_id, multiplicador);
            }
        }
    }

    /**
     * Process a combo and add items to consumption map
     */
    private async processCombo(comboId: number, multiplicador: number) {
        const combo = await prisma.combo.findUnique({
            where: { id: comboId },
            include: {
                itens: {
                    include: {
                        produto: true,
                        receita: true,
                    },
                },
                categorias: {
                    include: {
                        opcoes: {
                            include: {
                                formatoVenda: {
                                    include: {
                                        produto: true
                                    }
                                },
                                receita: true,
                            },
                        },
                    },
                },
            },
        });

        if (!combo) return;

        // Process fixed items
        for (const item of combo.itens) {
            const quantidade = new Decimal(item.quantidade).times(multiplicador);

            if (item.produto_id) {
                this.addConsumption(item.produto_id, item.produto!, quantidade);
            } else if (item.receita_id) {
                await this.processRecipe(item.receita_id, Number(quantidade));
            }
        }

        // Process categories - assume worst case (most expensive option)
        for (const categoria of combo.categorias) {
            if (categoria.opcoes.length === 0) continue;

            // Find most expensive option
            let maxOption = categoria.opcoes[0];
            let maxCost = new Decimal(maxOption.custo_unitario);

            for (const opcao of categoria.opcoes) {
                const cost = new Decimal(opcao.custo_unitario);
                if (cost.greaterThan(maxCost)) {
                    maxCost = cost;
                    maxOption = opcao;
                }
            }

            // Add the most expensive option
            if (maxOption.formato_venda_id && maxOption.formatoVenda?.produto) {
                // Use the quantity from the format * multiplier
                // Note: FormatoVenda has quantidade_vendida, but here we are just counting the item itself.
                // The consumption is based on the product linked to the format.
                // Usually FormatoVenda implies 1 unit of that format.
                // But we need to check if we should use quantidade_vendida from FormatoVenda?
                // Assuming FormatoVenda maps to a product consumption.
                // Let's use the FormatoVenda's quantity sold as the amount of product consumed per unit.
                const qtdPorUnidade = maxOption.formatoVenda.quantidade_vendida;
                const totalQtd = new Decimal(qtdPorUnidade).times(multiplicador);

                this.addConsumption(
                    maxOption.formatoVenda.produto_id,
                    maxOption.formatoVenda.produto!,
                    totalQtd
                );
            } else if (maxOption.receita_id) {
                await this.processRecipe(maxOption.receita_id, multiplicador);
            }
        }
    }

    /**
     * Add or update consumption for a product
     */
    private addConsumption(produtoId: number, produto: any, quantidade: Decimal) {
        const existing = this.consumptionMap.get(produtoId);

        if (existing) {
            existing.quantidade = existing.quantidade.plus(quantidade);
        } else {
            this.consumptionMap.set(produtoId, {
                quantidade,
                produto,
            });
        }
    }
}

export async function consumosRoutes(fastify: FastifyInstance) {
    // GET /consumos - Calculate consumption for a period
    fastify.get('/consumos', async (request, reply) => {
        const tenantId = (request as any).tenantId;

        if (!tenantId) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const query = consumptionQuerySchema.safeParse(request.query);

        if (!query.success) {
            return reply.code(400).send({
                error: 'Invalid query parameters',
                details: query.error.errors,
            });
        }

        const { data_inicio, data_fim } = query.data;

        const service = new ConsumptionService(tenantId);
        const result = await service.calculateConsumption(data_inicio, data_fim);

        return reply.send(result);
    });

    // POST /consumos/simulacao - Calculate consumption for a simulation
    fastify.post('/consumos/simulacao', async (request, reply) => {
        const tenantId = (request as any).tenantId;

        if (!tenantId) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const body = simulationSchema.safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({
                error: 'Invalid body parameters',
                details: body.error.errors,
            });
        }

        const { itens } = body.data;

        const service = new ConsumptionService(tenantId);
        const result = await service.calculateSimulation(itens);

        return reply.send(result);
    });
}
