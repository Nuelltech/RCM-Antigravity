import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { GeminiSalesParserService } from '../modules/vendas/services/gemini-sales-parser.service';
import { SalesMatchingService } from '../modules/vendas/services/sales-matching.service';

const prisma = new PrismaClient();
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

interface SalesProcessingJob {
    salesImportId: number;
    tenantId: number;
    filepath: string;
    uploadSource: 'web' | 'api';
    userId?: number;
}

/**
 * Sales Processing Worker
 * Processes sales imports asynchronously in the background
 * Clone of invoice-processing.worker adapted for sales
 */
const worker = new Worker<SalesProcessingJob>(
    'sales-processing',
    async (job: Job<SalesProcessingJob>) => {
        const { salesImportId, tenantId, filepath, uploadSource, userId } = job.data;
        const startTime = Date.now();

        console.log(`[SALES-WORKER] Processing sales import #${salesImportId} (tenant: ${tenantId})`);

        try {
            // Update status to processing
            await prisma.vendaImportacao.update({
                where: { id: salesImportId },
                data: { status: 'processing' }
            });

            // Parse sales report using Gemini
            const parser = new GeminiSalesParserService();
            const result = await parser.parseSalesMultimodal(filepath);

            const duration = Date.now() - startTime;

            // Update sales import with parsed header data
            await prisma.vendaImportacao.update({
                where: { id: salesImportId },
                data: {
                    status: 'reviewing',
                    data_venda: result.header.dataVenda || undefined,
                    total_bruto: result.header.totalBruto || undefined,
                    total_liquido: result.header.totalLiquido || undefined,
                    iva_6_base: result.header.iva?.iva6?.base || undefined,
                    iva_6_valor: result.header.iva?.iva6?.valor || undefined,
                    iva_13_base: result.header.iva?.iva13?.base || undefined,
                    iva_13_valor: result.header.iva?.iva13?.valor || undefined,
                    iva_23_base: result.header.iva?.iva23?.base || undefined,
                    iva_23_valor: result.header.iva?.iva23?.valor || undefined,
                    pagamento_dinheiro: result.header.pagamentos?.dinheiro || undefined,
                    pagamento_cartao: result.header.pagamentos?.cartao || undefined,
                    pagamento_outros: result.header.pagamentos?.outros || undefined,
                    processado_em: new Date()
                }
            });

            // Save line items
            const lineItemsData = result.lineItems.map((item, index) => ({
                venda_importacao_id: salesImportId,
                tenant_id: tenantId,
                linha_numero: item.linhaNumero || index + 1,
                descricao_original: item.descricaoOriginal,
                descricao_limpa: item.descricaoLimpa,
                quantidade: item.quantidade || undefined,
                preco_unitario: item.precoUnitario || undefined,
                preco_total: item.precoTotal || 0,
                status: 'pending' as const
            }));

            await prisma.vendaLinhaImportacao.createMany({
                data: lineItemsData
            });

            // Auto-match with menu items (high confidence only)
            if (result.lineItems.length > 0) {
                const matchingService = new SalesMatchingService();
                const linhas = await prisma.vendaLinhaImportacao.findMany({
                    where: { venda_importacao_id: salesImportId }
                });

                await matchingService.autoMatchLineItems(linhas, 85);
            }

            // Save processing metrics
            await prisma.salesProcessingMetrics.create({
                data: {
                    tenant_id: tenantId,
                    sales_import_id: salesImportId,
                    upload_source: uploadSource,
                    user_id: userId,
                    parsing_method: 'gemini-multimodal',
                    total_duration_ms: duration,
                    success: true,
                    line_items_extracted: result.lineItems.length,
                    created_at: new Date()
                }
            });

            console.log(
                `[SALES-WORKER] ✅ Sales import #${salesImportId} processed successfully ` +
                `in ${duration}ms (${result.lineItems.length} items)`
            );

            return {
                success: true,
                salesImportId,
                lineItems: result.lineItems.length,
                duration
            };

        } catch (error: any) {
            const duration = Date.now() - startTime;

            console.error(`[SALES-WORKER] ❌ Error processing sales import #${salesImportId}:`, error);

            // Update status to error
            await prisma.vendaImportacao.update({
                where: { id: salesImportId },
                data: {
                    status: 'error',
                    erro_mensagem: error.message || 'Unknown error'
                }
            });

            // Save error metrics
            await prisma.salesProcessingMetrics.create({
                data: {
                    tenant_id: tenantId,
                    sales_import_id: salesImportId,
                    upload_source: uploadSource,
                    user_id: userId,
                    parsing_method: 'failed',
                    total_duration_ms: duration,
                    success: false,
                    created_at: new Date()
                }
            });

            throw error; // Re-throw for BullMQ retry logic
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,  // Process up to 5 sales imports in parallel
        limiter: {
            max: 10,
            duration: 60000  // Max 10 jobs per minute
        }
    }
);

// Event handlers
worker.on('completed', (job) => {
    console.log(`[SALES-WORKER] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`[SALES-WORKER] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
    console.error('[SALES-WORKER] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[SALES-WORKER] Shutting down worker...');
    await worker.close();
    await redisConnection.quit();
});

console.log('[SALES-WORKER] Sales processing worker started (concurrency: 5)');

export default worker;
