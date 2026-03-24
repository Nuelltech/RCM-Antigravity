import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../core/database';
import { env } from '../core/env';
import { redisOptions } from '../core/redis';
import { GlobalCatalogJobData } from '../queues/global-catalog.queue';

const redisConnection = new Redis(env.REDIS_URL, redisOptions);

/**
 * Global Catalog Worker
 * Atualiza silenciosamente a tabela GlobalProduct em background com
 * base nas submissões da rede de restaurantes.
 */
const worker = new Worker<GlobalCatalogJobData>(
    'global-catalog-processing',
    async (job: Job<GlobalCatalogJobData>) => {
        const { nome, familia_codigo, subfamilia_codigo, unidade_medida, preco_unitario, origem } = job.data;
        const startTime = Date.now();

        console.log(`[GlobalCatalogWorker] Processing crowdsource item: ${nome}`);

        try {
            // 1. O nome deve ser limpo e normalizado para evitar duplicidade 
            // (ex: " Batata-doce " -> "Batata Doce")
            // Vamos fazer uma pesquisa case-insensitive
            const normalizedName = nome.trim().toLowerCase();

            // Pesquisa manual usando 'raw' limit 1 por performance caso haja muitos
            const existingProduct = await prisma.globalProduct.findFirst({
                where: { nome: { equals: normalizedName } } // Case insensitive na DB (dependendo do charset, em MySQL default CI)
            });

            if (existingProduct) {
                // 2. Produto existe. Fazer a média ponderada do preço base
                // Nova Média = ((Média Antiga * N) + Novo Preço) / (N + 1)
                const currentN = existingProduct.numero_contribuicoes;
                const currentAvg = Number(existingProduct.preco_mercado);
                const newN = currentN + 1;

                let newAvg = ((currentAvg * currentN) + preco_unitario) / newN;

                // Segurança: Se o preço sugerido for aberrante (ex: 10x superior à média ou 10x inferior), ignoramos para a média não estoirar
                if (preco_unitario > currentAvg * 10 || preco_unitario < currentAvg / 10) {
                    console.log(`[GlobalCatalogWorker] ⚠️ Preço atípico ignorado para efeito de média: ${nome} a ${preco_unitario}`);
                    newAvg = currentAvg;
                }

                await prisma.globalProduct.update({
                    where: { id: existingProduct.id },
                    data: {
                        preco_mercado: newAvg,
                        numero_contribuicoes: newN,
                        ultima_atualizacao: new Date()
                    }
                });

                console.log(`[GlobalCatalogWorker] ✅ Produto atualizado: ${existingProduct.nome} | Nova Média: ${newAvg.toFixed(2)}€ (Baseado em ${newN} contribuições)`);

            } else {
                // 3. Produto não existe, insere como PENDENTE para curadoria no Internal Board
                await prisma.globalProduct.create({
                    data: {
                        nome: nome.trim(),
                        familia_codigo,
                        subfamilia_codigo,
                        unidade_medida,
                        preco_mercado: preco_unitario,
                        numero_contribuicoes: 1,
                        status: 'PENDING',
                        origem: origem || 'CROWDSOURCING'
                    }
                });
                console.log(`[GlobalCatalogWorker] 🆕 Novo produto sugerido: ${nome} (Pendente de Aprovação)`);
            }

            const duration = Date.now() - startTime;
            return { success: true, duration };

        } catch (error: any) {
            console.error(`[GlobalCatalogWorker] ❌ Error processing item ${nome}:`, error.message);
            throw error; // Let BullMQ retry
        }
    },
    {
        connection: redisConnection as any,
        concurrency: 2, // Leve, não precisa de ser muito agressivo
    }
);

worker.on('error', err => {
    console.error('[GlobalCatalogWorker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[GlobalCatalogWorker] Shutting down worker...');
    await worker.close();
    await redisConnection.quit();
});

console.log('[GlobalCatalogWorker] Started');

export default worker;
