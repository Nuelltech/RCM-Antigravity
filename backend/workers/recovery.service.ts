
import { Worker, Queue } from 'bullmq';
import { prisma } from '../core/database';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

export class RecoveryService {
    private queue: Queue;

    constructor() {
        this.queue = new Queue('invoice-processing', { connection: redisConnection });
    }

    /**
     * Recover invoices that are stuck in 'pending' or 'processing' state
     * but are not actually being processed by any active job.
     * 
     * Strategy:
     * 1. Find invoices created > 5 minutes ago that are still 'pending'/'processing'
     * 2. Re-add them to the queue
     */
    async recoverStuckInvoices() {
        console.log('[Recovery] 🛡️ Starting stuck invoice recovery scan...');

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        try {
            // Find stuck invoices
            const stuckInvoices = await prisma.faturaImportacao.findMany({
                where: {
                    status: { in: ['pending', 'processing'] },
                    createdAt: { lt: fiveMinutesAgo },
                    // Ensure we don't pick up ones that finished but status wasn't updated (rare)
                    processado_em: null
                },
                take: 50 // Limit batch size
            });

            if (stuckInvoices.length === 0) {
                console.log('[Recovery] ✅ No stuck invoices found.');
                return;
            }

            console.log(`[Recovery] ⚠️ Found ${stuckInvoices.length} stuck invoices. Attempting recovery...`);

            for (const invoice of stuckInvoices) {
                console.log(`[Recovery] 🔄 Re-queuing invoice #${invoice.id}...`);

                // Reset status to pending just in case it was 'processing'
                await prisma.faturaImportacao.update({
                    where: { id: invoice.id },
                    data: { status: 'pending' }
                });

                // Add back to queue
                await this.queue.add('process-invoice', {
                    invoiceId: invoice.id,
                    tenantId: invoice.tenant_id,
                    ocrText: invoice.ocr_texto_bruto || '',
                    filepath: invoice.ficheiro_url,
                    uploadSource: 'recovery',
                    userId: undefined, // We might lose the original uploader ID if not stored in invoice table
                    mimetype: invoice.ficheiro_tipo === 'pdf' ? 'application/pdf' : 'image/jpeg'
                    // Note: Basic mimetype inference, ideal would be to store it in DB
                });
            }

            console.log(`[Recovery] 🚀 Successfully re-queued ${stuckInvoices.length} invoices.`);

        } catch (error) {
            console.error('[Recovery] ❌ Error during recovery scan:', error);
        }
    }
}

export const recoveryService = new RecoveryService();
