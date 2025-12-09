import { prisma } from '../../core/database';
import { Decimal } from '@prisma/client/runtime/library';

export class RecalculationService {
    /**
     * Main entry point: Recalculate all entities after a price change
     */
    async recalculateAfterPriceChange(produtoId: number) {
        const affectedRecipes = new Set<number>();
        const affectedMenuItems = new Set<number>();
        const affectedCombos = new Set<number>();

        // STEP 1: Recalculate recipes that DIRECTLY use this product
        await this.recalculateRecipesUsingProduct(produtoId, affectedRecipes);

        // STEP 2: RECURSIVELY recalculate recipes that use affected pre-prep recipes
        await this.recalculateRecipesUsingPrepreps(affectedRecipes);

        // STEP 3: Recalculate combos that use this product or affected recipes
        await this.recalculateCombosUsingProduct(produtoId, affectedCombos);
        await this.recalculateCombosUsingRecipes(affectedRecipes, affectedCombos);

        // STEP 4: Recalculate menu items for all affected FINAL recipes
        // Optimization: Batch update menu items
        if (affectedRecipes.size > 0) {
            await this.recalculateMenuItemsForRecipes(Array.from(affectedRecipes), affectedMenuItems);
        }

        // STEP 5: Recalculate menu items for all affected combos
        if (affectedCombos.size > 0) {
            await this.recalculateMenuItemsForCombos(Array.from(affectedCombos), affectedMenuItems);
        }

        return {
            receitasAfetadas: affectedRecipes.size,
            combosAfetados: affectedCombos.size,
            menusAfetados: affectedMenuItems.size,
        };
    }

    /**
     * Recalculate entities after a recipe change (update ingredients, etc.)
     */
    async recalculateAfterRecipeChange(receitaId: number) {
        const affectedRecipes = new Set<number>([receitaId]);
        const affectedMenuItems = new Set<number>();
        const affectedCombos = new Set<number>();

        // 0. Recalculate the recipe itself first
        await this.recalculateSingleRecipe(receitaId);

        // 1. Recalculate parent recipes (pre-preps)
        await this.recalculateRecipesUsingPrepreps(affectedRecipes);

        // 2. Recalculate combos using this recipe or affected parents
        await this.recalculateCombosUsingRecipes(affectedRecipes, affectedCombos);

        // 3. Recalculate menu items for this recipe and affected parents
        await this.recalculateMenuItemsForRecipes(Array.from(affectedRecipes), affectedMenuItems);

        // 4. Recalculate menu items for affected combos
        await this.recalculateMenuItemsForCombos(Array.from(affectedCombos), affectedMenuItems);

        return {
            receitasAfetadas: affectedRecipes.size,
            combosAfetados: affectedCombos.size,
            menusAfetados: affectedMenuItems.size,
        };
    }

    /**
     * Recalculate entities after a combo change
     */
    async recalculateAfterComboChange(comboId: number) {
        const affectedMenuItems = new Set<number>();

        await this.recalculateSingleCombo(comboId);
        await this.recalculateMenuItemsForCombos([comboId], affectedMenuItems);

        return {
            menusAfetados: affectedMenuItems.size,
        };
    }

    /**
     * Recalculate recipes that directly use a product
     */
    private async recalculateRecipesUsingProduct(
        produtoId: number,
        affectedRecipes: Set<number>
    ) {
        // 1. Find all ingredients using this product
        const ingredientes = await prisma.ingredienteReceita.findMany({
            where: { produto_id: produtoId },
        });

        if (ingredientes.length === 0) return;

        // 2. Get current price once
        const precoUnitario = await this.getPrecoUnitarioAtual(produtoId);

        // 3. Update ingredients in parallel (or batch if possible, but updateMany doesn't support calculation based on other fields easily)
        // We can group by recipe to minimize recipe recalculations later? No, we need to update ingredients first.
        // Optimization: Use Promise.all for concurrency
        await Promise.all(ingredientes.map(async (ing) => {
            const novoCusto = new Decimal(ing.quantidade_bruta).times(precoUnitario);
            await prisma.ingredienteReceita.update({
                where: { id: ing.id },
                data: { custo_ingrediente: novoCusto },
            });
            affectedRecipes.add(ing.receita_id);
        }));

        // 4. Recalculate total cost for each affected recipe
        // Optimization: Process unique recipes in parallel
        const uniqueRecipes = [...new Set(ingredientes.map((i) => i.receita_id))];
        await Promise.all(uniqueRecipes.map(id => this.recalculateSingleRecipe(id)));
    }

