import { FastifyInstance } from 'fastify';
import { prisma } from '../../core/database';
import { z } from 'zod';
import { GlobalCatalogSearchQuery, GlobalCatalogInternalQuery, GlobalCatalogStatusUpdateBody } from './global-catalog.schema';

export async function globalCatalogRoutes(server: FastifyInstance) {
    // ------------------------------------------------------------------------
    // TENANT ROUTES: Pesquisa rápida por clientes ativos 
    // (/api/catalog/search)
    // ------------------------------------------------------------------------
    server.get('/search', {
        schema: {
            tags: ['GlobalCatalog'],
            summary: 'Busca produtos globais aprovados',
            querystring: GlobalCatalogSearchQuery
        }
    }, async (request, reply) => {
        const query = request.query as z.infer<typeof GlobalCatalogSearchQuery>;

        // Apenas para Tenants verem produtos APROVADOS e com origem CROWDSOURCING ou MANUAL
        const items = await prisma.globalProduct.findMany({
            where: {
                nome: { contains: query.q },
                status: 'APPROVED'
            },
            take: query.limit,
            orderBy: { numero_contribuicoes: 'desc' } // Populares primeiro
        });

        return { items };
    });
}

export async function internalGlobalCatalogRoutes(server: FastifyInstance) {
    // ------------------------------------------------------------------------
    // INTERNAL ROUTES: Curadoria do Catálogo 
    // (/api/internal/catalog)
    // ------------------------------------------------------------------------
    server.get('/', {
        schema: {
            tags: ['Internal - Catalog'],
            summary: 'Listar produtos globais em espera para Backoffice',
            querystring: GlobalCatalogInternalQuery
        }
    }, async (request, reply) => {
        const { status, page, limit } = request.query as z.infer<typeof GlobalCatalogInternalQuery>;
        const skip = (page - 1) * limit;

        const whereClause = status ? { status } : {};

        const [items, total] = await Promise.all([
            prisma.globalProduct.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: [
                    { status: 'asc' }, // PENDING primeiro (A/P/R -> PENDING comes before REJECTED but wait, by alphabetical A comes first. Let's force an order or use raw, but simple object order is fine)
                    { numero_contribuicoes: 'desc' },
                    { createdAt: 'desc' }
                ]
            }),
            prisma.globalProduct.count({ where: whereClause })
        ]);

        return {
            items,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    });

    server.patch('/:id/status', {
        schema: {
            tags: ['Internal - Catalog'],
            summary: 'Aprovar ou Rejeitar um template de produto',
            params: z.object({ id: z.coerce.number() }),
            body: GlobalCatalogStatusUpdateBody
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: number };
        const { status } = request.body as z.infer<typeof GlobalCatalogStatusUpdateBody>;

        const item = await prisma.globalProduct.update({
            where: { id },
            data: { status }
        });

        return { success: true, item };
    });

    // POST /trigger-scan — Disparo manual do Catalog Scan sem esperar pelo cron das 03:00 AM
    server.post('/trigger-scan', {
        schema: {
            tags: ['Internal - Catalog'],
            summary: 'Disparar manualmente o scan de novos produtos para o catálogo global',
            body: z.object({}).optional(), // Accept empty body (frontend sends Content-Type: application/json with no body)
        }
    }, async (request, reply) => {
        const { catalogScanQueue } = await import('../../workers/catalog-scan.worker');

        // Adiciona um job único imediato (não é um job repetível)
        const job = await catalogScanQueue.add('manual-catalog-scan', {}, {
            jobId: `manual-scan-${Date.now()}`
        });

        console.log(`[Internal] 🔧 Manual catalog scan triggered — Job ID: ${job.id}`);

        return {
            success: true,
            message: 'Scan de catálogo iniciado em background. Os resultados estarão disponíveis em breve.',
            jobId: job.id
        };
    });

    // Possível rota de Fusão (Merge) seria adicionada aqui no futuro.
}
