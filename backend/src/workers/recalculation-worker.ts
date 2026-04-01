import { Worker, Job } from 'bullmq';
import { redisOptions, redis } from '../core/redis';
import { env } from '../core/env';
import Redis from 'ioredis';
import { RecalculationJobData } from '../core/queue';
import { recalculationService } from '../modules/produtos/recalculation.service';
import { dashboardCache } from '../core/cache.service';
import { menuCache } from '../core/menu-cache';

/**
 * Recalculation Worker
 * 
 * Processes background jobs for:
 * - Price change recalculations
 * - Recipe change recalculations  
 * - Combo change recalculations
 * 
 * Run this as a separate process:
 * ```
 * tsx src/workers/recalculation-worker.ts
 * ```
 */

async function processRecalculationJob(job: Job<RecalculationJobData>) {
    console.log(`🔧 Processing ${job.name} [${job.id}]`, job.data);

    const { type, produtoId, produtoIds, receitaId, comboId, tenantId, logId } = job.data;

    const start = Date.now();

    try {
        let result;

        switch (type) {
            case 'price-change':
                if (!produtoId) {
                    throw new Error('produtoId is required for price-change job');
                }
                result = await recalculationService.recalculateAfterPriceChange(produtoId, logId, job.data.origin);
                await job.updateProgress(100);
                console.log(`✅ Price change recalculation complete:`, result);
                break;

            case 'bulk-price-change':
                if (!produtoIds || !Array.isArray(produtoIds)) {
                    throw new Error('produtoIds array is required for bulk-price-change job');
                }
                result = await recalculationService.recalculateBulkPriceChange(
                    produtoIds, 
                    logId, 
                    job.data.origin,
                    async (p: number) => { await job.updateProgress(p); }
                );
                await job.updateProgress(100);
                console.log(`✅ Bulk price change recalculation complete:`, result);
                break;

            case 'recipe-change':
                if (!receitaId) {
                    throw new Error('receitaId is required for recipe-change job');
                }
                await job.updateProgress(10);
                result = await recalculationService.recalculateAfterRecipeChange(receitaId);
                await job.updateProgress(100);
                console.log(`✅ Recipe change recalculation complete:`, result);
                break;

            case 'combo-change':
                if (!comboId) {
                    throw new Error('comboId is required for combo-change job');
                }
                await job.updateProgress(10);
                result = await recalculationService.recalculateAfterComboChange(comboId);
                await job.updateProgress(100);
                console.log(`✅ Combo change recalculation complete:`, result);
                break;

            default:
                throw new Error(`Unknown job type: ${type}`);
        }

        // Log Success Metric
        const duration = Date.now() - start;
        try {
            const { prisma } = await import('../core/database');
            // @ts-ignore - Stale Prisma types legacy workaround
            await prisma.workerMetric.create({
                data: {
                    queue_name: 'recalculation',
                    job_name: type,
                    job_id: job.id,
                    duration_ms: duration,
                    status: 'COMPLETED',
                    processed_at: new Date(),
                    attempts: job.attemptsMade + 1
                }
            });
        } catch (logErr) {
            console.error('[WorkerLogger] Failed to log success metric:', logErr);
        }

        return result;

    } catch (error: any) {
        const duration = Date.now() - start;
        console.error(`❌ Recalculation job failed [${job.id}]:`, error);

        // Log Error Metric & Error Log
        try {
            const { prisma } = await import('../core/database');

            await prisma.workerMetric.create({
                data: {
                    queue_name: 'recalculation',
                    job_name: type || 'unknown',
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
                    metadata: { jobId: job.id, jobData: job.data, queue: 'recalculation' } as any
                }
            });
        } catch (logErr) {
            console.error('[WorkerLogger] Failed to log error metrics:', logErr);
        }

        throw error; // BullMQ will retry based on attempts config
    }
}

// Create worker
const recalculationWorker = new Worker<RecalculationJobData>(
    'recalculation',
    processRecalculationJob,
    {
        connection: redis as any,
        concurrency: 5, // Process up to 5 jobs concurrently
        limiter: {
            max: 10, // Max 10 jobs
            duration: 1000, // per second
        },
    }
);

recalculationWorker.on('completed', async (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);

    // Invalidate dashboard cache after recalculation completes
    // (costs have changed, dashboard stats need refresh)
    if (job.data.tenantId) {
        await dashboardCache.invalidateTenant(job.data.tenantId);
        await menuCache.invalidateTenant(job.data.tenantId);
        console.log(`[CACHE INVALIDATE] Dashboard and Menu caches cleared for tenant ${job.data.tenantId} after recalculation`);
    }

    // Mark IntegrationLog as completed so the frontend banner clears
    if (job.data.logId) {
        try {
            const { prisma } = await import('../core/database');
            await prisma.integrationLog.update({
                where: { id: job.data.logId },
                data: { status: 'completed', completed_at: new Date() }
            });
            console.log(`[RecalcWorker] IntegrationLog ${job.data.logId} marked as completed`);
        } catch (err) {
            console.error(`[RecalcWorker] Failed to update IntegrationLog ${job.data.logId}:`, err);
        }
    }
});

recalculationWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});

recalculationWorker.on('error', (err) => {
    console.error('❌ Worker error:', err);
});

console.log('🚀 Recalculation worker started');
console.log('   Listening for jobs on queue: recalculation');
console.log('   Concurrency: 5');
console.log('   Rate limit: 10 jobs/second');

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM received, closing worker...');
    await recalculationWorker.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⚠️  SIGINT received, closing worker...');
    await recalculationWorker.close();
    process.exit(0);
});

export default recalculationWorker;
