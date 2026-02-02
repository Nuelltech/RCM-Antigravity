import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Redis connection
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

/**
 * Invoice Processing Queue
 * Main queue for processing uploaded invoices
 */
export const invoiceProcessingQueue = new Queue('invoice-processing', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: {
            count: 5,  // Keep only last 5 completed jobs (Debug only)
            age: 3600  // Keep for 1 hour
        },
        removeOnFail: {
            count: 20,  // Keep last 20 failed jobs for debugging
            age: 24 * 3600  // Keep for 24 hours
        }
    }
});

/**
 * Invoice Retry Queue
 * Queue for manual retries (10 minute delay)
 */
export const invoiceRetryQueue = new Queue('invoice-retry', {
    connection: redisConnection,
    defaultJobOptions: {
        delay: 10 * 60 * 1000,  // 10 minutes
        attempts: 1,  // Only 1 attempt for retries
        removeOnComplete: {
            count: 50,
            age: 7 * 24 * 3600
        },
        removeOnFail: {
            count: 100,
            age: 30 * 24 * 3600
        }
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Queues] Shutting down gracefully...');
    await invoiceProcessingQueue.close();
    await invoiceRetryQueue.close();
    await redisConnection.quit();
});

console.log('[Queues] Invoice processing queues initialized');
