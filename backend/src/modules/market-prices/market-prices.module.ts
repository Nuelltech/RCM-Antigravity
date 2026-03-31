import { FastifyInstance } from 'fastify';
import { prisma } from '../../core/database';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Limiar de variação (%) para gerar alerta — alterável em runtime via /settings */
let alertThresholdPct = 3;

/** Normaliza string para fuzzy search: lowercase + sem acentos */
function normalizeName(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const MercadoProdutoSchema = z.object({
    nome: z.string().min(1),
    preco: z.number().positive(),
    unidade: z.string().default('UN'),
    preco_embalagem: z.number().positive().optional(),
    tamanho_embalagem: z.string().optional(),
    categoria: z.string().optional(),
    pid: z.string().optional(),
    url: z.string().optional(),
});

const ImportBatchSchema = z.object({
    supermercado: z.enum(['pingo-doce', 'auchan', 'continente', 'makro']),
    produtos: z.array(MercadoProdutoSchema).min(1).max(500),
});

const ListQuery = z.object({
    supermercado: z.string().optional(),
    categoria: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(50),
});

const SearchQuery = z.object({
    q: z.string().min(1),
    supermercado: z.string().optional(),
    limit: z.coerce.number().default(10),
});

const AlertsListQuery = z.object({
    lido: z.coerce.boolean().optional(),
    supermercado: z.string().optional(),
    tipo: z.enum(['DESCIDA', 'SUBIDA']).optional(),
    limit: z.coerce.number().default(50),
});

// ---------------------------------------------------------------------------
// INTERNAL ROUTES — /api/internal/market
// ---------------------------------------------------------------------------

export async function internalMarketPricesRoutes(server: FastifyInstance) {

    /**
     * POST /api/internal/market/import
     * Recebe um batch de produtos do agente manual e faz upsert na tabela mercado_precos.
     * Detecta variações de preço >= ALERT_THRESHOLD_PCT e cria alertas automáticos.
     */
    server.post('/import', {
        schema: {
            tags: ['Internal - Market Prices'],
            summary: 'Importar batch de produtos de um supermercado',
            body: ImportBatchSchema
        }
    }, async (request, reply) => {
        const { supermercado, produtos } = request.body as z.infer<typeof ImportBatchSchema>;

        let created = 0;
        let updated = 0;
        let alertas = 0;

        for (const p of produtos) {
            const nome_normalizado = normalizeName(p.nome);

            const data = {
                supermercado,
                nome_produto: p.nome,
                nome_normalizado,
                preco: p.preco,
                unidade: p.unidade || 'UN',
                preco_embalagem: p.preco_embalagem ?? null,
                tamanho_embalagem: p.tamanho_embalagem ?? null,
                categoria: p.categoria ?? null,
                url_produto: p.url ?? null,
                ultima_atualizacao: new Date(),
            };

            let existingPreco: number | null = null;

            // Se tem pid, upsert por (supermercado, pid)
            if (p.pid) {
                const existing = await prisma.mercadoPreco.findUnique({
                    where: { supermercado_pid: { supermercado, pid: p.pid } }
                });

                if (existing) {
                    existingPreco = Number(existing.preco);
                    await prisma.mercadoPreco.update({
                        where: { id: existing.id },
                        data: { ...data, pid: p.pid }
                    });
                    updated++;
                } else {
                    await prisma.mercadoPreco.create({ data: { ...data, pid: p.pid } });
                    created++;
                }
            } else {
                // Sem pid: upsert por nome_normalizado + supermercado
                const existing = await prisma.mercadoPreco.findFirst({
                    where: { supermercado, nome_normalizado }
                });

                if (existing) {
                    existingPreco = Number(existing.preco);
                    await prisma.mercadoPreco.update({
                        where: { id: existing.id },
                        data
                    });
                    updated++;
                } else {
                    await prisma.mercadoPreco.create({ data });
                    created++;
                }
            }

            // ── Detectar variação de preço e criar alerta ──────────────────
            if (existingPreco !== null && existingPreco > 0) {
                const novoPreco = p.preco;
                const variacaoPct = ((novoPreco - existingPreco) / existingPreco) * 100;
                const absVariacao = Math.abs(variacaoPct);

                if (absVariacao >= alertThresholdPct) {
                    const tipo = variacaoPct < 0 ? 'DESCIDA' : 'SUBIDA';
                    await prisma.mercadoAlerta.create({
                        data: {
                            supermercado,
                            nome_produto: p.nome,
                            preco_anterior: existingPreco,
                            preco_novo: novoPreco,
                            variacao_pct: Math.round(variacaoPct * 100) / 100,
                            tipo,
                        }
                    });
                    alertas++;
                }
            }
        }

        console.log(`[MarketPrices] Import ${supermercado}: +${created} novos, ~${updated} atualizados, 🔔 ${alertas} alertas`);

        return reply.status(201).send({
            success: true,
            supermercado,
            created,
            updated,
            total: created + updated,
            alertas,
        });
    });

    /**
     * GET /api/internal/market/prices
     * Lista produtos importados com filtros.
     */
    server.get('/prices', {
        schema: {
            tags: ['Internal - Market Prices'],
            summary: 'Listar preços de mercado',
            querystring: ListQuery
        }
    }, async (request, reply) => {
        const { supermercado, categoria, q, page, limit } = request.query as z.infer<typeof ListQuery>;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (supermercado) where.supermercado = supermercado;
        if (categoria) where.categoria = { contains: categoria };
        if (q) where.nome_normalizado = { contains: normalizeName(q) };

        const [items, total] = await Promise.all([
            prisma.mercadoPreco.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ supermercado: 'asc' }, { nome_normalizado: 'asc' }]
            }),
            prisma.mercadoPreco.count({ where })
        ]);

        // Estatísticas por supermercado
        const stats = await prisma.mercadoPreco.groupBy({
            by: ['supermercado'],
            _count: { id: true },
            _max: { ultima_atualizacao: true }
        });

        return {
            items,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
            stats: stats.map(s => ({
                supermercado: s.supermercado,
                total: s._count.id,
                ultima_atualizacao: s._max.ultima_atualizacao,
            }))
        };
    });

    /**
     * DELETE /api/internal/market/prices/:id
     */
    server.delete('/prices/:id', {
        schema: {
            tags: ['Internal - Market Prices'],
            summary: 'Remover um produto do catálogo de mercado',
            params: z.object({ id: z.coerce.number() })
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: number };
        try {
            await prisma.mercadoPreco.delete({ where: { id } });
            return { success: true };
        } catch {
            return reply.status(404).send({ error: 'Produto não encontrado' });
        }
    });

    /**
     * DELETE /api/internal/market/prices (bulk delete by supermercado)
     */
    server.delete('/prices', {
        schema: {
            tags: ['Internal - Market Prices'],
            summary: 'Limpar todos os preços de um supermercado',
            querystring: z.object({
                supermercado: z.enum(['pingo-doce', 'auchan', 'continente', 'makro'])
            })
        }
    }, async (request, reply) => {
        const { supermercado } = request.query as { supermercado: string };
        const deleted = await prisma.mercadoPreco.deleteMany({ where: { supermercado } });
        return { success: true, deleted: deleted.count };
    });

    // ── ALERTS ENDPOINTS ────────────────────────────────────────────────────

    /**
     * GET /api/internal/market/settings
     * Retorna as configurações actuais do módulo de mercado.
     */
    server.get('/settings', {
        schema: {
            tags: ['Internal - Market Alerts'],
            summary: 'Ler configurações do módulo de mercado'
        }
    }, async () => {
        return { alert_threshold_pct: alertThresholdPct };
    });

    /**
     * PATCH /api/internal/market/settings
     * Actualizar o limiar de alerta (em runtime, sem reiniciar o servidor).
     */
    server.patch('/settings', {
        schema: {
            tags: ['Internal - Market Alerts'],
            summary: 'Actualizar limiar de alerta de preço',
            body: z.object({
                alert_threshold_pct: z.number().min(0.5).max(50)
            })
        }
    }, async (request) => {
        const { alert_threshold_pct } = request.body as { alert_threshold_pct: number };
        alertThresholdPct = alert_threshold_pct;
        console.log(`[MarketPrices] Limiar de alerta atualizado para ${alertThresholdPct}%`);
        return { success: true, alert_threshold_pct: alertThresholdPct };
    });

    /**
     * GET /api/internal/market/alerts/count
     * Contagem rápida de alertas não lidos — para badge no nav.
     */
    server.get('/alerts/count', {
        schema: {
            tags: ['Internal - Market Alerts'],
            summary: 'Contagem de alertas não lidos'
        }
    }, async () => {
        const [total, nao_lidos] = await Promise.all([
            prisma.mercadoAlerta.count(),
            prisma.mercadoAlerta.count({ where: { lido: false } }),
        ]);
        return { total, nao_lidos };
    });

    /**
     * GET /api/internal/market/alerts
     * Lista alertas com filtros.
     */
    server.get('/alerts', {
        schema: {
            tags: ['Internal - Market Alerts'],
            summary: 'Listar alertas de variação de preço',
            querystring: AlertsListQuery
        }
    }, async (request) => {
        const { lido, supermercado, tipo, limit } = request.query as z.infer<typeof AlertsListQuery>;

        const where: any = {};
        if (lido !== undefined) where.lido = lido;
        if (supermercado) where.supermercado = supermercado;
        if (tipo) where.tipo = tipo;

        const [items, nao_lidos] = await Promise.all([
            prisma.mercadoAlerta.findMany({
                where,
                take: limit,
                orderBy: { data_detetada: 'desc' }
            }),
            prisma.mercadoAlerta.count({ where: { lido: false } })
        ]);

        return { items, nao_lidos };
    });

    /**
     * PATCH /api/internal/market/alerts/:id/read
     * Marcar um alerta como lido.
     */
    server.patch('/alerts/:id/read', {
        schema: {
            tags: ['Internal - Market Alerts'],
            summary: 'Marcar alerta como lido',
            params: z.object({ id: z.coerce.number() })
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: number };
        try {
            await prisma.mercadoAlerta.update({ where: { id }, data: { lido: true } });
            return { success: true };
        } catch {
            return reply.status(404).send({ error: 'Alerta não encontrado' });
        }
    });

    /**
     * PATCH /api/internal/market/alerts/read-all
     * Marcar todos os alertas como lidos.
     */
    server.patch('/alerts/read-all', {
        schema: {
            tags: ['Internal - Market Alerts'],
            summary: 'Marcar todos os alertas como lidos'
        }
    }, async () => {
        const result = await prisma.mercadoAlerta.updateMany({
            where: { lido: false },
            data: { lido: true }
        });
        return { success: true, updated: result.count };
    });

    /**
     * DELETE /api/internal/market/alerts
     * Limpar alertas lidos.
     */
    server.delete('/alerts', {
        schema: {
            tags: ['Internal - Market Alerts'],
            summary: 'Apagar alertas já lidos'
        }
    }, async () => {
        const result = await prisma.mercadoAlerta.deleteMany({ where: { lido: true } });
        return { success: true, deleted: result.count };
    });
}

// ---------------------------------------------------------------------------
// TENANT ROUTES — /api/market-prices
// ---------------------------------------------------------------------------

export async function marketPricesRoutes(server: FastifyInstance) {

    /**
     * GET /api/market-prices/search?q=frango
     * Pesquisa on-demand de preços de mercado para tenants.
     */
    server.get('/search', {
        schema: {
            tags: ['Market Prices'],
            summary: 'Pesquisar preços de mercado por nome de ingrediente',
            querystring: SearchQuery
        }
    }, async (request) => {
        const { q, supermercado, limit } = request.query as z.infer<typeof SearchQuery>;
        const termo = normalizeName(q);

        const where: any = {
            nome_normalizado: { contains: termo }
        };
        if (supermercado) where.supermercado = supermercado;

        const items = await prisma.mercadoPreco.findMany({
            where,
            take: limit,
            orderBy: [{ preco: 'asc' }],
            select: {
                id: true,
                supermercado: true,
                nome_produto: true,
                preco: true,
                unidade: true,
                categoria: true,
                url_produto: true,
                ultima_atualizacao: true,
            }
        });

        return { items, total: items.length };
    });
}
