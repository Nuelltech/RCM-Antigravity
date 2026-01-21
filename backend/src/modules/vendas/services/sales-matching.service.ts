import { PrismaClient } from '@prisma/client';
import Fuse from 'fuse.js';

const prisma = new PrismaClient();

export interface MenuItemSuggestion {
    menuItemId: number;
    menuItemNome: string;
    confianca: number;
    matchReason: string;
}

/**
 * Service for matching sales line items to MenuItem
 * Uses fuzzy matching + historical learning (similar to invoice matching)
 */
export class SalesMatchingService {
    /**
     * Find menu item suggestions for a sales line description
     */
    async findMenuItemSuggestions(
        descricao: string,
        tenantId: number
    ): Promise<MenuItemSuggestion[]> {
        console.log(`[SALES-MATCHING] Finding suggestions for: "${descricao}"`);

        // 1. Check historical matches first (exact learning)
        const historicalMatches = await this.checkHistoricalMatches(descricao, tenantId);
        if (historicalMatches.length > 0) {
            console.log(`[SALES-MATCHING] Found ${historicalMatches.length} historical matches`);
            return historicalMatches;
        }

        // 2. Fuzzy search on menu items
        const fuzzyMatches = await this.fuzzyMatchMenuItems(descricao, tenantId);
        console.log(`[SALES-MATCHING] Found ${fuzzyMatches.length} fuzzy matches`);

        return fuzzyMatches;
    }

    /**
     * Check if this description has been manually matched before
     */
    private async checkHistoricalMatches(
        descricao: string,
        tenantId: number
    ): Promise<MenuItemSuggestion[]> {
        const history = await prisma.salesMatchingHistorico.findMany({
            where: {
                tenant_id: tenantId,
                descricao_venda: descricao
            },
            include: {
                menuItem: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });

        return history.map(h => ({
            menuItemId: h.menu_item_id,
            menuItemNome: h.menuItem.nome_comercial,
            confianca: 100, // Historical = 100% confidence
            matchReason: 'Correspondência aprendida (manual anterior)'
        }));
    }

    /**
     * Fuzzy match against menu items using Fuse.js
     */
    private async fuzzyMatchMenuItems(
        descricao: string,
        tenantId: number
    ): Promise<MenuItemSuggestion[]> {
        // Get active menu items
        const menuItems = await prisma.menuItem.findMany({
            where: {
                tenant_id: tenantId,
                ativo: true
            },
            select: {
                id: true,
                nome_comercial: true
            }
        });

        if (menuItems.length === 0) {
            return [];
        }

        // Configure Fuse.js for fuzzy search
        const fuse = new Fuse(menuItems, {
            keys: ['nome_comercial'],
            threshold: 0.4, // 0 = exact, 1 = match anything (0.4 = balanced)
            includeScore: true,
            minMatchCharLength: 2
        });

        // Search
        const results = fuse.search(descricao);

        // Map to suggestions
        return results
            .slice(0, 10) // Top 10
            .map(result => {
                const confidence = Math.round((1 - (result.score || 0)) * 100);
                return {
                    menuItemId: result.item.id,
                    menuItemNome: result.item.nome_comercial,
                    confianca: confidence,
                    matchReason: confidence >= 80
                        ? 'Correspondência alta (automática)'
                        : 'Correspondência parcial (verificar)'
                };
            });
    }

    /**
     * Save a manual match to history for learning
     */
    async saveMatchHistory(
        descricao: string,
        menuItemId: number,
        tenantId: number,
        userId: number,
        confiancaInicial?: number
    ): Promise<void> {
        await prisma.salesMatchingHistorico.create({
            data: {
                tenant_id: tenantId,
                descricao_venda: descricao,
                menu_item_id: menuItemId,
                confianca_inicial: confiancaInicial,
                confirmado_por: userId
            }
        });

        console.log(`[SALES-MATCHING] ✅ Saved match: "${descricao}" → MenuItem #${menuItemId}`);
    }

    /**
     * Auto-match line items based on confidence threshold
     */
    async autoMatchLineItems(
        linhas: Array<{ id: number; descricao_original: string; tenant_id: number }>,
        confidenceThreshold: number = 85
    ): Promise<void> {
        for (const linha of linhas) {
            const suggestions = await this.findMenuItemSuggestions(
                linha.descricao_original,
                linha.tenant_id
            );

            if (suggestions.length > 0 && suggestions[0].confianca >= confidenceThreshold) {
                // Auto-match with high confidence
                await prisma.vendaLinhaImportacao.update({
                    where: { id: linha.id },
                    data: {
                        menu_item_id: suggestions[0].menuItemId,
                        confianca_match: suggestions[0].confianca,
                        status: 'matched'
                    }
                });

                console.log(
                    `[SALES-MATCHING] Auto-matched: "${linha.descricao_original}" → ` +
                    `${suggestions[0].menuItemNome} (${suggestions[0].confianca}%)`
                );
            } else {
                // Low confidence - needs manual review
                await prisma.vendaLinhaImportacao.update({
                    where: { id: linha.id },
                    data: {
                        status: 'pending'
                    }
                });
            }
        }
    }
}