    /**
     * Recursively recalculate recipes that use pre-prep recipes
     */
    private async recalculateRecipesUsingPrepreps(affectedRecipes: Set<number>) {
        let currentBatch = new Set(affectedRecipes);

        // Loop until no more recipes are affected (recursive propagation)
        // Optimization: Track processed edges to avoid cycles or redundant checks?
        // For now, simple BFS/Level-by-level approach

        while (currentBatch.size > 0) {
            const nextBatch = new Set<number>();
            const currentIds = Array.from(currentBatch);

            // Find all ingredients that use any of the current batch recipes as pre-prep
            const parentIngredients = await prisma.ingredienteReceita.findMany({
                where: {
                    receita_preparo_id: { in: currentIds }
                },
                include: {
                    receitaPreparo: { select: { custo_por_porcao: true } }
                }
            });

            if (parentIngredients.length === 0) break;

            // Update ingredients
            await Promise.all(parentIngredients.map(async (ing) => {
                if (!ing.receitaPreparo) return;

                const novoCusto = new Decimal(ing.receitaPreparo.custo_por_porcao).times(ing.quantidade_bruta);
                const custoAnterior = new Decimal(ing.custo_ingrediente);

                if (!custoAnterior.equals(novoCusto)) {
                    await prisma.ingredienteReceita.update({
                        where: { id: ing.id },
                        data: { custo_ingrediente: novoCusto },
                    });

                    // Add parent recipe to next batch
                    nextBatch.add(ing.receita_id);
                    affectedRecipes.add(ing.receita_id);
                }
            }));

            // Recalculate costs for all recipes in next batch
            if (nextBatch.size > 0) {
                await Promise.all(Array.from(nextBatch).map(id => this.recalculateSingleRecipe(id)));
            }

            currentBatch = nextBatch;
        }
    }

    /**
     * Recalculate single recipe totals
     */
    private async recalculateSingleRecipe(receitaId: number) {
        const receita = await prisma.receita.findUnique({
            where: { id: receitaId },
            include: { ingredientes: true }
        });

        if (!receita) return;

        const custoTotal = receita.ingredientes.reduce(
            (sum, ing) => sum.plus(ing.custo_ingrediente),
            new Decimal(0)
        );

        const numeroPorcoes = new Decimal(receita.numero_porcoes);
        const custoPorPorcao = numeroPorcoes.greaterThan(0)
            ? custoTotal.dividedBy(numeroPorcoes)
            : new Decimal(0);

        // Only update if changed to avoid DB writes
        if (!custoTotal.equals(receita.custo_total) || !custoPorPorcao.equals(receita.custo_por_porcao)) {
            await prisma.receita.update({
                where: { id: receitaId },
                data: {
                    custo_total: custoTotal,
                    custo_por_porcao: custoPorPorcao,
                },
            });
        }
    }

    /**
     * Recalculate menu items for a list of recipes
     */
    private async recalculateMenuItemsForRecipes(
        receitaIds: number[],
        affectedMenuItems: Set<number>
    ) {
        // Fetch all menu items linked to these recipes
        const menuItems = await prisma.menuItem.findMany({
            where: { receita_id: { in: receitaIds } },
            include: { receita: { select: { custo_por_porcao: true } } },
        });

        await Promise.all(menuItems.map(async (item) => {
            if (!item.receita) return;

            const custo = new Decimal(item.receita.custo_por_porcao);
            const pvp = new Decimal(item.pvp);

            const margem = pvp.minus(custo);
            const margemPercentual = pvp.greaterThan(0)
                ? margem.dividedBy(pvp).times(100)
                : new Decimal(0);
            const cmv = pvp.greaterThan(0) ? custo.dividedBy(pvp).times(100) : new Decimal(0);

            await prisma.menuItem.update({
                where: { id: item.id },
                data: {
                    margem_bruta: margem,
                    margem_percentual: margemPercentual,
                    cmv_percentual: cmv,
                },
            });

            affectedMenuItems.add(item.id);
        }));
    }

