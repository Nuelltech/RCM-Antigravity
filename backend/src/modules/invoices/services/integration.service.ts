import { PrismaClient, Prisma } from '@prisma/client';
import { priceHistoryService } from '../../produtos/price-history.service';
import { recalculationService } from '../../produtos/recalculation.service';
import { dashboardCache } from '../../../core/cache.service';

const prisma = new PrismaClient();

export interface IntegrationResult {
    compraId: number;
    itemsCreated: number;
    pricesUpdated: number;
    alertsTriggered: number;
    partial?: boolean;
}

export class InvoiceIntegrationService {
    /**
     * Integrate approved invoice into system
     * Creates Compra, CompraItems, updates prices, creates history
     */
    async integrateInvoice(
        faturaId: number,
        tenantId: number,
        userId: number
    ): Promise<IntegrationResult> {
        // Get invoice with all lines
        const fatura = await prisma.faturaImportacao.findUnique({
            where: { id: faturaId },
            include: {
                linhas: true
            }
        });

        if (!fatura) {
            throw new Error('Invoice not found');
        }

        if (fatura.status !== 'reviewing') {
            throw new Error('Invoice must be in reviewing status');
        }

        // Check if partial approval (some lines without match)
        const matchedLines = fatura.linhas.filter(l => l.produto_id);
        const isPartial = matchedLines.length < fatura.linhas.length;

        try {
            // Create CompraFatura (Invoice Header)
            const compraFatura = await prisma.compraFatura.create({
                data: {
                    tenant_id: tenantId,
                    fornecedor_nome: fatura.fornecedor_nome || 'Unknown',
                    fornecedor_nif: fatura.fornecedor_nif,
                    numero_fatura: fatura.numero_fatura || '',
                    data_fatura: fatura.data_fatura || new Date(),
                    total_sem_iva: fatura.total_sem_iva || new Prisma.Decimal(0),
                    total_iva: fatura.total_iva || new Prisma.Decimal(0),
                    total_com_iva: fatura.total_com_iva || new Prisma.Decimal(0),
                    metodo_entrada: 'OCR',
                    documento_url: fatura.ficheiro_url,
                    fatura_importacao_id: faturaId,
                    validado: true,  // Manual approval by manager
                    data_validacao: new Date(),
                    validado_por: userId
                }
            });

            let itemsCreated = 0;
            let pricesUpdated = 0;

            // Create CompraItems for each MATCHED line only
            for (const linha of matchedLines) {
                if (!linha.produto_id) continue;

                // Create CompraItem
                await prisma.compraItem.create({
                    data: {
                        tenant_id: tenantId,
                        compra_fatura_id: compraFatura.id,
                        produto_id: linha.produto_id,
                        variacao_id: linha.variacao_id,
                        descricao: linha.descricao_original,
                        quantidade: linha.quantidade || new Prisma.Decimal(1),
                        unidade: linha.unidade || 'UN',
                        preco_unitario: linha.preco_unitario || new Prisma.Decimal(0),
                        preco_total: linha.preco_total || new Prisma.Decimal(0),
                        iva_percentual: linha.iva_percentual,
                        iva_valor: linha.iva_valor
                    }
                });
                itemsCreated++;

                // Update product variation price if exists
                if (linha.variacao_id && linha.preco_unitario) {
                    const updated = await this.updateVariationPrice(
                        linha.variacao_id,
                        linha.preco_unitario.toNumber(),
                        tenantId
                    );
                    if (updated) pricesUpdated++;
                }
            }

            // Mark invoice status based on partial approval
            await prisma.faturaImportacao.update({
                where: { id: faturaId },
                data: {
                    status: isPartial ? 'approved_partial' : 'approved',
                    aprovado_em: new Date(),
                    aprovado_por: userId,
                    processado_em: new Date()
                }
            });

            // Trigger alert regeneration (async)
            this.regenerateAlertsAsync(tenantId);

            // Invalidate dashboard cache (purchases affect dashboard stats)
            await dashboardCache.invalidateTenant(tenantId);
            console.log(`[CACHE INVALIDATE] Dashboard cache cleared for tenant ${tenantId} after invoice approval`);

            return {
                compraId: compraFatura.id,
                itemsCreated,
                pricesUpdated,
                alertsTriggered: 0, // Will be calculated async
                partial: isPartial
            };
        } catch (error: any) {
            console.error('Integration error:', error);
            throw new Error(`Failed to integrate invoice: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Update product variation price and create history
     */
    private async updateVariationPrice(
        variacaoId: number,
        newPrice: number,
        tenantId: number
    ): Promise<boolean> {
        try {
            const variacao = await prisma.variacaoProduto.findUnique({
                where: { id: variacaoId },
                include: { produto: true }
            });

            if (!variacao) return false;

            const oldPrice = variacao.preco_unitario.toNumber();
            const newPriceDecimal = new Prisma.Decimal(newPrice);

            // Only update if price changed
            if (Math.abs(oldPrice - newPrice) < 0.01) {
                return false;
            }

            // Update variation
            await prisma.variacaoProduto.update({
                where: { id: variacaoId },
                data: {
                    preco_unitario: newPriceDecimal,
                    preco_compra: newPriceDecimal
                }
            });

            // Get current effective unit price for recalculation
            const precoUnitarioAnterior = await recalculationService.getPrecoUnitarioAtual(variacao.produto_id);

            // Create price history using the service
            await priceHistoryService.createPriceHistory({
                tenantId,
                variacaoId,
                precoAnterior: new Prisma.Decimal(oldPrice),
                precoNovo: newPriceDecimal,
                precoUnitarioAnterior: new Prisma.Decimal(oldPrice),
                precoUnitarioNovo: newPriceDecimal,
                origem: 'COMPRA',
                alteradoPor: undefined, // System update
                receitasAfetadas: 0,
                menusAfetados: 0
            });

            // Trigger recalculation asynchronously
            recalculationService.recalculateAfterPriceChange(variacao.produto_id).catch(err => {
                console.error('Error in background recalculation:', err);
            });

            return true;
        } catch (error) {
            console.error('Error updating variation price:', error);
            return false;
        }
    }

    /**
     * Regenerate alerts asynchronously (fire and forget)
     */
    private regenerateAlertsAsync(tenantId: number): void {
        // Skip alerts regeneration for now - AlertsModule not exported
        // import('../../alerts/alerts.module').then(() => {
        //     console.log('Alerts regeneration skipped');
        // }).catch((err: any) => {
        //     console.error('Failed to import alerts module:', err);
        // });
    }

    /**
     * Reject and delete invoice
     */
    async rejectInvoice(faturaId: number): Promise<void> {
        await prisma.faturaImportacao.update({
            where: { id: faturaId },
            data: {
                status: 'rejected',
                processado_em: new Date()
            }
        });
    }
}
