import { Worker, Queue } from 'bullmq';
import { prisma } from '../core/database';
import { addGlobalCatalogJob } from '../queues/global-catalog.queue';
import { recordJobRun } from './recovery.service';
import { env } from '../core/env';
import { redisOptions } from '../core/redis';
import Redis from 'ioredis';

const CATALOG_SCAN_QUEUE = 'catalog-scan-queue';

const connection = new Redis(env.REDIS_URL, redisOptions) as any;

// Queue for scheduling the repeatable job
export const catalogScanQueue = new Queue(CATALOG_SCAN_QUEUE, { connection });

/**
 * Nightly Catalog Scan Worker — Opção A (Zero Risco)
 *
 * Corre diariamente às 03:00 AM.
 * Faz um scan às variacoes_produto criadas nas últimas 24 horas
 * (de qualquer tenant) e submete cada uma ao GlobalCatalog Queue.
 *
 * Zero acoplamento com o fluxo de faturas ou de criação de produtos —
 * simplesmente lê a tabela já existente.
 */
export const catalogScanWorker = new Worker(CATALOG_SCAN_QUEUE, async (job) => {
    console.log('[CatalogScan] 🔍 Starting nightly product scan...');
    const startTime = Date.now();

    const since = new Date();
    since.setHours(since.getHours() - 24); // Últimas 24h

    // Buscar todas as variações criadas/atualizadas desde ontem
    // que tenham preco_unitario definido
    const variations = await prisma.variacaoProduto.findMany({
        where: {
            createdAt: { gte: since },
            ativo: true,
            preco_unitario: { gt: 0 }
        },
        include: {
            produto: {
                include: {
                    subfamilia: {
                        include: {
                            familia: true
                        }
                    }
                }
            }
        },
        take: 1000 // Limite de segurança por run
    });

    console.log(`[CatalogScan] Found ${variations.length} new product variations in last 24h`);

    let submitted = 0;
    let skipped = 0;

    for (const variation of variations) {
        const produto = variation.produto;

        // Segurança: ignorar produtos sem nome ou sem preço válido
        if (!produto?.nome || !variation.preco_unitario) {
            skipped++;
            continue;
        }

        // Submeter ao GlobalCatalog Queue de forma totalmente assíncrona
        await addGlobalCatalogJob({
            nome: produto.nome,
            familia_codigo: produto.subfamilia?.familia?.codigo || undefined,
            subfamilia_codigo: produto.subfamilia?.codigo || undefined,
            unidade_medida: produto.unidade_medida,
            preco_unitario: Number(variation.preco_unitario),
            origem: 'CROWDSOURCING',
            tenant_id: produto.tenant_id
        });

        submitted++;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`[CatalogScan] ✅ Nightly scan complete in ${duration}s:`);
    console.log(`  📤 Submitted to queue: ${submitted}`);
    console.log(`  ⏭️  Skipped (invalid data): ${skipped}`);

    // Record successful run so the recovery service can detect missed runs on startup
    await recordJobRun('catalogScan');

    return { submitted, skipped, duration };

}, {
    connection,
    lockDuration: 5 * 60 * 1000, // 5 min lock (pode haver muitos produtos)
});

catalogScanWorker.on('completed', (job, result) => {
    console.log(`[CatalogScan] Job ${job.id} completed:`, result);
});

catalogScanWorker.on('failed', (job, err) => {
    console.error(`[CatalogScan] Job ${job?.id} failed:`, err.message);
});

// Helper para agendar o job (chamado no startup do servidor)
export async function scheduleCatalogScan() {
    // Limpar jobs repetíveis existentes para evitar duplicados em restart
    const repeatableJobs = await catalogScanQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await catalogScanQueue.removeRepeatableByKey(job.key);
    }

    // Agendar para as 03:00 AM todos os dias
    await catalogScanQueue.add('nightly-catalog-scan', {}, {
        repeat: {
            pattern: '0 3 * * *', // 03:00 AM diariamente
        },
    });

    console.log('[CatalogScan] 🕒 Scheduled nightly scan at 03:00 AM');
}
