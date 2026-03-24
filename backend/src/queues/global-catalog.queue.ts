import { Queue } from 'bullmq';
import { redisOptions } from '../core/redis';
import { env } from '../core/env';
import Redis from 'ioredis';

// Redis connection (reuse core settings)
const redisConnection = new Redis(env.REDIS_URL, redisOptions);

export interface GlobalCatalogJobData {
    nome: string;
    familia_codigo?: string;
    subfamilia_codigo?: string;
    unidade_medida: string;
    preco_unitario: number; // Preço de compra na unidade base
    origem: 'CROWDSOURCING' | 'MANUAL' | 'SCRAPER';
    tenant_id?: number; // Opcional, apenas para log interno
}

/**
 * Global Catalog Queue
 * Fila responsável por absorver criações de artigos de forma assíncrona,
 * garantindo zero impacto na performance da aplicação principal do cliente.
 */
export const globalCatalogQueue = new Queue<GlobalCatalogJobData>('global-catalog-processing', {
    connection: redisConnection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: {
            count: 100,
            age: 24 * 3600 // Keep for 24 hours
        },
        removeOnFail: {
            count: 500,
            age: 7 * 24 * 3600 // Keep for 7 days
        }
    }
});

// Helper para adicionar trabalhos à fila
export async function addGlobalCatalogJob(data: GlobalCatalogJobData) {
    try {
        const job = await globalCatalogQueue.add('process-catalog-item', data, {
            jobId: `catalog-${data.nome.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`
        });
        return { jobId: job.id, status: 'queued' };
    } catch (error) {
        console.error('[GlobalCatalogQueue] Error adding job:', error);
        return { error };
    }
}
