import { Worker, Job } from 'bullmq';
import redis from '../core/redis';
import { RecalculationJobData } from '../core/queue';
import { recalculationService } from '../modules/produtos/recalculation.service';
import { dashboardCache } from '../core/cache.service';

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

    const { type, produtoId, receitaId, comboId, tenantId } = job.data;

    try {
        let result;

        switch (type) {
            case 'price-change':
                if (!produtoId) {
                    throw new Error('produtoId is required for price-change job');
                }
                await job.updateProgress(10);
                result = await recalculationService.recalculateAfterPriceChange(produtoId);
                await job.updateProgress(100);
                console.log(`✅ Price change recalculation complete:`, result);
                return result;

            case 'recipe-change':
                if (!receitaId) {
                    throw new Error('receitaId is required for recipe-change job');
                }
                await job.updateProgress(10);
                result = await recalculationService.recalculateAfterRecipeChange(receitaId);
                await job.updateProgress(100);
                console.log(`✅ Recipe change recalculation complete:`, result);
                return result;

            case 'combo-change':
                if (!comboId) {
                    throw new Error('comboId is required for combo-change job');
                }
                await job.updateProgress(10);
                result = await recalculationService.recalculateAfterComboChange(comboId);
                await job.updateProgress(100);
                console.log(`✅ Combo change recalculation complete:`, result);
                return result;

            default:
                throw new Error(`Unknown job type: ${type}`);
        }
    } catch (error: any) {
        console.error(`❌ Recalculation job failed [${job.id}]:`, error);
        throw error; // BullMQ will retry based on attempts config
    }
}

// Create worker
const recalculationWorker = new Worker<RecalculationJobData>(
    'recalculation',
    processRecalculationJob,
    {
        connection: redis,
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
        console.log(`[CACHE INVALIDATE] Dashboard cache cleared for tenant ${job.data.tenantId} after recalculation`);
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
