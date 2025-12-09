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
        tipo: z.enum(['receita', 'combo', 'produto', 'formato_venda']),
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
    private recipesCache: Map<number, any> = new Map();
    private combosCache: Map<number, any> = new Map();
    private productsCache: Map<number, any> = new Map();

    constructor(tenantId: number) {
        this.tenantId = tenantId;
        this.consumptionMap = new Map();
    }

    /**
     * Calculate consumption for a date range
     */
    async calculateConsumption(dataInicio: string, dataFim: string) {
        this.consumptionMap.clear();

        // 1. Fetch all sales in the period (optimized query)
        const vendas = await prisma.venda.findMany({
            where: {
                tenant_id: this.tenantId,
                data_venda: {
                    gte: new Date(dataInicio),
                    lte: new Date(`${dataFim}T23:59:59`),
                },
            },
            select: {
                quantidade: true,
                menuItem: {
                    select: {
                        receita_id: true,
                        combo_id: true,
                    }
                }
            }
        });

        // 2. Collect all IDs to pre-fetch
        const recipeIds = new Set<number>();
        const comboIds = new Set<number>();

        for (const venda of vendas) {
            if (venda.menuItem?.receita_id) recipeIds.add(venda.menuItem.receita_id);
            if (venda.menuItem?.combo_id) comboIds.add(venda.menuItem.combo_id);
        }

        // 3. Batch load everything
        await this.preloadData(recipeIds, comboIds);

        // 4. Process sales in memory
        for (const venda of vendas) {
            if (!venda.menuItem) continue;

            const quantidade = venda.quantidade;

            if (venda.menuItem.receita_id) {
                this.processRecipe(venda.menuItem.receita_id, quantidade);
            } else if (venda.menuItem.combo_id) {
                this.processCombo(venda.menuItem.combo_id, quantidade);
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
     * Get all active recipes for simulation
     */
    async getRecipesForSimulation() {
        return prisma.receita.findMany({
            where: {
                tenant_id: this.tenantId,
                ativa: true,
                tipo: 'Final'
            },
            select: {
                id: true,
                nome: true,
            },
            orderBy: { nome: 'asc' }
        });
    }

    /**
     * Get all active combos for simulation
     */
    async getCombosForSimulation() {
        return prisma.combo.findMany({
            where: {
                tenant_id: this.tenantId,
                ativo: true
            },
            select: {
                id: true,
                nome: true,
            },
            orderBy: { nome: 'asc' }
        });
    }

    /**
     * Get all active sales formats (products) for simulation
     */
    async getSalesFormatsForSimulation() {
        const formats = await prisma.formatoVenda.findMany({
            where: {
                tenant_id: this.tenantId,
                ativo: true,
                produto: {
                    ativo: true
                }
            },
            select: {
                id: true,
                nome: true,
                unidade_medida: true,
                produto: {
                    select: {
                        nome: true
                    }
                }
            },
            orderBy: { nome: 'asc' }
        });

        return formats.map(f => ({
            id: f.id,
            nome: f.nome,
            unidade_medida: f.unidade_medida
        }));
    }

    /**
     * Calculate consumption for a simulation (list of items)
     */
    async calculateSimulation(itens: { tipo: 'receita' | 'combo' | 'produto' | 'formato_venda'; id: number; quantidade: number }[]) {
        this.consumptionMap.clear();

        // 1. Collect all IDs to pre-fetch
        const recipeIds = new Set<number>();
        const comboIds = new Set<number>();
        const productIds = new Set<number>();
        const formatIds = new Set<number>();

        for (const item of itens) {
            if (item.tipo === 'receita') recipeIds.add(item.id);
            else if (item.tipo === 'combo') comboIds.add(item.id);
            else if (item.tipo === 'produto') productIds.add(item.id);
            else if (item.tipo === 'formato_venda') formatIds.add(item.id);
        }

        // 2. Batch load everything
        // We need to load formats first to get their product IDs
        const formatsCache = new Map<number, any>();
        if (formatIds.size > 0) {
            const formats = await prisma.formatoVenda.findMany({
                where: { id: { in: Array.from(formatIds) }, tenant_id: this.tenantId },
                include: { produto: true }
            });
            for (const f of formats) {
                formatsCache.set(f.id, f);
                if (f.produto_id) productIds.add(f.produto_id);
            }
        }

        await this.preloadData(recipeIds, comboIds, productIds);

        // 3. Process items in memory
        for (const item of itens) {
            if (item.tipo === 'receita') {
                this.processRecipe(item.id, item.quantidade);
            } else if (item.tipo === 'combo') {
                this.processCombo(item.id, item.quantidade);
            } else if (item.tipo === 'produto') {
                const product = this.productsCache.get(item.id);
                if (product) {
                    this.addConsumption(item.id, product, new Decimal(item.quantidade));
                }
            } else if (item.tipo === 'formato_venda') {
                const format = formatsCache.get(item.id);
                if (format && format.produto) {
                    const product = this.productsCache.get(format.produto_id);
                    if (product) {
                        const qtd = new Decimal(item.quantidade).times(format.quantidade_vendida);
                        this.addConsumption(format.produto_id, product, qtd);
                    }
                }
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
     * Pre-load all necessary data (Recipes, Combos, Products)
     * Handles recursive dependencies (Recipe -> Sub-Recipe)
     */
    private async preloadData(
        initialRecipeIds: Set<number>,
        initialComboIds: Set<number>,
        initialProductIds?: Set<number>
    ) {
        const recipesToLoad = new Set(initialRecipeIds);
        const combosToLoad = new Set(initialComboIds);
        const productsToLoad = new Set(initialProductIds);

        // Load initial products if any
        if (productsToLoad.size > 0) {
            const products = await prisma.produto.findMany({
                where: {
                    id: { in: Array.from(productsToLoad) },
                    tenant_id: this.tenantId
                },
                include: {
                    variacoes: {
                        where: { ativo: true },
                        orderBy: [{ data_ultima_compra: 'desc' }, { id: 'desc' }],
                        take: 1
                    }
                }
            });

            for (const p of products) {
                this.productsCache.set(p.id, p);
            }
        }

        // Loop until no new items need loading
        while (recipesToLoad.size > 0 || combosToLoad.size > 0) {
            // 1. Fetch Recipes
            if (recipesToLoad.size > 0) {
                const recipes = await prisma.receita.findMany({
                    where: {
                        id: { in: Array.from(recipesToLoad) },
                        tenant_id: this.tenantId
                    },
                    include: {
                        ingredientes: {
                            include: {
                                produto: {
                                    include: {
                                        variacoes: {
                                            where: { ativo: true },
                                            orderBy: [{ data_ultima_compra: 'desc' }, { id: 'desc' }],
                                            take: 1
                                        }
                                    }
                                },
                            },
                        },
                    },
                });

                recipesToLoad.clear(); // Clear current batch

                for (const recipe of recipes) {
                    if (this.recipesCache.has(recipe.id)) continue;

                    this.recipesCache.set(recipe.id, recipe);

                    // Check for sub-recipes (pre-preps)
                    for (const ing of recipe.ingredientes) {
                        if (ing.receita_preparo_id && !this.recipesCache.has(ing.receita_preparo_id)) {
                            recipesToLoad.add(ing.receita_preparo_id);
                        }
                        // Cache product details if present
                        if (ing.produto && !this.productsCache.has(ing.produto.id)) {
                            this.productsCache.set(ing.produto.id, ing.produto);
                        }
                    }
                }
            }

            // 2. Fetch Combos
            if (combosToLoad.size > 0) {
                const combos = await prisma.combo.findMany({
                    where: {
                        id: { in: Array.from(combosToLoad) },
                        tenant_id: this.tenantId
                    },
                    include: {
                        itens: {
                            include: {
                                produto: {
                                    include: {
                                        variacoes: {
                                            where: { ativo: true },
                                            orderBy: [{ data_ultima_compra: 'desc' }, { id: 'desc' }],
                                            take: 1
                                        }
                                    }
                                }
                            }
                        },
                        categorias: {
                            include: {
                                opcoes: {
                                    include: {
                                        formatoVenda: {
                                            include: {
                                                produto: {
                                                    include: {
                                                        variacoes: {
                                                            where: { ativo: true },
                                                            orderBy: [{ data_ultima_compra: 'desc' }, { id: 'desc' }],
                                                            take: 1
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                    },
                                },
                            },
                        },
                    },
                });

                combosToLoad.clear();

                for (const combo of combos) {
                    if (this.combosCache.has(combo.id)) continue;

                    this.combosCache.set(combo.id, combo);

                    // Check dependencies
                    for (const item of combo.itens) {
                        if (item.receita_id && !this.recipesCache.has(item.receita_id)) {
                            recipesToLoad.add(item.receita_id);
                        }
                        if (item.produto && !this.productsCache.has(item.produto.id)) {
                            this.productsCache.set(item.produto.id, item.produto);
                        }
                    }

                    for (const cat of combo.categorias) {
                        for (const opc of cat.opcoes) {
                            if (opc.receita_id && !this.recipesCache.has(opc.receita_id)) {
                                recipesToLoad.add(opc.receita_id);
                            }
                            if (opc.formatoVenda?.produto && !this.productsCache.has(opc.formatoVenda.produto.id)) {
                                this.productsCache.set(opc.formatoVenda.produto.id, opc.formatoVenda.produto);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Convert map to array and fetch current prices
     */
    private async getConsumptionsList(): Promise<ProductConsumption[]> {
        const consumos: ProductConsumption[] = [];

        for (const [produtoId, data] of this.consumptionMap.entries()) {
            // Use cached product variation if available, otherwise fetch?
            // We already fetched variations in preloadData for most cases.
            // But let's be safe and use what we have in the product object.

            const produto = data.produto;
            const variacao = produto.variacoes?.[0]; // Assuming we included it

            // If not found (e.g. from old code path or missing include), fallback to DB fetch?
            // For performance, we should rely on preload.

            const precoUnitario = variacao?.preco_unitario || produto.custo_unitario || new Decimal(0);
            const quantidadeNum = Number(data.quantidade);
            const precoNum = Number(precoUnitario);

            consumos.push({
                produto_id: produtoId,
                codigo: produto.codigo,
                nome: produto.nome,
                unidade_medida: produto.unidade_medida,
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
    private processRecipe(receitaId: number, multiplicador: number) {
        const receita = this.recipesCache.get(receitaId);
        if (!receita) return;

        // Calculate ratio based on portions
        const porcoes = Number(receita.numero_porcoes) || 1;
        const ratio = new Decimal(multiplicador).div(porcoes);

        for (const ingrediente of receita.ingredientes) {
            if (ingrediente.produto_id) {
                // Direct product ingredient
                const produto = this.productsCache.get(ingrediente.produto_id);
                if (produto) {
                    this.addConsumption(
                        ingrediente.produto_id,
                        produto,
                        new Decimal(ingrediente.quantidade_bruta).times(ratio)
                    );
                }
            } else if (ingrediente.receita_preparo_id) {
                // Pre-prep recipe - process recursively
                this.processRecipe(
                    ingrediente.receita_preparo_id,
                    Number(new Decimal(ingrediente.quantidade_bruta).times(ratio))
                );
            }
        }
    }

    /**
     * Process a combo and add items to consumption map
     */
    private processCombo(comboId: number, multiplicador: number) {
        const combo = this.combosCache.get(comboId);
        if (!combo) return;

        // Process fixed items
        for (const item of combo.itens) {
            const quantidade = new Decimal(item.quantidade).times(multiplicador);

            if (item.produto_id) {
                const produto = this.productsCache.get(item.produto_id);
                if (produto) {
                    this.addConsumption(item.produto_id, produto, quantidade);
                }
            } else if (item.receita_id) {
                this.processRecipe(item.receita_id, Number(quantidade));
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
                const produto = this.productsCache.get(maxOption.formatoVenda.produto.id);
                if (produto) {
                    const qtdPorUnidade = maxOption.formatoVenda.quantidade_vendida;
                    const totalQtd = new Decimal(qtdPorUnidade).times(multiplicador);

                    this.addConsumption(
                        maxOption.formatoVenda.produto_id,
                        produto,
                        totalQtd
                    );
                }
            } else if (maxOption.receita_id) {
                this.processRecipe(maxOption.receita_id, multiplicador);
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

    // GET /consumos/items/recipes
    fastify.get('/consumos/items/recipes', async (request, reply) => {
        const tenantId = (request as any).tenantId;
        if (!tenantId) return reply.code(401).send({ error: 'Unauthorized' });
        const service = new ConsumptionService(tenantId);
        return service.getRecipesForSimulation();
    });

    // GET /consumos/items/combos
    fastify.get('/consumos/items/combos', async (request, reply) => {
        const tenantId = (request as any).tenantId;
        if (!tenantId) return reply.code(401).send({ error: 'Unauthorized' });
        const service = new ConsumptionService(tenantId);
        return service.getCombosForSimulation();
    });

    // GET /consumos/items/sales-formats
    fastify.get('/consumos/items/sales-formats', async (request, reply) => {
        const tenantId = (request as any).tenantId;
        if (!tenantId) return reply.code(401).send({ error: 'Unauthorized' });
        const service = new ConsumptionService(tenantId);
        return service.getSalesFormatsForSimulation();
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
        // @ts-ignore - Zod schema allows 'produto' but TS inference might be tricky if not explicit
        const result = await service.calculateSimulation(itens);

        return reply.send(result);
    });
}
