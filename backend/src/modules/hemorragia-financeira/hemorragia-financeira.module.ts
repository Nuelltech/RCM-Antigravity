import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';
import { subDays } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Gravidade = 'atencao' | 'critico' | 'catastrofe';

interface ItemPerda {
    id: number;
    nome_comercial: string;
    categoria_menu: string | null;
    cmvAtual: number;          // % actual CMV
    cmvTarget: number;         // % configured target
    excessoCMV: number;        // cmvAtual - cmvTarget  (pp)
    pvpMedio: number;          // average selling price
    custoUnitario: number;     // unit cost
    volumeVendas: number;      // units sold in period
    perdaUnitaria: number;     // € lost per unit vs target
    totalPerdido: number;      // perdaUnitaria × volumeVendas
    pvpSugerido: number;       // cost / (target/100)
    gravidade: Gravidade;
    imagemUrl: string | null;
}

interface ItemGanho {
    id: number;
    nome_comercial: string;
    categoria_menu: string | null;
    cmvAtual: number;
    cmvTarget: number;
    economiasCMV: number;      // cmvTarget - cmvAtual (pp saved)
    pvpMedio: number;
    custoUnitario: number;
    volumeVendas: number;
    ganhoUnitario: number;     // € extra margin per unit vs target
    totalGanho: number;
    imagemUrl: string | null;
}

interface Resumo {
    totalPerdido: number;
    totalGanho: number;
    saldoLiquido: number;        // totalGanho - totalPerdido
    numItensPerda: number;
    numItensCatastrofe: number;
    numItensCritico: number;
    numItensAtencao: number;
    numItensGanho: number;
    cmvTarget: number;
    cmvAmarelo: number;
    cmvVermelho: number;
    periodoInicio: string;
    periodoFim: string;
}

