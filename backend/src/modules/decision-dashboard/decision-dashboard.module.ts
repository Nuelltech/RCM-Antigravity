import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../core/database';
import redis from '../../core/redis';

// Expected response structure
export interface StructuralProblem {
    id: string; // menu_item_id as string
    name: string;
    loss: number;
    cmv: number;
    targetCmv: number;
    suggestedAction: string;
}

export interface RecentChange {
    id: string; // alert id as string
    name: string;
    deltaLoss: number;
    extraSalesNeeded?: number;
    priceAdjustment?: number;
    menuItemId: number;
}

export interface ActionTask {
    id: string;
    label: string;
    completed: boolean;
    linkedItemId: string;
    type: 'structural' | 'recent';
}

export async function decisionDashboardRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Decision Dashboard'],
            querystring: z.object({
                refresh: z.string().optional(),
            }),
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Querystring: { refresh?: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        try {
            // Check Redis Cache first (Optional)
            const cacheKey = `tenant:${req.tenantId}:decision_dashboard`;
            const forceRefresh = req.query.refresh === 'true';

            try {
                if (!forceRefresh) {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        console.log('[Decision Dashboard] Serving from Cache');
                        return JSON.parse(cached);
                    }
                }
            } catch (cacheErr) {
                console.warn('[Decision Dashboard] Redis cache GET failed, continuing to compile data...', cacheErr);
            }

            console.log('[Decision Dashboard] Calculating Fresh Data...');
            
            // 0. Fetch Restaurant Settings for Target CMV
            const dadosRestaurante = await prisma.dadosRestaurante.findUnique({
                where: { tenant_id: req.tenantId }
            });
            const globalTargetCmv = Number(dadosRestaurante?.cmv_alerta_amarelo ?? 30);
            
            // 1. Fetch Radar (Recent Changes) - SUPER FAST
            const alerts = await prisma.alertaErosao.findMany({
                where: {
                    tenant_id: req.tenantId,
                    status: 'ATIVO'
                },
                include: {
                    menuItem: {
                        select: { nome_comercial: true }
                    }
                },
                orderBy: { perda_projetada: 'desc' },
                take: 10 // Top 10 worst recent offenders
            });

            // Map Radar to Response structure
            const recentChanges: RecentChange[] = alerts.map(a => ({
                id: a.id.toString(),
                name: a.menuItem.nome_comercial,
                deltaLoss: Number(a.perda_projetada) || 0,
                extraSalesNeeded: a.pratos_extra_necessarios || 0,
                priceAdjustment: Number(a.preco_sugerido) || 0,
                menuItemId: a.menu_item_id
            }));

            // Calculate total risk
            const additionalRisk = recentChanges.reduce((sum, item) => sum + item.deltaLoss, 0);

            // 2. Fetch Hemorrhage (Structural Problems) - HEAVY CALCULATION (30 days)
            let structuralProblems: StructuralProblem[] = [];
            let currentLoss = 0;
            
            const now = new Date();
            const start = new Date(now);
            start.setDate(now.getDate() - 30);
            
            const vendas = await prisma.venda.findMany({
                where: {
                    tenant_id: req.tenantId,
                    data_venda: { gte: start, lte: now },
                    tipo: 'ITEM',
                    menu_item_id: { not: null }
                },
                include: {
                    menuItem: {
                        select: { nome_comercial: true, cmv_percentual: true }
                    }
                }
            });

            const itemHemorrhageMap = new Map<number, any>();
            let totalFaturacao = 0;
            let totalCusto = 0;

            for (const venda of vendas) {
                const itemId = venda.menu_item_id!;
                const menuItem = venda.menuItem;
                if (!menuItem) continue;

                const faturacao = Number(venda.receita_total || 0);
                const custo = Number(venda.custo_total || 0);
                
                totalFaturacao += faturacao;
                totalCusto += custo;

                const targetCmv = globalTargetCmv; // Usar o limite do restaurante em vez de menuItem.cmv_percentual
                const targetCusto = faturacao * (targetCmv / 100);
                
                // If actual cost is bigger than target cost, we lost money
                const hemorragia = custo - targetCusto;

                if (itemHemorrhageMap.has(itemId)) {
                    const existing = itemHemorrhageMap.get(itemId);
                    existing.faturacao += faturacao;
                    existing.custo += custo;
                    existing.hemorragia += hemorragia;
                } else {
                    itemHemorrhageMap.set(itemId, {
                        faturacao,
                        custo,
                        hemorragia,
                        targetCmv,
                        name: menuItem.nome_comercial
                    });
                }
            }

            // Extract top offenders
            const allStructural = Array.from(itemHemorrhageMap.entries())
                .filter(([_, data]) => data.hemorragia > 0)
                .sort((a, b) => b[1].hemorragia - a[1].hemorragia);

            currentLoss = allStructural.reduce((sum, [_, data]) => sum + data.hemorragia, 0);

            structuralProblems = allStructural.slice(0, 10).map(([id, data]) => ({
                id: id.toString(),
                name: data.name,
                loss: data.hemorragia,
                cmv: data.faturacao > 0 ? (data.custo / data.faturacao) * 100 : 0,
                targetCmv: data.targetCmv,
                suggestedAction: 'Ajustar preço ou receita'
            }));

            // Setup overall CMV calculation
            const overallCmv = totalFaturacao > 0 ? (totalCusto / totalFaturacao) * 100 : 0;

            // 3. Generate Actions List (Combines Top 3 of both)
            const tasks: ActionTask[] = [];
            
            // Add top 3 structural fixes
            structuralProblems.slice(0, 3).forEach(p => {
                tasks.push({
                    id: `struc_${p.id}`,
                    label: `Corrigir margem base: ${p.name}`,
                    completed: false,
                    linkedItemId: p.id,
                    type: 'structural'
                });
            });

            // Add top 3 recent changes fixes
            recentChanges.slice(0, 3).forEach(r => {
                tasks.push({
                    id: `recent_${r.id}`,
                    label: `Aceitar subida de preço: ${r.name}`,
                    completed: false,
                    linkedItemId: r.menuItemId.toString(),
                    type: 'recent'
                });
            });

            // Bundle Final Response
            const responseData = {
                marginStatus: {
                    currentLoss,
                    additionalRisk,
                    cmv: overallCmv,
                    targetCmv: globalTargetCmv
                },
                structuralProblems: {
                    items: structuralProblems.slice(0, 5), // Only send top 5 to UI
                    totalItems: allStructural.length
                },
                recentChanges: {
                    items: recentChanges.slice(0, 5),
                    totalItems: alerts.length
                },
                actionList: {
                    tasks
                }
            };

            // Cache in Redis for 4 hours (14400 seconds)
            // Users can burst cache via the "Refresh" button triggering the worker
            try {
                 await redis.setex(cacheKey, 14400, JSON.stringify(responseData));
            } catch (cacheErr) {
                 console.warn('[Decision Dashboard] Redis cache SET failed, skipping cache creation.', cacheErr);
            }

            return responseData;
        } catch (error) {
            req.log.error(error, '[Decision Dashboard] Error calculating data');
            return reply.status(500).send({ error: 'Internal Server Error calculating dashboard' });
        }
    });

}