    /**
     * Recalculate menu items for a list of combos
     */
    private async recalculateMenuItemsForCombos(
        comboIds: number[],
        affectedMenuItems: Set<number>
    ) {
        const menuItems = await prisma.menuItem.findMany({
            where: { combo_id: { in: comboIds } },
            include: { combo: { select: { custo_total: true } } },
        });

        await Promise.all(menuItems.map(async (item) => {
            if (!item.combo) return;

            const custo = new Decimal(item.combo.custo_total);
            const pvp = new Decimal(item.pvp);

            const margem = pvp.minus(custo);
            const margemPercentual = pvp.greaterThan(0)
                ? margem.dividedBy(pvp).times(100)
                : new Decimal(0);
            const cmv = pvp.greaterThan(0) ? custo.dividedBy(pvp).times(100) : new Decimal(0);

            await prisma.menuItem.update({
                where: { id: item.id },
                data: {
                    margem_bruta: margem,
                    margem_percentual: margemPercentual,
                    cmv_percentual: cmv,
                },
            });

            affectedMenuItems.add(item.id);
        }));
    }

    /**
     * Get current unit price for a product
     */
    async getPrecoUnitarioAtual(produtoId: number): Promise<Decimal> {
        // Get the active variation with the most recent price
        const variacao = await prisma.variacaoProduto.findFirst({
            where: {
                produto_id: produtoId,
                ativo: true,
            },
            orderBy: [
                { data_ultima_compra: 'desc' },
                { id: 'desc' }
            ],
        });

        if (!variacao) {
            return new Decimal(0);
        }

        return new Decimal(variacao.preco_unitario);
    }

