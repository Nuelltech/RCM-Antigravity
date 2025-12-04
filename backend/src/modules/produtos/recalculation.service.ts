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
        for (const receitaId of affectedRecipes) {
            const receita = await prisma.receita.findUnique({
                where: { id: receitaId },
            });

            if (receita && receita.tipo === 'Final') {
                await this.recalculateMenuItemsForRecipe(receitaId, affectedMenuItems);
            }
        }

        // STEP 5: Recalculate menu items for all affected combos
        for (const comboId of affectedCombos) {
            await this.recalculateMenuItemsForCombo(comboId, affectedMenuItems);
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

        // 1. Recalculate parent recipes (pre-preps)
        await this.recalculateRecipesUsingPrepreps(affectedRecipes);

        // 2. Recalculate combos using this recipe or affected parents
        await this.recalculateCombosUsingRecipes(affectedRecipes, affectedCombos);

        // 3. Recalculate menu items for this recipe and affected parents
        for (const rId of affectedRecipes) {
            const receita = await prisma.receita.findUnique({
                where: { id: rId },
            });

            if (receita && receita.tipo === 'Final') {
                await this.recalculateMenuItemsForRecipe(rId, affectedMenuItems);
            }
        }

        // 4. Recalculate menu items for affected combos
        for (const comboId of affectedCombos) {
            await this.recalculateMenuItemsForCombo(comboId, affectedMenuItems);
        }

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

        await this.recalculateMenuItemsForCombo(comboId, affectedMenuItems);

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

        // 2. Update each ingredient's cost
        for (const ing of ingredientes) {
            const precoUnitario = await this.getPrecoUnitarioAtual(produtoId);
            const novoCusto = new Decimal(ing.quantidade_bruta).times(precoUnitario);

            await prisma.ingredienteReceita.update({
                where: { id: ing.id },
                data: { custo_ingrediente: novoCusto },
            });

            affectedRecipes.add(ing.receita_id);
        }

        // 3. Recalculate total cost for each affected recipe
        const uniqueRecipes = [...new Set(ingredientes.map((i) => i.receita_id))];
        for (const receitaId of uniqueRecipes) {
            await this.recalculateSingleRecipe(receitaId);
        }
    }

    /**
     * Recursively recalculate recipes that use pre-prep recipes
     */
    private async recalculateRecipesUsingPrepreps(affectedRecipes: Set<number>) {
        let hasChanges = true;

        // Loop until no more recipes are affected (recursive propagation)
        while (hasChanges) {
            hasChanges = false;
            const currentAffected = [...affectedRecipes];

            for (const receitaId of currentAffected) {
                // Find recipes that use this recipe as a pre-prep ingredient
                const parentIngredients = await prisma.ingredienteReceita.findMany({
                    where: { receita_preparo_id: receitaId },
                });

                if (parentIngredients.length === 0) continue;

                for (const ing of parentIngredients) {
                    // Get updated cost of pre-prep recipe
                    const prepreprRecipe = await prisma.receita.findUnique({
                        where: { id: receitaId },
                    });

                    if (!prepreprRecipe) continue;

                    // Update ingredient cost (cost per portion of pre-prep * quantity used)
                    const novoCusto = new Decimal(prepreprRecipe.custo_por_porcao).times(
                        ing.quantidade_bruta
                    );

                    const custoAnterior = new Decimal(ing.custo_ingrediente);

                    // Only update and propagate if cost changed
                    if (!custoAnterior.equals(novoCusto)) {
                        await prisma.ingredienteReceita.update({
                            where: { id: ing.id },
                            data: { custo_ingrediente: novoCusto },
                        });

                        affectedRecipes.add(ing.receita_id);
                        hasChanges = true; // Continue loop because a cost changed
                    }
                }

                // Recalculate parent recipes if any of their ingredients changed
                // We can optimize this by only recalculating those that had changes, 
                // but for now recalculating all potential parents in this batch is safer.
                if (hasChanges) {
                    const parentRecipeIds = [
                        ...new Set(parentIngredients.map((i) => i.receita_id)),
                    ];
                    for (const parentId of parentRecipeIds) {
                        await this.recalculateSingleRecipe(parentId);
                    }
                }
            }
        }
    }

    /**
     * Recalculate single recipe totals
     */
    private async recalculateSingleRecipe(receitaId: number) {
        const ingredientes = await prisma.ingredienteReceita.findMany({
            where: { receita_id: receitaId },
        });

        const custoTotal = ingredientes.reduce(
            (sum, ing) => sum.plus(ing.custo_ingrediente),
            new Decimal(0)
        );

        const receita = await prisma.receita.findUnique({
            where: { id: receitaId },
        });

        if (!receita) return;

        const numeroPorcoes = new Decimal(receita.numero_porcoes);
        const custoPorPorcao = numeroPorcoes.greaterThan(0)
            ? custoTotal.dividedBy(numeroPorcoes)
            : new Decimal(0);

        await prisma.receita.update({
            where: { id: receitaId },
            data: {
                custo_total: custoTotal,
                custo_por_porcao: custoPorPorcao,
            },
        });
    }

    /**
     * Recalculate menu items for a final recipe
     */
    private async recalculateMenuItemsForRecipe(
        receitaId: number,
        affectedMenuItems: Set<number>
    ) {
        const menuItems = await prisma.menuItem.findMany({
            where: { receita_id: receitaId },
            include: { receita: true },
        });

        for (const item of menuItems) {
            if (!item.receita) continue;

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
        }
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

        // Update each combo item's cost
        for (const item of comboItems) {
            const precoUnitario = await this.getPrecoUnitarioAtual(produtoId);
            const novoCusto = new Decimal(item.quantidade).times(precoUnitario);

            await prisma.comboItem.update({
                where: { id: item.id },
                data: {
                    custo_unitario: precoUnitario,
                    custo_total: novoCusto,
                },
            });

            affectedCombos.add(item.combo_id);
        }

        // Recalculate total cost for each affected combo
        const uniqueCombos = [...new Set(comboItems.map((i) => i.combo_id))];
        for (const comboId of uniqueCombos) {
            await this.recalculateSingleCombo(comboId);
        }
    }

    /**
     * Recalculate combos that use affected recipes
     */
    private async recalculateCombosUsingRecipes(
        affectedRecipes: Set<number>,
        affectedCombos: Set<number>
    ) {
        if (affectedRecipes.size === 0) return;

        // Find combo items using affected recipes
        const comboItems = await prisma.comboItem.findMany({
            where: {
                receita_id: {
                    in: [...affectedRecipes],
                },
            },
        });

        // Update each combo item's cost based on updated recipe cost
        for (const item of comboItems) {
            if (!item.receita_id) continue;

            // Fetch fresh recipe data to get the UPDATED cost
            const receita = await prisma.receita.findUnique({
                where: { id: item.receita_id },
                select: { custo_por_porcao: true },
            });

            if (!receita) continue;

            const novoCustoUnitario = receita.custo_por_porcao;
            const novoCustoTotal = new Decimal(item.quantidade).times(novoCustoUnitario);

            await prisma.comboItem.update({
                where: { id: item.id },
                data: {
                    custo_unitario: novoCustoUnitario,
                    custo_total: novoCustoTotal,
                },
            });

            affectedCombos.add(item.combo_id);
        }

        // Handle ComboOpcoes (for Simple Combos)
        const comboOptions = await prisma.comboCategoriaOpcao.findMany({
            where: {
                receita_id: {
                    in: [...affectedRecipes],
                },
            },
            include: {
                categoria: true,
            },
        });

        for (const opc of comboOptions) {
            if (!opc.receita_id) continue;

            // Fetch fresh recipe data to get the UPDATED cost
            const receita = await prisma.receita.findUnique({
                where: { id: opc.receita_id },
                select: { custo_por_porcao: true },
            });

            if (!receita) continue;

            const novoCusto = receita.custo_por_porcao;

            await prisma.comboCategoriaOpcao.update({
                where: { id: opc.id },
                data: { custo_unitario: novoCusto },
            });

            if (opc.categoria) {
                affectedCombos.add(opc.categoria.combo_id);
            }
        }

        // Recalculate total cost for each affected combo
        const uniqueCombos = [...affectedCombos];
        for (const comboId of uniqueCombos) {
            await this.recalculateSingleCombo(comboId);
        }
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
                // Ensure we use Decimal for comparison
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

    /**
     * Recalculate menu items for a combo
     */
    private async recalculateMenuItemsForCombo(
        comboId: number,
        affectedMenuItems: Set<number>
    ) {
        const menuItems = await prisma.menuItem.findMany({
            where: { combo_id: comboId },
            include: { combo: true },
        });

        for (const item of menuItems) {
            if (!item.combo) continue;

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
        }
    }
}

export const recalculationService = new RecalculationService();
