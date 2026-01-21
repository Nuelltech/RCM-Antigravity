import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

interface InvoiceRetryJob {
    invoiceId: number;
    tenantId: number;
    userId?: number;
}

/**
 * Invoice Retry Worker
 * Handles manual retries with 10-minute delay
 */
const retryWorker = new Worker<InvoiceRetryJob>(
    'invoice-retry',
    async (job: Job<InvoiceRetryJob>) => {
        const { invoiceId, tenantId, userId } = job.data;

        console.log(`[RetryWorker] Processing retry for invoice #${invoiceId}`);

        try {
            // Get invoice data
            const invoice = await prisma.faturaImportacao.findUnique({
                where: { id: invoiceId }
            });

            if (!invoice) {
                throw new Error(`Invoice #${invoiceId} not found`);
            }

            // Check for duplicate (already approved)
            if (invoice.status === 'approved') {
                console.log(`[RetryWorker] ⚠️  Invoice #${invoiceId} already approved, skipping retry`);
                return {
                    success: false,
                    reason: 'duplicate',
                    invoiceId
                };
            }

            // Re-queue for processing
            const { invoiceProcessingQueue } = await import('../queues/invoice-processing.queue');

            await invoiceProcessingQueue.add('process-invoice', {
                invoiceId: invoice.id,
                tenantId,
                ocrText: invoice.ocr_texto_bruto || '',
                filepath: invoice.ficheiro_url,
                uploadSource: 'web',
                userId
            });

            console.log(`[RetryWorker] ✅ Invoice #${invoiceId} re-queued for processing`);

            return {
                success: true,
                invoiceId
            };

        } catch (error: any) {
            console.error(`[RetryWorker] ❌ Error retrying invoice #${invoiceId}:`, error);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 3  // Less concurrent retries
    }
);

// Event handlers
retryWorker.on('completed', (job) => {
    console.log(`[RetryWorker] Retry job ${job.id} completed`);
});

retryWorker.on('failed', (job, err) => {
    console.error(`[RetryWorker] Retry job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[RetryWorker] Shutting down retry worker...');
    await retryWorker.close();
    await redisConnection.quit();
});

console.log('[RetryWorker] Invoice retry worker started (concurrency: 3)');

export default retryWorker;