interface HemorragiaResponse {
    perdas: ItemPerda[];
    ganhos: ItemGanho[];
    resumo: Resumo;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class HemorragiaFinanceiraService {
    constructor(private tenantId: number) { }

    async analise(startDate: Date, endDate: Date): Promise<HemorragiaResponse> {
        // 1. Get CMV targets configured for this restaurant
        const dadosRestaurante = await prisma.dadosRestaurante.findUnique({
            where: { tenant_id: this.tenantId }
        });

        const cmvAmarelo = Number(dadosRestaurante?.cmv_alerta_amarelo ?? 30);   // e.g. 30%
        const cmvVermelho = Number(dadosRestaurante?.cmv_alerta_vermelho ?? 35); // e.g. 35%
        // We use cmvAmarelo as the "target" — items above here are bleeding
        const cmvTarget = cmvAmarelo;

        // 2. Fetch all active menu items with cost info
        const menuItems = await prisma.menuItem.findMany({
            where: {
                tenant_id: this.tenantId,
                ativo: true,
            },
            include: {
                receita: { select: { custo_por_porcao: true } },
                combo: { select: { custo_total: true } },
                formatoVenda: { select: { custo_unitario: true } },
            }
        });

        // 2b. O(1) query: Fetch all sales aggregations in the period for these items
        const salesAgg = await prisma.venda.groupBy({
            by: ['menu_item_id'],
            where: {
                tenant_id: this.tenantId,
                menu_item_id: { in: menuItems.map(i => i.id) },
                data_venda: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: {
                quantidade: true,
                receita_total: true
            }
        });

        // Map aggregate to dictionary for O(1) loop lookup
        const salesMap = new Map<number, { volumeVendas: number, totalRevenueSales: number }>();
        for (const agg of salesAgg) {
            if (agg.menu_item_id) {
                salesMap.set(agg.menu_item_id, {
                    volumeVendas: Number(agg._sum.quantidade || 0),
                    totalRevenueSales: Number(agg._sum.receita_total || 0)
                });
            }
        }

        const perdas: ItemPerda[] = [];
        const ganhos: ItemGanho[] = [];

        // 3. Process each item (now entirely in-memory and heavily optimized)
        for (const item of menuItems) {
            // Get cost
            let custoUnitario = 0;
            if (item.receita) {
                custoUnitario = Number(item.receita.custo_por_porcao);
            } else if (item.combo) {
                custoUnitario = Number(item.combo.custo_total);
            } else if (item.formatoVenda) {
                custoUnitario = Number(item.formatoVenda.custo_unitario);
            }

            // No cost data — skip
            if (custoUnitario <= 0) continue;

            const itemSales = salesMap.get(item.id);
            if (!itemSales) continue;

            const volumeVendas = itemSales.volumeVendas;
            if (volumeVendas === 0) continue;

            // Weighted average PVP
            const totalRevenueSales = itemSales.totalRevenueSales;
            const pvpMedio = volumeVendas > 0 ? totalRevenueSales / volumeVendas : Number(item.pvp);

            if (pvpMedio <= 0) continue;

            // CMV calculation
            const cmvAtual = (custoUnitario / pvpMedio) * 100;
            const diffCMV = cmvAtual - cmvTarget; // positive = above target (losing), negative = below (winning)

            if (diffCMV > 0) {
                // PERDA: CMV above target
                const perdaUnitaria = pvpMedio * (diffCMV / 100);
                const totalPerdido = perdaUnitaria * volumeVendas;
                const pvpSugerido = custoUnitario / (cmvTarget / 100);

                let gravidade: Gravidade = 'atencao';
                if (cmvAtual > 50) gravidade = 'catastrofe';
                else if (cmvAtual > cmvVermelho) gravidade = 'critico';

                perdas.push({
                    id: item.id,
                    nome_comercial: item.nome_comercial,
                    categoria_menu: item.categoria_menu,
                    cmvAtual: Math.round(cmvAtual * 10) / 10,
                    cmvTarget,
                    excessoCMV: Math.round(diffCMV * 10) / 10,
                    pvpMedio: Math.round(pvpMedio * 100) / 100,
                    custoUnitario: Math.round(custoUnitario * 100) / 100,
                    volumeVendas,
                    perdaUnitaria: Math.round(perdaUnitaria * 100) / 100,
                    totalPerdido: Math.round(totalPerdido * 100) / 100,
                    pvpSugerido: Math.round(pvpSugerido * 100) / 100,
                    gravidade,
                    imagemUrl: item.imagem_url,
                });
            } else {
                // GANHO: CMV below target
                const economiasCMV = Math.abs(diffCMV); // positive pp saved
                const ganhoUnitario = pvpMedio * (economiasCMV / 100);
                const totalGanho = ganhoUnitario * volumeVendas;

                ganhos.push({
                    id: item.id,
                    nome_comercial: item.nome_comercial,
                    categoria_menu: item.categoria_menu,
                    cmvAtual: Math.round(cmvAtual * 10) / 10,
                    cmvTarget,
                    economiasCMV: Math.round(economiasCMV * 10) / 10,
                    pvpMedio: Math.round(pvpMedio * 100) / 100,
                    custoUnitario: Math.round(custoUnitario * 100) / 100,
                    volumeVendas,
                    ganhoUnitario: Math.round(ganhoUnitario * 100) / 100,
                    totalGanho: Math.round(totalGanho * 100) / 100,
                    imagemUrl: item.imagem_url,
                });
            }
        }

        // 4. Sort: losses biggest first, gains biggest first
        perdas.sort((a, b) => b.totalPerdido - a.totalPerdido);
        ganhos.sort((a, b) => b.totalGanho - a.totalGanho);

        // 5. Compute summary
        const totalPerdido = perdas.reduce((sum, p) => sum + p.totalPerdido, 0);
        const totalGanho = ganhos.reduce((sum, g) => sum + g.totalGanho, 0);

        const resumo: Resumo = {
            totalPerdido: Math.round(totalPerdido * 100) / 100,
            totalGanho: Math.round(totalGanho * 100) / 100,
            saldoLiquido: Math.round((totalGanho - totalPerdido) * 100) / 100,
            numItensPerda: perdas.length,
            numItensCatastrofe: perdas.filter(p => p.gravidade === 'catastrofe').length,
            numItensCritico: perdas.filter(p => p.gravidade === 'critico').length,
            numItensAtencao: perdas.filter(p => p.gravidade === 'atencao').length,
            numItensGanho: ganhos.length,
            cmvTarget,
            cmvAmarelo,
            cmvVermelho,
            periodoInicio: startDate.toISOString().split('T')[0],
            periodoFim: endDate.toISOString().split('T')[0],
        };

        return { perdas, ganhos, resumo };
    }
}

// ---------------------------------------------------------------------------
// Zod schemas for validation/docs
// ---------------------------------------------------------------------------

const itemPerdaSchema = z.object({
    id: z.number(),
    nome_comercial: z.string(),
    categoria_menu: z.string().nullable(),
    cmvAtual: z.number(),
    cmvTarget: z.number(),
    excessoCMV: z.number(),
    pvpMedio: z.number(),
    custoUnitario: z.number(),
    volumeVendas: z.number(),
    perdaUnitaria: z.number(),
    totalPerdido: z.number(),
    pvpSugerido: z.number(),
    gravidade: z.enum(['atencao', 'critico', 'catastrofe']),
    imagemUrl: z.string().nullable(),
});

const itemGanhoSchema = z.object({
    id: z.number(),
    nome_comercial: z.string(),
    categoria_menu: z.string().nullable(),
    cmvAtual: z.number(),
    cmvTarget: z.number(),
    economiasCMV: z.number(),
    pvpMedio: z.number(),
    custoUnitario: z.number(),
    volumeVendas: z.number(),
    ganhoUnitario: z.number(),
    totalGanho: z.number(),
    imagemUrl: z.string().nullable(),
});

const resumoSchema = z.object({
    totalPerdido: z.number(),
    totalGanho: z.number(),
    saldoLiquido: z.number(),
    numItensPerda: z.number(),
    numItensCatastrofe: z.number(),
    numItensCritico: z.number(),
    numItensAtencao: z.number(),
    numItensGanho: z.number(),
    cmvTarget: z.number(),
    cmvAmarelo: z.number(),
    cmvVermelho: z.number(),
    periodoInicio: z.string(),
    periodoFim: z.string(),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function hemorragiaRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/analise', {
        schema: {
            tags: ['Hemorragia Financeira'],
            security: [{ bearerAuth: [] }],
            summary: 'Análise de impacto financeiro do menu vs CMV target',
            querystring: z.object({
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }),
            response: {
                200: z.object({
                    perdas: z.array(itemPerdaSchema),
                    ganhos: z.array(itemGanhoSchema),
                    resumo: resumoSchema,
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : subDays(endDate, 30);

        // Set time boundaries to cover the full day
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const service = new HemorragiaFinanceiraService(req.tenantId);
        return service.analise(startDate, endDate);
    });
}
