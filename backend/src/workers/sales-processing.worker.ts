import { Worker, Job } from 'bullmq';
// import { PrismaClient } from '@prisma/client';
import { prisma } from '../core/database';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GeminiSalesParserService } from '../modules/vendas/services/gemini-sales-parser.service';
import { SalesMatchingService } from '../modules/vendas/services/sales-matching.service';
import { OCRService } from '../modules/invoices/services/ocr.service';
import { RegexSalesParserService } from '../modules/vendas/services/regex-sales-parser.service';
import { env } from '../core/env';
import { redisOptions } from '../core/redis';

// const prisma = new PrismaClient();
const redisConnection = new Redis(env.REDIS_URL, redisOptions);

interface SalesProcessingJob {
    salesImportId: number;
    tenantId: number;
    filepath: string;
    fileContent?: string; // Base64 content for workers in separate containers
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
        const { salesImportId, tenantId, filepath, fileContent, uploadSource, userId } = job.data;
        const startTime = Date.now();
        let processingFilepath = filepath;
        let tempFilePath: string | null = null;

        console.log(`[SALES-WORKER] Processing sales import #${salesImportId} (tenant: ${tenantId})`);

        try {
            let fileReady = false;

            // PRIORITY 1: Download from Public URL (FTP)
            if (filepath.startsWith('http')) {
                try {
                    console.log(`[SALES-WORKER] 🌐 Attempting download from URL: ${filepath}`);
                    const response = await fetch(filepath);
                    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const tempDir = os.tmpdir();
                    const urlParts = filepath.split('/');
                    const fileName = urlParts[urlParts.length - 1] || `downloaded_${Date.now()}.pdf`;

                    tempFilePath = path.join(tempDir, `worker_dl_${Date.now()}_${fileName}`);
                    fs.writeFileSync(tempFilePath, buffer);
                    processingFilepath = tempFilePath;
                    fileReady = true;

                    console.log(`[SALES-WORKER] 📥 Downloaded file to: ${tempFilePath}`);
                } catch (downloadErr: any) {
                    console.warn(`[SALES-WORKER] ⚠️ URL download failed: ${downloadErr.message}. Falling back to payload.`);
                }
            }

            // PRIORITY 2: Base64 Payload (Fallback)
            if (!fileReady && fileContent) {
                try {
                    console.log(`[SALES-WORKER] 🔄 Using Base64 payload fallback`);
                    const buffer = Buffer.from(fileContent, 'base64');
                    const tempDir = os.tmpdir();
                    const fileName = path.basename(filepath);
                    tempFilePath = path.join(tempDir, `worker_${Date.now()}_${fileName}`);
                    fs.writeFileSync(tempFilePath, buffer);
                    processingFilepath = tempFilePath;
                    fileReady = true;
                    console.log(`[SALES-WORKER] 📥 Recreated file from payload at: ${tempFilePath}`);
                } catch (err: any) {
                    console.error('[SALES-WORKER] Failed to create temp file from content:', err);
                }
            }

            // PRIORITY 3: Local Filesystem (Dev/Local fallback)
            if (!fileReady) {
                if (fs.existsSync(filepath)) {
                    processingFilepath = filepath;
                    fileReady = true;
                    console.log(`[SALES-WORKER] 📂 Using local file at: ${processingFilepath}`);
                }
            }

            // FINAL CHECK
            if (!fileReady) {
                const errorMsg = `File access failed. Tried URL (${filepath.startsWith('http')}), Payload (${!!fileContent}), and Local Path.`;
                console.error(`[SALES-WORKER] ❌ ${errorMsg}`);
                throw new Error(errorMsg);
            }

            // Update status to processing
            await prisma.vendaImportacao.update({
                where: { id: salesImportId },
                data: { status: 'processing' }
            });



            // Parse sales report using Gemini (Primary) or Fallback (Secondary)
            let result: any;
            let parsingMethod = 'gemini-multimodal';

            try {
                const parser = new GeminiSalesParserService();
                // Use the local processing filepath
                result = await parser.parseSalesMultimodal(processingFilepath);
            } catch (geminiError: any) {
                console.warn(`[SALES-WORKER] ⚠️ Gemini parsing failed: ${geminiError.message}`);
                console.log(`[SALES-WORKER] 🔄 Attempting Fallback: OCR + Regex`);

                try {
                    // Fallback: OCR + Regex
                    const ocrService = new OCRService();
                    if (!ocrService.checkAvailability()) {
                        throw new Error('OCR Service not available for fallback');
                    }

                    // 1. Extract Text (Vision/Tesseract)
                    const ocrResult = await ocrService.extractText(processingFilepath);

                    // 2. Parse Regex
                    const regexParser = new RegexSalesParserService();
                    result = regexParser.parse(ocrResult.fullText);

                    parsingMethod = 'fallback-regex';
                    console.log(`[SALES-WORKER] ✅ Fallback successful. Date: ${result.header.dataVenda}, Total: ${result.header.totalBruto}`);

                } catch (fallbackError: any) {
                    console.error('[SALES-WORKER] ❌ Fallback also failed:', fallbackError.message);
                    // Throw original error to indicate root cause, or fallback error?
                    // Let's throw the original Gemini error but mention fallback failure
                    throw new Error(`Primary Parsing Failed: ${geminiError.message}. Fallback Failed: ${fallbackError.message}`);
                }
            }

            const duration = Date.now() - startTime;

            // Update sales import with parsed header data
            await prisma.vendaImportacao.update({
                where: { id: salesImportId },
                data: {
                    status: 'reviewing',
                    // Add a warning note if fallback was used
                    erro_mensagem: parsingMethod === 'fallback-regex'
                        ? 'Aviso: Processado via Fallback (OCR). Verifique os dados com atenção.'
                        : null,

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
            // Save line items
            const lineItemsData = result.lineItems.map((item: any, index: number) => ({
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

            // Phase 4: Generic Worker Metric
            try {
                // @ts-ignore - Stale Prisma types legacy workaround
                await prisma.workerMetric.create({
                    data: {
                        queue_name: 'sales-processing',
                        job_name: 'process-sales-import',
                        job_id: job.id,
                        duration_ms: duration,
                        status: 'COMPLETED',
                        processed_at: new Date(),
                        attempts: job.attemptsMade + 1
                    }
                });
            } catch (err) { console.error('Failed to log worker metric', err); }

            // Phase 4: Generic Worker Metric
            try {
                await prisma.workerMetric.create({
                    data: {
                        queue_name: 'sales-processing',
                        job_name: 'process-sales-import',
                        job_id: job.id,
                        duration_ms: duration,
                        status: 'COMPLETED',
                        processed_at: new Date(),
                        attempts: job.attemptsMade + 1
                    }
                });
            } catch (err) { console.error('Failed to log worker metric', err); }

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

            // Phase 4: Generic Worker Metric & Error Log
            try {
                await prisma.workerMetric.create({
                    data: {
                        queue_name: 'sales-processing',
                        job_name: 'process-sales-import',
                        job_id: job.id,
                        duration_ms: duration,
                        status: 'FAILED',
                        error_message: error.message,
                        processed_at: new Date(),
                        attempts: job.attemptsMade + 1
                    }
                });

                // @ts-ignore - Stale Prisma types legacy workaround
                await prisma.errorLog.create({
                    data: {
                        level: 'ERROR',
                        source: 'WORKER',
                        message: error.message,
                        stack_trace: error.stack,
                        metadata: { jobId: job.id, queue: 'sales-processing' }
                    }
                });
            } catch (err) { console.error('Failed to log error metric', err); }

            throw error; // Re-throw for BullMQ retry logic
        } finally {
            // Cleanup temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    console.log(`[SALES-WORKER] 🧹 Cleaned up temp file: ${tempFilePath}`);
                } catch (cleanupErr) {
                    console.error('[SALES-WORKER] Failed to cleanup temp file:', cleanupErr);
                }
            }
        }
    },
    {
        connection: redisConnection as any,
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
