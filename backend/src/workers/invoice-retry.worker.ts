import { Worker, Job } from 'bullmq';
// import { PrismaClient } from '@prisma/client';
import { prisma } from '../core/database';
import Redis from 'ioredis';
import { env } from '../core/env';
import { redisOptions } from '../core/redis';

// const prisma = new PrismaClient();
const redisConnection = new Redis(env.REDIS_URL, redisOptions);

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
        const start = Date.now();

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

            // Phase 4: Generic Worker Metric
            const duration = Date.now() - start;
            try {
                // @ts-ignore - Stale Prisma types legacy workaround
                await prisma.workerMetric.create({
                    data: {
                        queue_name: 'invoice-retry',
                        job_name: 'requeue-invoice',
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
                invoiceId
            };

        } catch (error: any) {
            const duration = Date.now() - start;
            console.error(`[RetryWorker] ❌ Error retrying invoice #${invoiceId}:`, error);

            // Phase 4: Generic Worker Metric & Error Log
            try {
                await prisma.workerMetric.create({
                    data: {
                        queue_name: 'invoice-retry',
                        job_name: 'requeue-invoice',
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
                        metadata: { jobId: job.id, queue: 'invoice-retry' }
                    }
                });
            } catch (err) { console.error('Failed to log error metric', err); }

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
