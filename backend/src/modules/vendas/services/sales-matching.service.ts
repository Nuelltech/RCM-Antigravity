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
        linhas: Array<{
            id: number;
            descricao_original: string;
            tenant_id: number;
            quantidade?: number | object | null; // Changed to match possible Decimal or number
            preco_total: number | object; // Prisma Decimal
            preco_unitario?: number | object | null;
            metadata?: any;
        }>,
        confidenceThreshold: number = 85
    ): Promise<void> {
        // Helper to convert Decimal/Object to number
        const toNumber = (val: any) => {
            if (val && typeof val === 'object' && 'toNumber' in val) return val.toNumber();
            return Number(val) || 0;
        };

        for (const linha of linhas) {
            const suggestions = await this.findMenuItemSuggestions(
                linha.descricao_original,
                linha.tenant_id
            );

            if (suggestions.length > 0 && suggestions[0].confianca >= confidenceThreshold) {
                const bestMatch = suggestions[0];
                const matchedMenuItemId = bestMatch.menuItemId;

                // Get fresh MenuItem data for calculations (PVP)
                const menuItem = await prisma.menuItem.findUnique({
                    where: { id: matchedMenuItemId },
                    select: { pvp: true }
                });

                if (!menuItem) continue; // Should not happen if foreign key valid

                const pvpSystem = Number(menuItem.pvp);
                const precoTotalLine = toNumber(linha.preco_total);
                const qtdOriginal = toNumber(linha.quantidade);
                const precoUnitarioLine = toNumber(linha.preco_unitario);

                // LOGIC 1: INFER QUANTITY
                let finalQty = qtdOriginal;
                let inferredQty = false;
                let inferenceReason = null;

                if (!qtdOriginal || qtdOriginal === 0 || (qtdOriginal === 1 && !linha.preco_unitario)) {
                    // Start assuming 1
                    finalQty = 1;

                    // Try to infer from Total / PVP
                    if (precoTotalLine > 0 && pvpSystem > 0) {
                        const calculated = precoTotalLine / pvpSystem;
                        // Check if close to integer (allow small tolerance e.g. 0.1 for floating point issues)
                        const rounded = Math.round(calculated);
                        const diff = Math.abs(calculated - rounded);

                        // If it's a clean multiple (e.g. 4.99 or 5.01 -> 5)
                        if (diff < 0.1) {
                            finalQty = rounded;
                            inferredQty = true;
                            inferenceReason = `Inferred from total (${precoTotalLine.toFixed(2)} / ${pvpSystem.toFixed(2)})`;

                            console.log(`[SALES-MATCHING] Inferred Qty for "${linha.descricao_original}": ${calculated.toFixed(2)} -> ${finalQty}`);
                        }
                    }
                }

                // LOGIC 2: PRICE DISCREPANCY CHECK
                // Calculate implicit unit price from file
                const implicitUnitPrice = finalQty > 0 ? (precoTotalLine / finalQty) : 0;
                // Or use explicit unit price if available, otherwise implicit
                const comparisonPrice = precoUnitarioLine > 0 ? precoUnitarioLine : implicitUnitPrice;

                const priceDiffers = Math.abs(comparisonPrice - pvpSystem) > 0.05; // 5 cents tolerance

                // Construct metadata
                const metadata = {
                    ...(linha.metadata || {}),
                    inferred_quantity: inferredQty,
                    inference_reason: inferenceReason,
                    price_mismatch: priceDiffers,
                    system_pvp: pvpSystem,
                    file_price: comparisonPrice,
                    original_qty: qtdOriginal
                };

                // Auto-match with high confidence & updates
                await prisma.vendaLinhaImportacao.update({
                    where: { id: linha.id },
                    data: {
                        menu_item_id: matchedMenuItemId,
                        confianca_match: bestMatch.confianca,
                        status: priceDiffers ? 'manual_review' : 'matched', // Force review if price differs? Or just matched with warning? 
                        // User asked for alert, let's keep it 'matched' but UI shows alert, 
                        // OR 'manual_review' to force attention.
                        // Let's use 'matched' so it *can* be auto-approved, 
                        // but UI will show yellow warning. 
                        // Actually, "status: 'reviewing'" on the parent import handles the flow.
                        // Line status 'matched' is fine.
                        quantidade: finalQty,
                        metadata: metadata
                    }
                });

                console.log(
                    `[SALES-MATCHING] Auto-matched: "${linha.descricao_original}" → ` +
                    `${bestMatch.menuItemNome} (${bestMatch.confianca}%) ` +
                    `${inferredQty ? `[Qty: ${finalQty}]` : ''} ` +
                    `${priceDiffers ? `[Price Diff: ${comparisonPrice} vs ${pvpSystem}]` : ''}`
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
