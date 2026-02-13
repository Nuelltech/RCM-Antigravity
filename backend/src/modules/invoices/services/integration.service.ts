import { PrismaClient, Prisma } from '@prisma/client';
import { priceHistoryService } from '../../produtos/price-history.service';
import { recalculationService } from '../../produtos/recalculation.service';
import { addPriceChangeJob } from '../../../core/queue';
import { dashboardCache } from '../../../core/cache.service';
import { productsCache } from '../../../core/products-cache';
import { menuCache } from '../../../core/menu-cache';

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
        // Create Integration Log
        const log = await prisma.integrationLog.create({
            data: {
                tenant_id: tenantId,
                fatura_id: faturaId,
                user_id: userId,
                status: 'processing'
            }
        });

        // Get invoice with all lines
        const fatura = await prisma.faturaImportacao.findUnique({
            where: { id: faturaId },
            include: {
                linhas: true
            }
        });

        if (!fatura) {
            await prisma.integrationLog.update({ where: { id: log.id }, data: { status: 'error' } });
            throw new Error('Invoice not found');
        }

        if (fatura.status !== 'reviewing') {
            await prisma.integrationLog.update({ where: { id: log.id }, data: { status: 'error' } });
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
                if (linha.variacao_id) {
                    // Fetch variation to get configuration
                    const variacao = await prisma.variacaoProduto.findUnique({
                        where: { id: linha.variacao_id },
                        include: { produto: true }
                    });

                    if (variacao) {
                        // User approved logic:
                        // 1. PackPrice = TotalSemIva / QtyBought
                        // 2. ItemPrice = PackPrice / UnitsPerPack
                        // 3. NormalizedPrice = ItemPrice / VolumePerItem (or 1)

                        const qtdComprada = linha.quantidade ? Number(linha.quantidade) : 1;
                        const totalSemIva = linha.preco_total ? Number(linha.preco_total) : 0; // Use Net Total

                        // Prevent division by zero
                        if (qtdComprada > 0 && totalSemIva > 0) {
                            const precoCompraPack = totalSemIva / qtdComprada; // Cost of 1 purchase unit (Box/Sack)

                            const unidadesPorCompra = variacao.unidades_por_compra ? Number(variacao.unidades_por_compra) : 1;
                            const volumePorUnidade = variacao.volume_por_unidade ? Number(variacao.volume_por_unidade) : 1;

                            const precoPorItem = precoCompraPack / unidadesPorCompra;
                            const normalizedPrice = precoPorItem / volumePorUnidade; // Price per Kg/L/Unit

                            console.log(`[Integration] Calc: Total=${totalSemIva} / Qty=${qtdComprada} => Pack=${precoCompraPack} | / Units=${unidadesPorCompra} => Item=${precoPorItem} | / Vol=${volumePorUnidade} => Norm=${normalizedPrice}`);

                            const updated = await this.updateVariationPrice(
                                linha.variacao_id,
                                normalizedPrice,
                                precoCompraPack,
                                tenantId,
                                userId,
                                log.id // PASS LOG ID
                            );
                            if (updated) pricesUpdated++;
                        }
                    }
                }
            } // END LOOP

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
            await productsCache.invalidateTenant(tenantId);
            await menuCache.invalidateTenant(tenantId);
            console.log(`[CACHE INVALIDATE] Dashboard, Products, and Menu cache cleared for tenant ${tenantId} after invoice approval`);

            // Mark log as completed (or let the worker finish it)
            // Note: Recalculation is async, so verified/completed status might depend on that. 
            // For now, we set completed for the SYNC part. The async worker should ideally update it too, but we can rely on log items.
            await prisma.integrationLog.update({
                where: { id: log.id },
                data: { completed_at: new Date(), status: 'completed' }
            });

            return {
                compraId: compraFatura.id,
                itemsCreated,
                pricesUpdated,
                alertsTriggered: 0, // Will be calculated async
                partial: isPartial
            };
        } catch (error: any) {
            console.error('Integration error:', error);
            // Mark log as error
            await prisma.integrationLog.update({
                where: { id: log.id },
                data: { status: 'error' }
            });
            throw new Error(`Failed to integrate invoice: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Update product variation price and create history
     */
    private async updateVariationPrice(
        variacaoId: number,
        newUnitPrice: number,      // Price per kg/L/UN (Normalized)
        newPackagePrice: number,   // Total package/box price
        tenantId: number,
        userId: number,            // Added userId
        logId: number              // Added logId
    ): Promise<boolean> {
        try {
            const variacao = await prisma.variacaoProduto.findUnique({
                where: { id: variacaoId },
                include: { produto: true }
            });

            if (!variacao) return false;

            const oldUnitPrice = variacao.preco_unitario.toNumber();
            const oldPackagePrice = variacao.preco_compra.toNumber();
            const newUnitPriceDecimal = new Prisma.Decimal(newUnitPrice);
            const newPackagePriceDecimal = new Prisma.Decimal(newPackagePrice);

            // Only update if price changed (allow small float diffs)
            if (Math.abs(oldUnitPrice - newUnitPrice) < 0.0001 && Math.abs(oldPackagePrice - newPackagePrice) < 0.001) {
                return false;
            }

            // Update variation with correct prices
            await prisma.variacaoProduto.update({
                where: { id: variacaoId },
                data: {
                    preco_unitario: newUnitPriceDecimal,  // €/kg or €/L or €/UN
                    preco_compra: newPackagePriceDecimal,   // Total package price
                    data_ultima_compra: new Date() // Set as latest purchase to ensure it's picked by recalculation service
                }
            });

            console.log(`[Integration] Updated variation ${variacaoId}: Pack €${newPackagePrice.toFixed(2)} | Normalized Unit €${newUnitPrice.toFixed(4)}`);

            // LOG CHANGE TO INTEGRATION LOG
            await prisma.integrationLogItem.create({
                data: {
                    log_id: logId,
                    entity_type: 'PRODUCT',
                    entity_id: variacao.produto_id,
                    entity_name: variacao.produto.nome,
                    field_changed: 'price_unit',
                    old_value: new Prisma.Decimal(oldUnitPrice),
                    new_value: newUnitPriceDecimal
                }
            });

            // Create price history
            await priceHistoryService.createPriceHistory({
                tenantId,
                variacaoId,
                precoAnterior: new Prisma.Decimal(oldPackagePrice),
                precoNovo: newPackagePriceDecimal,
                precoUnitarioAnterior: new Prisma.Decimal(oldUnitPrice),
                precoUnitarioNovo: newUnitPriceDecimal,
                origem: 'COMPRA',
                alteradoPor: userId,
                receitasAfetadas: 0, // Will be calculated by worker
                menusAfetados: 0     // Will be calculated by worker
            });

            // Trigger recalculation asynchronously via Queue (Worker)
            try {
                // Pass logId to job so worker can continue logging cascading changes
                await addPriceChangeJob(variacao.produto_id, tenantId, userId, logId);
                console.log(`[Integration] Queued recalculation for product ${variacao.produto_id}`);
            } catch (err) {
                console.error('[Integration] Failed to add job to queue, falling back to sync recalc:', err);
                // Fallback to sync service if queue fails (safety net)
                recalculationService.recalculateAfterPriceChange(variacao.produto_id, logId).catch(e => console.error(e));
            }

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
