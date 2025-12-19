import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TenantDB } from '../../core/database-tenant';
import { prisma } from '../../core/database';
import { Decimal } from '@prisma/client/runtime/library';
import { recalculationService } from '../produtos/recalculation.service';

// Schemas
const ingredientSchema = z.object({
    produto_id: z.number().optional(),
    receita_preparo_id: z.number().optional(),
    quantidade_bruta: z.number().min(0.001),
    quantidade_liquida: z.number().min(0).optional(),
    notas: z.string().optional(),
}).refine(
    (data) => (data.produto_id && !data.receita_preparo_id) || (!data.produto_id && data.receita_preparo_id),
    { message: 'Deve fornecer produto_id OU receita_preparo_id, mas não ambos' }
);

const stepSchema = z.object({
    ordem: z.number().int().min(1),
    descricao: z.string().min(1),
});

const createRecipeSchema = z.object({
    nome: z.string().min(1),
    numero_porcoes: z.number().min(0.01),
    tempo_preparacao: z.number().int().optional(),
    quantidade_total_produzida: z.number().min(0).optional(),
    unidade_medida: z.enum(['KG', 'L', 'Unidade']).optional(),
    tipo: z.enum(['Final', 'Pre-preparo']),
    descricao: z.string().optional(),
    imagem_url: z.string().url().optional().or(z.literal('')),
    video_url: z.string().url().optional().or(z.literal('')),
    categoria: z.string().optional(),
    dificuldade: z.enum(['Fácil', 'Média', 'Difícil']).optional(),
    ingredientes: z.array(ingredientSchema).min(1),
    etapas: z.array(stepSchema).optional(),
});

// Recipe Service
class RecipeService {
    private db: TenantDB;
    private tenantId: number;

    constructor(tenantId: number) {
        this.tenantId = tenantId;
        this.db = new TenantDB(tenantId);
    }