    /**
     * Preview impact of a price change without actually changing anything
     */
    async previewPriceChangeImpact(produtoId: number) {
        // Find all affected recipes
        const directIngredients = await prisma.ingredienteReceita.findMany({
            where: { produto_id: produtoId },
            include: {
                receita: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                    },
                },
            },
        });

        const affectedRecipeIds = new Set(directIngredients.map((i) => i.receita_id));

        // Find recipes that use these as pre-preps (one level deep for preview)
        const parentIngredients = await prisma.ingredienteReceita.findMany({
            where: {
                receita_preparo_id: {
                    in: [...affectedRecipeIds],
                },
            },
            include: {
                receita: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                    },
                },
            },
        });

        parentIngredients.forEach((i) => affectedRecipeIds.add(i.receita_id));

        // Find menu items for final recipes
        const finalRecipes = [...affectedRecipeIds];
        const menuItems = await prisma.menuItem.findMany({
            where: {
                receita_id: {
                    in: finalRecipes,
                },
            },
            include: {
                receita: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                    },
                },
            },
        });

        return {
            affected_recipes: affectedRecipeIds.size,
            affected_menus: menuItems.length,
            recipe_details: [...affectedRecipeIds].map((id) => {
                const ing = directIngredients.find((i) => i.receita_id === id);
                const parent = parentIngredients.find((i) => i.receita_id === id);
                const recipe = ing?.receita || parent?.receita;
                return {
                    id,
                    nome: recipe?.nome,
                    tipo: recipe?.tipo,
                };
            }),
            menu_details: menuItems.map((m) => ({
                id: m.id,
                nome_comercial: m.nome_comercial,
                receita_nome: m.receita?.nome,
                pvp_atual: m.pvp,
            })),
        };
    }

    /**
     * Recalculate combos that directly use a product
     */
    private async recalculateCombosUsingProduct(
        produtoId: number,
        affectedCombos: Set<number>
    ) {
        // Find all combo items using this product
        const comboItems = await prisma.comboItem.findMany({
            where: { produto_id: produtoId },
        });

        if (comboItems.length === 0) return;

        const precoUnitario = await this.getPrecoUnitarioAtual(produtoId);

        await Promise.all(comboItems.map(async (item) => {
            const novoCusto = new Decimal(item.quantidade).times(precoUnitario);
            await prisma.comboItem.update({
                where: { id: item.id },
                data: {
                    custo_unitario: precoUnitario,
                    custo_total: novoCusto,
                },
            });
            affectedCombos.add(item.combo_id);
        }));

        // Recalculate total cost for each affected combo
        const uniqueCombos = [...new Set(comboItems.map((i) => i.combo_id))];
        await Promise.all(uniqueCombos.map(id => this.recalculateSingleCombo(id)));
    }

    /**
     * Recalculate combos that use affected recipes
     */
    private async recalculateCombosUsingRecipes(
        affectedRecipes: Set<number>,
        affectedCombos: Set<number>
    ) {
        if (affectedRecipes.size === 0) return;

        const recipeIds = Array.from(affectedRecipes);

        // 1. Update ComboItems
        const comboItems = await prisma.comboItem.findMany({
            where: { receita_id: { in: recipeIds } },
            include: { receita: { select: { custo_por_porcao: true } } }
        });

        await Promise.all(comboItems.map(async (item) => {
            if (!item.receita) return;
            const novoCustoUnitario = item.receita.custo_por_porcao;
            const novoCustoTotal = new Decimal(item.quantidade).times(novoCustoUnitario);

            await prisma.comboItem.update({
                where: { id: item.id },
                data: {
                    custo_unitario: novoCustoUnitario,
                    custo_total: novoCustoTotal,
                },
            });
            affectedCombos.add(item.combo_id);
        }));

        // 2. Update ComboOptions (Simple Combos)
        const comboOptions = await prisma.comboCategoriaOpcao.findMany({
            where: { receita_id: { in: recipeIds } },
            include: {
                categoria: true,
                receita: { select: { custo_por_porcao: true } }
            },
        });

        await Promise.all(comboOptions.map(async (opc) => {
            if (!opc.receita) return;
            const novoCusto = opc.receita.custo_por_porcao;

            await prisma.comboCategoriaOpcao.update({
                where: { id: opc.id },
                data: { custo_unitario: novoCusto },
            });

            if (opc.categoria) {
                affectedCombos.add(opc.categoria.combo_id);
            }
        }));

        // Recalculate total cost for each affected combo
        const uniqueCombos = Array.from(affectedCombos);
        await Promise.all(uniqueCombos.map(id => this.recalculateSingleCombo(id)));
    }

    /**
     * Recalculate single combo total cost
     */
    private async recalculateSingleCombo(comboId: number) {
        const combo = await prisma.combo.findUnique({
            where: { id: comboId },
            include: {
                itens: true,
                categorias: {
                    include: {
                        opcoes: true,
                    },
                },
            },
        });

        if (!combo) return;

        let custoTotal = new Decimal(0);

        // 1. Sum fixed items
        for (const item of combo.itens) {
            custoTotal = custoTotal.plus(item.custo_total);
        }

        // 2. Sum categories (max option cost)
        for (const cat of combo.categorias) {
            let maxCost = new Decimal(0);

            for (const opc of cat.opcoes) {
                const opcCost = new Decimal(opc.custo_unitario);
                if (opcCost.greaterThan(maxCost)) {
                    maxCost = opcCost;
                }
            }

            // Update category max cost
            await prisma.comboCategoria.update({
                where: { id: cat.id },
                data: { custo_max_calculado: maxCost },
            });

            custoTotal = custoTotal.plus(maxCost);
        }

        await prisma.combo.update({
            where: { id: comboId },
            data: { custo_total: custoTotal },
        });
    }
}

export const recalculationService = new RecalculationService();
