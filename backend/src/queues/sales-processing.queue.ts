import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

export const salesProcessingQueue = new Queue('sales-processing', {
    connection: redisConnection
});

export interface SalesProcessingJobData {
    salesImportId: number;
    tenantId: number;
    filepath: string;
    fileContent?: string; // Base64 content for distributed workers
    uploadSource: 'web' | 'api';
    userId?: number;
}

export async function addSalesProcessingJob(data: SalesProcessingJobData) {
    return await salesProcessingQueue.add('process-sales', data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    });
}
