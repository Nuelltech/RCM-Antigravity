import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redis, redisOptions } from './redis';
import { env } from './env';
import Redis from 'ioredis';

/**
 * Job Queue Infrastructure
 * 
 * Queues:
 * - recalculation: Price change recalculations (PRIORITY 1)
 * - dashboard-cache: Dashboard stats refresh (future)
 */

// ==================== RECALCULATION QUEUE ====================

export interface RecalculationJobData {
    type: 'price-change' | 'recipe-change' | 'combo-change';
    produtoId?: number;
    receitaId?: number;
    comboId?: number;
    tenantId: number;
    triggeredBy: number; // user_id
    logId?: number;      // For integration reporting
}

export const recalculationQueue = new Queue<RecalculationJobData>('recalculation', {
    connection: new Redis(env.REDIS_URL, redisOptions) as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
            count: 500, // Keep last 500 failed jobs
        },
    },
});

// Queue events for monitoring
export const recalculationQueueEvents = new QueueEvents('recalculation', {
    connection: new Redis(env.REDIS_URL, redisOptions) as any,
});

recalculationQueueEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Recalculation job ${jobId} completed`);
});

recalculationQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Recalculation job ${jobId} failed:`, failedReason);
});

// ==================== SEED DATA QUEUE ====================

export interface SeedDataJobData {
    tenantId: number;
    userId: number;
    options?: {
        includeProducts?: boolean;
        productIds?: number[]; // If we implement specific product selection later
    };
}

export const seedDataQueue = new Queue<SeedDataJobData>('seed-data', {
    connection: new Redis(env.REDIS_URL, redisOptions) as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            count: 100,
            age: 24 * 3600,
        },
    },
});

export const seedDataQueueEvents = new QueueEvents('seed-data', {
    connection: new Redis(env.REDIS_URL, redisOptions) as any,
});

seedDataQueueEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Seed data job ${jobId} completed`);
});

seedDataQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Seed data job ${jobId} failed:`, failedReason);
});

// ==================== HELPERS ====================

/**
 * Add a price change recalculation job
 */
export async function addPriceChangeJob(
    produtoId: number,
    tenantId: number,
    triggeredBy: number,
    logId?: number
) {
    const job = await recalculationQueue.add(
        'price-change',
        {
            type: 'price-change',
            produtoId,
            tenantId,
            triggeredBy,
            logId
        },
        {
            jobId: `price-change-${produtoId}-${Date.now()}`,
        }
    );

    return {
        jobId: job.id,
        status: 'queued',
    };
}

/**
 * Add a recipe change recalculation job
 */
export async function addRecipeChangeJob(
    receitaId: number,
    tenantId: number,
    triggeredBy: number
) {
    const job = await recalculationQueue.add(
        'recipe-change',
        {
            type: 'recipe-change',
            receitaId,
            tenantId,
            triggeredBy,
        },
        {
            jobId: `recipe-change-${receitaId}-${Date.now()}`,
        }
    );

    return {
        jobId: job.id,
        status: 'queued',
    };
}

/**
 * Add a seed data job
 */
export async function addSeedDataJob(
    tenantId: number,
    userId: number,
    options?: SeedDataJobData['options']
) {
    const job = await seedDataQueue.add(
        'seed-initial-data',
        {
            tenantId,
            userId,
            options
        },
        {
            jobId: `seed-${tenantId}-${Date.now()}`,
        }
    );

    return {
        jobId: job.id,
        status: 'queued',
    };
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string) {
    // Try recalculation queue first
    let job = await recalculationQueue.getJob(jobId);

    // If not found, try seed data queue
    if (!job) {
        job = await seedDataQueue.getJob(jobId) as any;
    }

    if (!job) {
        return { status: 'not-found' };
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
        id: job.id,
        status: state,
        progress,
        result: returnValue,
        error: failedReason,
        data: job.data,
    };
}

/**
 * Get queue health metrics
 */
export async function getQueueMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        recalculationQueue.getWaitingCount(),
        recalculationQueue.getActiveCount(),
        recalculationQueue.getCompletedCount(),
        recalculationQueue.getFailedCount(),
        recalculationQueue.getDelayedCount(),
    ]);

    return {
        queue: 'recalculation',
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
    };
}

export default recalculationQueue;
