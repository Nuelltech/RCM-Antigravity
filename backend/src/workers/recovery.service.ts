import { redis } from '../core/redis';
import { Queue } from 'bullmq';
import { prisma } from '../core/database';
import Redis from 'ioredis';

const redisConnection = redis;

// Redis keys for tracking last successful run of each scheduled worker
export const LAST_RUN_KEY = {
    subscriptionCheck: 'worker:last_run:subscription-check',
    catalogScan: 'worker:last_run:catalog-scan',
} as const;

// Queues referenced by the recovery service
const queues = {
    subscriptionCheck: new Queue('subscription-check-queue', { connection: redisConnection as any }),
    catalogScan: new Queue('catalog-scan-queue', { connection: redisConnection as any }),
    invoiceProcessing: new Queue('invoice-processing', { connection: redisConnection as any }),
};

/**
 * Calculate the last expected run time for a daily cron at a given UTC hour.
 * Returns the most recent past occurrence of HH:00 UTC.
 *
 * Example: cronHour=2 at 17:00 UTC → returns today 02:00 UTC
 * Example: cronHour=2 at 01:00 UTC → returns yesterday 02:00 UTC
 */
function getLastExpectedRun(cronHour: number): Date {
    const now = new Date();
    const expected = new Date();
    expected.setUTCHours(cronHour, 0, 0, 0);
    if (now.getTime() < expected.getTime()) {
        // Today's window hasn't happened yet — last expected was yesterday
        expected.setUTCDate(expected.getUTCDate() - 1);
    }
    return expected;
}

export class RecoveryService {

    /**
     * Check if scheduled workers missed their run while the server was asleep.
     * Safe to call on every startup — uses BullMQ jobId deduplication to
     * prevent double-execution if already queued.
     *
     * Only the 2 daily scheduled workers need this:
     *  - subscription-check (02:00 UTC)
     *  - catalog-scan (03:00 UTC)
     *
     * Event-driven workers (invoice, sales, recalculation…) are not affected
     * because their jobs persist in Redis until consumed.
     */
    async recoverMissedScheduledJobs() {
        console.log('[Recovery] 🕐 Checking for missed scheduled jobs...');

        await Promise.all([
            this._checkMissedJob({
                name: 'subscription-check',
                cronHour: 2,
                redisKey: LAST_RUN_KEY.subscriptionCheck,
                queue: queues.subscriptionCheck,
                jobName: 'daily-lifecycle-check',
            }),
            this._checkMissedJob({
                name: 'catalog-scan',
                cronHour: 3,
                redisKey: LAST_RUN_KEY.catalogScan,
                queue: queues.catalogScan,
                jobName: 'nightly-catalog-scan',
            }),
        ]);
    }

    private async _checkMissedJob(opts: {
        name: string;
        cronHour: number;
        redisKey: string;
        queue: Queue;
        jobName: string;
    }) {
        const { name, cronHour, redisKey, queue, jobName } = opts;
        try {
            const lastExpected = getLastExpectedRun(cronHour);
            const now = new Date();

            // If server just started and the scheduled window was less than 5 min ago,
            // the normal BullMQ scheduler may still pick it up — skip catch-up.
            const windowAgeMs = now.getTime() - lastExpected.getTime();
            if (windowAgeMs < 5 * 60 * 1000) {
                console.log(`[Recovery] ⏳ ${name}: scheduled window just passed (<5 min ago), skipping catch-up`);
                return;
            }

            const lastRunStr = await redisConnection.get(redisKey);

            if (!lastRunStr) {
                // First ever run — never recorded. Enqueue now.
                console.log(`[Recovery] 🆕 ${name}: no previous run recorded. Enqueueing catch-up...`);
                await queue.add(jobName, {}, {
                    jobId: `catchup-${name}-${lastExpected.toISOString()}`,
                    removeOnComplete: true,
                });
                return;
            }

            const lastRun = new Date(lastRunStr);

            if (lastRun.getTime() < lastExpected.getTime()) {
                console.log(
                    `[Recovery] ⚠️  ${name}: MISSED RUN detected!\n` +
                    `  Last run:     ${lastRun.toISOString()}\n` +
                    `  Expected at:  ${lastExpected.toISOString()}\n` +
                    `  → Enqueueing catch-up job now...`
                );
                // jobId deduplicates: if a catch-up was already enqueued this won't double-add
                await queue.add(jobName, {}, {
                    jobId: `catchup-${name}-${lastExpected.toISOString()}`,
                    removeOnComplete: true,
                });
                console.log(`[Recovery] 🚀 ${name}: catch-up job enqueued`);
            } else {
                console.log(`[Recovery] ✅ ${name}: last run OK (${lastRun.toISOString()})`);
            }
        } catch (err) {
            console.error(`[Recovery] ❌ Error checking ${name}:`, err);
        }
    }

    /**
     * Recover invoices that are stuck in 'pending' or 'processing' state
     * but are not being processed by any active job.
     */
    async recoverStuckInvoices() {
        console.log('[Recovery] 🛡️ Starting stuck invoice recovery scan...');

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        try {
            const stuckInvoices = await prisma.faturaImportacao.findMany({
                where: {
                    status: { in: ['pending', 'processing'] },
                    createdAt: { lt: fiveMinutesAgo },
                    processado_em: null,
                },
                take: 50,
            });

            if (stuckInvoices.length === 0) {
                console.log('[Recovery] ✅ No stuck invoices found.');
                return;
            }

            console.log(`[Recovery] ⚠️ Found ${stuckInvoices.length} stuck invoices. Re-queuing...`);

            for (const invoice of stuckInvoices) {
                await prisma.faturaImportacao.update({
                    where: { id: invoice.id },
                    data: { status: 'pending' },
                });

                await queues.invoiceProcessing.add('process-invoice', {
                    invoiceId: invoice.id,
                    tenantId: invoice.tenant_id,
                    ocrText: invoice.ocr_texto_bruto || '',
                    filepath: invoice.ficheiro_url,
                    uploadSource: 'recovery',
                    userId: undefined,
                    mimetype: invoice.ficheiro_tipo === 'pdf' ? 'application/pdf' : 'image/jpeg',
                });

                console.log(`[Recovery] 🔄 Re-queued invoice #${invoice.id}`);
            }

            console.log(`[Recovery] 🚀 Successfully re-queued ${stuckInvoices.length} invoices.`);
        } catch (error) {
            console.error('[Recovery] ❌ Error during recovery scan:', error);
        }
    }
}

export const recoveryService = new RecoveryService();

/**
 * Record a successful run of a scheduled job in Redis.
 * Call this at the END of each scheduled worker's job handler,
 * so the recovery service knows when the job last ran successfully.
 *
 * @example
 *   await recordJobRun('subscriptionCheck');
 */
export async function recordJobRun(jobType: keyof typeof LAST_RUN_KEY): Promise<void> {
    try {
        await redisConnection.set(LAST_RUN_KEY[jobType], new Date().toISOString());
        console.log(`[Recovery] 📝 Recorded last run for ${jobType}`);
    } catch (err) {
        console.error(`[Recovery] ⚠️ Failed to record last run for ${jobType}:`, err);
    }
}