    async list(params: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        order?: 'asc' | 'desc';
        type?: 'Final' | 'Pre-preparo';
        category?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 50;
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'nome';
        const order = params.order || 'asc';

        const where: any = {
            tenant_id: this.tenantId,
            ativa: true
        };

        if (params.search) {
            where.nome = { contains: params.search };
        }

        if (params.type) {
            where.tipo = params.type;
        }

        if (params.category) {
            where.categoria = params.category;
        }

        const orderByMap: Record<string, any> = {
            nome: { nome: order },
            custo: { custo_por_porcao: order },
            tipo: { tipo: order },
        };

        const orderBy = orderByMap[sortBy] || { nome: order };

        const [total, recipes] = await Promise.all([
            prisma.receita.count({ where }),
            prisma.receita.findMany({
                where,
                orderBy,
                include: {
                    _count: {
                        select: {
                            ingredientes: true
                        }
                    }
                },
                skip,
                take: limit
            })
        ]);

        const data = recipes.map(recipe => ({
            ...recipe,
            // Convert Decimal to number for JSON serialization
            numero_porcoes: Number(recipe.numero_porcoes),
            quantidade_total_produzida: recipe.quantidade_total_produzida ? Number(recipe.quantidade_total_produzida) : null,
            custo_total: Number(recipe.custo_total),
            custo_por_porcao: Number(recipe.custo_por_porcao),
            quantidade_por_porcao: recipe.quantidade_total_produzida && recipe.numero_porcoes
                ? Number(recipe.quantidade_total_produzida) / Number(recipe.numero_porcoes)
                : null,
        }));

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getById(recipeId: number) {
        const recipe = await prisma.receita.findFirst({
            where: {
                id: recipeId,
                tenant_id: this.tenantId
            },
            include: {
                ingredientes: {
                    include: {
                        produto: {
                            select: {
                                id: true,
                                nome: true,
                                unidade_medida: true,
                                variacoes: {
                                    select: {
                                        preco_unitario: true
                                    },
                                    orderBy: [
                                        { data_ultima_compra: 'desc' },
                                        { id: 'desc' }
                                    ],
                                    take: 1
                                }
                            }
                        },
                        receitaPreparo: {
                            select: {
                                id: true,
                                nome: true,
                                unidade_medida: true,
                                custo_por_porcao: true
                            }
                        }
                    }
                },
                etapas: {
                    orderBy: { numero_etapa: 'asc' }
                },
                _count: {
                    select: {
                        ingredientes: true
                    }
                }
            }
        });

        if (!recipe) {
            throw new Error('Receita não encontrada');
        }

        return {
            ...recipe,
            numero_porcoes: Number(recipe.numero_porcoes),
            quantidade_total_produzida: recipe.quantidade_total_produzida ? Number(recipe.quantidade_total_produzida) : null,
            custo_total: Number(recipe.custo_total),
            custo_por_porcao: Number(recipe.custo_por_porcao),
            quantidade_por_porcao: recipe.quantidade_total_produzida && recipe.numero_porcoes
                ? Number(recipe.quantidade_total_produzida) / Number(recipe.quantidade_total_produzida)
                : null,
            ingredientes: recipe.ingredientes.map(ing => ({
                ...ing,
                quantidade_bruta: Number(ing.quantidade_bruta),
                quantidade_liquida: ing.quantidade_liquida ? Number(ing.quantidade_liquida) : null,
                custo_ingrediente: Number(ing.custo_ingrediente)
            }))
        };
    }

    async create(data: z.infer<typeof createRecipeSchema>) {
        // Use transaction to ensure all or nothing
        const recipe = await prisma.$transaction(async (tx) => {
            // 1. Create the recipe
            const recipe = await tx.receita.create({
                data: {
                    tenant_id: this.tenantId,
                    nome: data.nome,
                    tipo: data.tipo,
                    numero_porcoes: new Decimal(data.numero_porcoes),
                    tempo_preparacao: data.tempo_preparacao,
                    quantidade_total_produzida: data.quantidade_total_produzida
                        ? new Decimal(data.quantidade_total_produzida)
                        : null,
                    unidade_medida: data.unidade_medida,
                    descricao: data.descricao,
                    imagem_url: data.imagem_url || null,
                    video_url: data.video_url || null,
                    categoria: data.categoria,
                    dificuldade: data.dificuldade,
                    ativa: true,
                }
            });

            // 2. Add ingredients and calculate costs
            let custoTotal = new Decimal(0);

            // Separate product and pre-preparation IDs
            const productIds = data.ingredientes.filter(i => i.produto_id).map(i => i.produto_id!);
            const receitaPreparoIds = data.ingredientes.filter(i => i.receita_preparo_id).map(i => i.receita_preparo_id!);

            // Bulk fetch products
            const products = await tx.produto.findMany({
                where: {
                    id: { in: productIds },
                    tenant_id: this.tenantId
                },
                include: {
                    variacoes: {
                        where: { ativo: true },
                        orderBy: { data_ultima_compra: 'desc' },
                        take: 1
                    }
                }
            });

            // Bulk fetch pre-preparation recipes
            const receitasPreparo = await tx.receita.findMany({
                where: {
                    id: { in: receitaPreparoIds },
                    tenant_id: this.tenantId,
                    tipo: 'Pre-preparo'
                }
            });

            const produtosMap = new Map(products.map(p => [p.id, p]));
            const receitasMap = new Map(receitasPreparo.map(r => [r.id, r]));

            for (const ing of data.ingredientes) {
                let custoIngrediente: Decimal;
                let unidade: string;

                if (ing.produto_id) {
                    // Process regular product
                    const produto = produtosMap.get(ing.produto_id);

                    if (!produto) {
                        throw new Error(`Produto com ID ${ing.produto_id} não encontrado`);
                    }

                    // Get unit price from most recent variation
                    const precoUnitario = produto.variacoes[0]?.preco_unitario || new Decimal(0);
                    custoIngrediente = new Decimal(ing.quantidade_bruta).mul(precoUnitario);
                    unidade = produto.unidade_medida;
                } else if (ing.receita_preparo_id) {
                    // Process pre-preparation recipe
                    const receitaPreparo = receitasMap.get(ing.receita_preparo_id);

                    if (!receitaPreparo) {
                        throw new Error(`Receita de pré-preparo com ID ${ing.receita_preparo_id} não encontrada`);
                    }

                    // Cost = custo_por_porcao × quantidade (quantidade = number of portions)
                    custoIngrediente = receitaPreparo.custo_por_porcao.mul(new Decimal(ing.quantidade_bruta));
                    unidade = receitaPreparo.unidade_medida || 'Porção';
                } else {
                    throw new Error('Ingrediente deve ter produto_id ou receita_preparo_id');
                }

                custoTotal = custoTotal.add(custoIngrediente);

                // Calculate rentabilidade
                const qtdLiquida = ing.quantidade_liquida || ing.quantidade_bruta;
                const rentabilidade = ing.quantidade_bruta > 0
                    ? (qtdLiquida / ing.quantidade_bruta) * 100
                    : 100;

                // Insert ingredient
                await tx.ingredienteReceita.create({
                    data: {
                        tenant_id: this.tenantId,
                        receita_id: recipe.id,
                        produto_id: ing.produto_id || null,
                        receita_preparo_id: ing.receita_preparo_id || null,
                        quantidade_bruta: new Decimal(ing.quantidade_bruta),
                        quantidade_liquida: qtdLiquida ? new Decimal(qtdLiquida) : null,
                        rentabilidade: new Decimal(rentabilidade),
                        unidade: unidade,
                        custo_ingrediente: custoIngrediente,
                        notas: ing.notas,
                        ordem: 0,
                    }
                });
            }

            // 3. Calculate CMV per portion
            const custoPorPorcao = custoTotal.div(new Decimal(data.numero_porcoes));

            // 4. Update recipe with costs
            await tx.receita.update({
                where: { id: recipe.id },
                data: {
                    custo_total: custoTotal,
                    custo_por_porcao: custoPorPorcao,
                }
            });

            // 5. Add steps
            if (data.etapas && data.etapas.length > 0) {
                for (const step of data.etapas) {
                    await tx.etapaReceita.create({
                        data: {
                            tenant_id: this.tenantId,
                            receita_id: recipe.id,
                            numero_etapa: step.ordem,
                            descricao: step.descricao,
                        }
                    });
                }
            }

            // 6. Return recipe with calculated values
            return {
                ...recipe,
                numero_porcoes: Number(recipe.numero_porcoes),
                quantidade_total_produzida: recipe.quantidade_total_produzida
                    ? Number(recipe.quantidade_total_produzida)
                    : null,
                custo_total: Number(custoTotal),
                custo_por_porcao: Number(custoPorPorcao),
            };
        }, {
            maxWait: 5000,
            timeout: 20000
        });

        // Fire-and-forget recalculation to avoid blocking response
        recalculationService.recalculateAfterRecipeChange(recipe.id).catch(err => {
            console.error('Error in background recalculation:', err);
        });

        return recipe;
    }

    async update(recipeId: number, data: z.infer<typeof createRecipeSchema>) {
        const recipe = await prisma.$transaction(async (tx) => {
            // 1. Verify recipe exists and belongs to tenant
            const existing = await tx.receita.findFirst({
                where: { id: recipeId, tenant_id: this.tenantId }
            });

            if (!existing) {
                throw new Error('Receita não encontrada');
            }

            // 2. Delete existing ingredients and steps
            await tx.ingredienteReceita.deleteMany({
                where: { receita_id: recipeId }
            });

            await tx.etapaReceita.deleteMany({
                where: { receita_id: recipeId }
            });

            // 3. Fetch all products and pre-preparations and calculate costs
            const productIds = data.ingredientes.filter(i => i.produto_id).map(i => i.produto_id!);
            const receitaPreparoIds = data.ingredientes.filter(i => i.receita_preparo_id).map(i => i.receita_preparo_id!);

            const products = await tx.produto.findMany({
                where: {
                    id: { in: productIds },
                    tenant_id: this.tenantId
                },
                include: {
                    variacoes: {
                        where: { ativo: true },
                        orderBy: { data_ultima_compra: 'desc' },
                        take: 1
                    }
                }
            });

            const receitasPreparo = await tx.receita.findMany({
                where: {
                    id: { in: receitaPreparoIds },
                    tenant_id: this.tenantId,
                    tipo: 'Pre-preparo'
                }
            });

            const produtosMap = new Map(products.map(p => [p.id, p]));
            const receitasMap = new Map(receitasPreparo.map(r => [r.id, r]));
            let custoTotal = new Decimal(0);

            // Calculate total cost
            for (const ing of data.ingredientes) {
                if (ing.produto_id) {
                    const produto = produtosMap.get(ing.produto_id);
                    if (!produto) {
                        throw new Error(`Produto com ID ${ing.produto_id} não encontrado`);
                    }
                    const precoUnitario = produto.variacoes[0]?.preco_unitario || new Decimal(0);
                    custoTotal = custoTotal.add(new Decimal(ing.quantidade_bruta).mul(precoUnitario));
                } else if (ing.receita_preparo_id) {
                    const receitaPreparo = receitasMap.get(ing.receita_preparo_id);
                    if (!receitaPreparo) {
                        throw new Error(`Receita de pré-preparo com ID ${ing.receita_preparo_id} não encontrada`);
                    }
                    custoTotal = custoTotal.add(receitaPreparo.custo_por_porcao.mul(new Decimal(ing.quantidade_bruta)));
                }
            }

            const custoPorPorcao = data.numero_porcoes > 0
                ? custoTotal.div(new Decimal(data.numero_porcoes))
                : new Decimal(0);

            // 4. Update recipe
            const recipe = await tx.receita.update({
                where: { id: recipeId },
                data: {
                    nome: data.nome,
                    tipo: data.tipo,
                    numero_porcoes: new Decimal(data.numero_porcoes),
                    tempo_preparacao: data.tempo_preparacao,
                    quantidade_total_produzida: data.quantidade_total_produzida
                        ? new Decimal(data.quantidade_total_produzida)
                        : null,
                    unidade_medida: data.unidade_medida,
                    descricao: data.descricao,
                    imagem_url: data.imagem_url || null,
                    video_url: data.video_url || null,
                    categoria: data.categoria,
                    dificuldade: data.dificuldade,
                    custo_total: custoTotal,
                    custo_por_porcao: custoPorPorcao,
                }
            });

            // 5. Create new ingredients
            for (const ing of data.ingredientes) {
                let custoIngrediente: Decimal;
                let unidade: string;

                if (ing.produto_id) {
                    const produto = produtosMap.get(ing.produto_id);
                    const precoUnitario = produto?.variacoes[0]?.preco_unitario || new Decimal(0);
                    custoIngrediente = new Decimal(ing.quantidade_bruta).mul(precoUnitario);
                    unidade = produto?.unidade_medida || 'KG';
                } else if (ing.receita_preparo_id) {
                    const receitaPreparo = receitasMap.get(ing.receita_preparo_id);
                    custoIngrediente = receitaPreparo!.custo_por_porcao.mul(new Decimal(ing.quantidade_bruta));
                    unidade = receitaPreparo?.unidade_medida || 'Porção';
                } else {
                    throw new Error('Ingrediente deve ter produto_id ou receita_preparo_id');
                }

                // Calculate rentabilidade
                const qtdLiquida = ing.quantidade_liquida || ing.quantidade_bruta;
                const rentabilidade = ing.quantidade_bruta > 0
                    ? (qtdLiquida / ing.quantidade_bruta) * 100
                    : 100;

                await tx.ingredienteReceita.create({
                    data: {
                        tenant_id: this.tenantId,
                        receita_id: recipe.id,
                        produto_id: ing.produto_id || null,
                        receita_preparo_id: ing.receita_preparo_id || null,
                        quantidade_bruta: new Decimal(ing.quantidade_bruta),
                        quantidade_liquida: qtdLiquida ? new Decimal(qtdLiquida) : null,
                        rentabilidade: new Decimal(rentabilidade),
                        unidade: unidade,
                        custo_ingrediente: custoIngrediente,
                        notas: ing.notas,
                        ordem: 0,
                    }
                });
            }

            // 6. Create new steps
            if (data.etapas && data.etapas.length > 0) {
                for (const step of data.etapas) {
                    await tx.etapaReceita.create({
                        data: {
                            tenant_id: this.tenantId,
                            receita_id: recipe.id,
                            numero_etapa: step.ordem,
                            descricao: step.descricao,
                        }
                    });
                }
            }

            return {
                ...recipe,
                numero_porcoes: Number(recipe.numero_porcoes),
                quantidade_total_produzida: recipe.quantidade_total_produzida
                    ? Number(recipe.quantidade_total_produzida)
                    : null,
                custo_total: Number(custoTotal),
                custo_por_porcao: Number(custoPorPorcao),
            };
        }, {
            maxWait: 5000,
            timeout: 20000
        });

        // 7. Trigger cascade recalculation asynchronously
        recalculationService.recalculateAfterRecipeChange(recipeId).catch(err => {
            console.error('Error in background recalculation:', err);
        });

        return recipe;
    }

    async delete(recipeId: number) {
        // 1. Check if recipe exists and belongs to tenant
        const recipe = await prisma.receita.findFirst({
            where: { id: recipeId, tenant_id: this.tenantId }
        });

        if (!recipe) {
            throw new Error('Receita não encontrada');
        }

        // 2. Check if recipe is used as ingredient in other recipes
        const usedInRecipes = await prisma.ingredienteReceita.count({
            where: { receita_preparo_id: recipeId }
        });

        if (usedInRecipes > 0) {
            throw new Error(`Esta receita é usada como ingrediente em ${usedInRecipes} outra(s) receita(s). Não pode ser eliminada.`);
        }

        // 3. Check if recipe is used in menus
        const usedInMenus = await prisma.menuItem.count({
            where: { receita_id: recipeId }
        });

        if (usedInMenus > 0) {
            throw new Error(`Esta receita é usada em ${usedInMenus} menu(s). Não pode ser eliminada.`);
        }

        // 4. Delete recipe (cascade will handle ingredients and steps)
        await prisma.receita.delete({
            where: { id: recipeId }
        });

        return { success: true, message: 'Receita eliminada com sucesso' };
    }
}

// Routes
export async function recipeRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            querystring: z.object({
                page: z.string().optional(),
                limit: z.string().optional(),
                search: z.string().optional(),
                sortBy: z.string().optional(),
                order: z.enum(['asc', 'desc']).optional(),
                type: z.enum(['Final', 'Pre-preparo']).optional(),
                category: z.string().optional(),
            }),
            tags: ['Recipes'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new RecipeService(req.tenantId);

        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

        return service.list({
            page,
            limit,
            search: req.query.search,
            sortBy: req.query.sortBy,
            order: req.query.order,
            type: req.query.type,
            category: req.query.category
        });
    });

    app.withTypeProvider<ZodTypeProvider>().get('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Recipes'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new RecipeService(req.tenantId);
        const recipeId = parseInt(req.params.id);

        try {
            return await service.getById(recipeId);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createRecipeSchema,
            tags: ['Recipes'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new RecipeService(req.tenantId);

        try {
            const recipe = await service.create(req.body);
            return reply.status(201).send(recipe);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().put('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            body: createRecipeSchema,
            tags: ['Recipes'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new RecipeService(req.tenantId);
        const recipeId = parseInt(req.params.id);

        try {
            const recipe = await service.update(recipeId, req.body);
            return reply.send(recipe);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().delete('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Recipes'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new RecipeService(req.tenantId);
        const recipeId = parseInt(req.params.id);

        try {
            const result = await service.delete(recipeId);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
