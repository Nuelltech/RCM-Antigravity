import { Worker, Job } from 'bullmq';
// import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { IntelligentParserRouter } from '../modules/invoices/services/intelligent-parser-router.service';
import { prisma } from '../core/database';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// const prisma = new PrismaClient();
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

interface InvoiceProcessingJob {
    invoiceId: number;
    tenantId: number;
    ocrText: string;
    filepath: string;
    uploadSource: 'web' | 'mobile' | 'api';
    userId?: number;
    fileContent?: string; // Base64 content
    mimetype?: string;
}

/**
 * Invoice Processing Worker
 * Processes invoices asynchronously in the background
 */
const worker = new Worker<InvoiceProcessingJob>(
    'invoice-processing',
    async (job: Job<InvoiceProcessingJob>) => {
        let { invoiceId, tenantId, ocrText, filepath, uploadSource, userId, fileContent, mimetype } = job.data;
        const startTime = Date.now();
        let tempFileCreated = false;

        console.log(`[Worker] Processing invoice #${invoiceId} (tenant: ${tenantId})`);

        try {
            // ------------------------------------------------------------------
            // Download file from Hostinger if it's a public URL
            // ------------------------------------------------------------------
            if (filepath && filepath.startsWith('http')) {
                try {
                    console.log(`[Worker] 📥 Downloading file from: ${filepath}`);

                    // Download file via HTTPS
                    const response = await fetch(filepath);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // Create temp path
                    const tempDir = os.tmpdir();
                    const ext = mimetype === 'application/pdf' ? '.pdf' : path.extname(filepath) || '.jpg';
                    const tempFilename = `invoice_${invoiceId}_${Date.now()}${ext}`;
                    const tempFilePath = path.join(tempDir, tempFilename);

                    await fs.writeFile(tempFilePath, buffer);

                    console.log(`[Worker] ✅ File downloaded to: ${tempFilePath}`);
                    filepath = tempFilePath; // Override filepath to use local temp file
                    tempFileCreated = true;
                } catch (err: any) {
                    console.error('[Worker] Failed to download file from URL:', err);
                    throw new Error(`Failed to download invoice file: ${err.message}`);
                }
            }
            // ------------------------------------------------------------------

            // Update status to processing
            await prisma.faturaImportacao.update({
                where: { id: invoiceId },
                data: { status: 'processing' }
            });

            // Parse invoice using intelligent router
            const router = new IntelligentParserRouter();
            const result = await router.parse(ocrText, tenantId, filepath);

            // Check if parsing failed (router returns null when all attempts fail)
            if (!result) {
                throw new Error('GEMINI_UNAVAILABLE: All parsing attempts failed (Gemini API unavailable). Invoice será re-processado automaticamente.');
            }

            const duration = Date.now() - startTime;

            // Calculate end-to-end duration (from upload to now)
            const invoice = await prisma.faturaImportacao.findUnique({
                where: { id: invoiceId },
                select: { createdAt: true }
            });
            const endToEndDuration = invoice ? Date.now() - invoice.createdAt.getTime() : null;

            // Update invoice with parsed data
            await prisma.faturaImportacao.update({
                where: { id: invoiceId },
                data: {
                    status: 'reviewing',
                    fornecedor_nome: result.header.fornecedorNome || undefined,
                    fornecedor_nif: result.header.fornecedorNif || undefined,
                    numero_fatura: result.header.numeroFatura || undefined,
                    data_fatura: result.header.dataFatura || undefined,
                    total_sem_iva: result.header.totalSemIva || undefined,
                    total_iva: result.header.totalIva || undefined,
                    total_com_iva: result.header.totalComIva || undefined,
                    processado_em: new Date()
                }
            });

            // Save line items
            const lineItemsData = result.lineItems.map((item, index) => ({
                fatura_importacao_id: invoiceId,
                tenant_id: tenantId,
                linha_numero: item.linhaNumero || index + 1,
                descricao_original: item.descricaoOriginal,
                descricao_limpa: item.descricaoLimpa,
                quantidade: item.quantidade || undefined,
                unidade: item.unidade || undefined,
                preco_unitario: item.precoUnitario || undefined,
                preco_total: item.precoTotal || undefined,
                iva_percentual: item.ivaPercentual || undefined,
                iva_valor: item.ivaValor || undefined,
                status: 'pending' as const
            }));

            await prisma.faturaLinhaImportacao.createMany({
                data: lineItemsData
            });

            // Save processing metrics
            await prisma.invoiceProcessingMetrics.create({
                data: {
                    tenant_id: tenantId,
                    invoice_id: invoiceId,
                    upload_source: uploadSource,
                    user_id: userId,
                    parsing_method: result.method,
                    total_duration_ms: duration,
                    end_to_end_duration_ms: endToEndDuration,
                    success: true,
                    line_items_extracted: result.lineItems.length,
                    template_id: (result as any).template_id || null,
                    template_score: (result as any).template_score || null,
                    gemini_attempts: 0, // TODO: Track from router
                    created_at: new Date()
                }
            });

            console.log(`[Worker] ✅ Invoice #${invoiceId} processed successfully in ${duration}ms (${result.lineItems.length} items, method: ${result.method})`);

            // Phase 4: Generic Worker Metric - SKIPPED FOR PROD HOTFIX

            try {
                // @ts-ignore - Stale Prisma types legacy workaround
                await prisma.workerMetric.create({
                    data: {
                        queue_name: 'invoice-processing',
                        job_name: 'process-invoice',
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
                invoiceId,
                lineItems: result.lineItems.length,
                method: result.method,
                duration
            };

        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Detect if error is from Gemini API being unavailable
            const isGeminiUnavailable =
                error.message?.includes('GEMINI_UNAVAILABLE') ||
                error.message?.includes('503') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('Service Unavailable');

            console.error(`[Worker] ❌ Error processing invoice #${invoiceId}:`, error.message);

            if (isGeminiUnavailable) {
                console.log(`[Worker] 🔄 Gemini temporarily unavailable - invoice will be retried`);
            }

            // Update invoice status to error
            await prisma.faturaImportacao.update({
                where: { id: invoiceId },
                data: {
                    status: 'error',
                    erro_mensagem: isGeminiUnavailable
                        ? 'Gemini AI temporariamente indisponível. A fatura será re-processada automaticamente quando o serviço voltar.'
                        : (error.message || 'Erro desconhecido')
                }
            });

            // Phase 4: Generic Worker Metric - SKIPPED FOR PROD HOTFIX

            try {
                // @ts-ignore - Stale Prisma types legacy workaround
                await prisma.workerMetric.create({
                    data: {
                        queue_name: 'invoice-processing',
                        job_name: 'process-invoice',
                        job_id: job.id,
                        duration_ms: duration,
                        status: 'COMPLETED',
                        processed_at: new Date(),
                        attempts: job.attemptsMade + 1
                    }
                });
            } catch (err) { console.error('Failed to log worker metric', err); }
            // Log to System Errors (ErrorLog) for Dashboard visibility
            await prisma.errorLog.create({
                data: {
                    level: 'ERROR',
                    source: 'WORKER',
                    message: `Invoice #${invoiceId} failed: ${error.message}`,
                    stack_trace: error.stack,
                    tenant_id: tenantId,
                    metadata: {
                        jobId: job.id,
                        uploadSource,
                        method: isGeminiUnavailable ? 'gemini_unavailable' : 'failed'
                    }
                }
            });


            // Save error metrics
            await prisma.invoiceProcessingMetrics.create({
                data: {
                    tenant_id: tenantId,
                    invoice_id: invoiceId,
                    upload_source: uploadSource,
                    user_id: userId,
                    parsing_method: isGeminiUnavailable ? 'gemini_unavailable' : 'failed',
                    total_duration_ms: duration,
                    success: false,
                    gemini_attempts: 0,
                    created_at: new Date()
                }
            });

            throw error;  // Re-throw for BullMQ retry logic
        } finally {
            // Clean up temp file
            if (tempFileCreated && filepath) {
                try {
                    await fs.unlink(filepath);
                    console.log(`[Worker] 🧹 Cleaned up temp file: ${filepath}`);
                } catch (cleanupErr) {
                    console.error('[Worker] Failed to delete temp file:', cleanupErr);
                }
            }
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,  // Process up to 5 invoices in parallel
        limiter: {
            max: 10,  // Max 10 jobs
            duration: 60000  // Per minute (rate limiting)
        }
    }
);

// Event handlers
worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Worker] Shutting down worker...');
    await worker.close();
    await redisConnection.quit();
});

console.log('[Worker] Invoice processing worker started (concurrency: 5)');

export default worker;
