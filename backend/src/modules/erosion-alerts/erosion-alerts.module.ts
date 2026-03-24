import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';
import { erosionAlertsQueue } from '../../workers/erosion-alerts.worker';

export async function erosionAlertsRoutes(app: FastifyInstance) {
    console.log('[DEBUG] Registering Erosion Alerts Routes...');

    // 1. Get active erosion alerts
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Erosion Alerts'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        const alerts = await prisma.alertaErosao.findMany({
            where: {
                tenant_id: req.tenantId,
                status: 'ATIVO'
            },
            include: {
                menuItem: {
                    select: {
                        nome_comercial: true,
                        imagem_url: true,
                        categoria_menu: true
                    }
                }
            },
            orderBy: {
                perda_projetada: 'desc'
            }
        });

        return { alerts };
    });

    // 2. Resolve or Ignore an alert
    app.withTypeProvider<ZodTypeProvider>().post('/:id/resolve', {
        schema: {
            params: z.object({ id: z.string() }),
            body: z.object({
                status: z.enum(['RESOLVIDO', 'IGNORADO'])
            }),
            tags: ['Erosion Alerts'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Params: { id: string }, Body: { status: 'RESOLVIDO' | 'IGNORADO' } }>, reply: FastifyReply) => {
        if (!req.tenantId || !req.userId) return reply.status(401).send();

        const alertId = parseInt(req.params.id);

        const alert = await prisma.alertaErosao.findFirst({
            where: { id: alertId, tenant_id: req.tenantId }
        });

        if (!alert) return reply.status(404).send({ error: 'Alert not found' });

        await prisma.alertaErosao.update({
            where: { id: alertId },
            data: {
                status: req.body.status,
                data_resolucao: new Date(),
                resolvido_por: req.userId
            }
        });

        // If resolved, we should probably update the baseline so it doesn't alert tomorrow again for the same base
        // Let's reset the baseline to today's cost.
        await prisma.menuItem.update({
            where: { id: alert.menu_item_id },
            data: {
                custo_base_snapshot: alert.custo_hoje,
                data_snapshot: new Date()
            }
        });

        return { success: true };
    });

    // 3. Get Hemorrhage Report (Past Analysis)
    app.withTypeProvider<ZodTypeProvider>().get('/hemorrhage', {
        schema: {
            querystring: z.object({
                startDate: z.string().datetime().optional(), // ISO date
                endDate: z.string().datetime().optional(),   // ISO date
                month: z.number().optional(),                // Or just pass month/year
                year: z.number().optional(),
            }),
            tags: ['Erosion Alerts'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; month?: number; year?: number } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        let start: Date;
        let end: Date;

        const now = new Date();
        if (req.query.startDate && req.query.endDate) {
            start = new Date(req.query.startDate);
            end = new Date(req.query.endDate);
        } else if (req.query.month && req.query.year) {
            start = new Date(req.query.year, req.query.month - 1, 1);
            end = new Date(req.query.year, req.query.month, 0, 23, 59, 59, 999);
        } else {
            // Default to last 30 days
            end = now;
            start = new Date(now);
            start.setDate(now.getDate() - 30);
        }

        // Aggregate sales within the period
        const vendas = await prisma.venda.findMany({
            where: {
                tenant_id: req.tenantId,
                data_venda: { gte: start, lte: end },
                tipo: 'ITEM',
                menu_item_id: { not: null }
            },
            include: {
                menuItem: {
                    select: {
                        nome_comercial: true,
                        cmv_percentual: true,
                    }
                }
            }
        });

        const itemHemorrhageMap = new Map<number, any>();

        for (const venda of vendas) {
            const itemId = venda.menu_item_id!;
            const menuItem = venda.menuItem;
            if (!menuItem) continue;

            const faturacao = Number(venda.receita_total || 0);
            const custo_teorico = Number(venda.custo_total || 0);

            // Assume target 30% if not defined
            const cmv_alvo_perc = Number(menuItem.cmv_percentual || 30);
            const cmv_alvo_valor = faturacao * (cmv_alvo_perc / 100);

            // Hemorrhage = Custo Teórico Gastos - (Faturação * CMV Alvo)
            // (Note: If we had "Custo Real" from inventory, we would do Real - Target. 
            // Here we do Teórico - Target, which reveals margin erosion at point of sale).
            const hemorragia = custo_teorico - cmv_alvo_valor;

            if (itemHemorrhageMap.has(itemId)) {
                const existing = itemHemorrhageMap.get(itemId);
                existing.faturacao += faturacao;
                existing.custo_teorico += custo_teorico;
                existing.quantidade += venda.quantidade;
                existing.hemorragia += hemorragia;
            } else {
                itemHemorrhageMap.set(itemId, {
                    menu_item_id: itemId,
                    nome_comercial: menuItem.nome_comercial,
                    faturacao: faturacao,
                    custo_teorico: custo_teorico,
                    quantidade: venda.quantidade,
                    hemorragia: hemorragia,
                    cmv_alvo_usado: cmv_alvo_perc
                });
            }
        }

        const report = Array.from(itemHemorrhageMap.values())
            .filter(item => item.hemorragia > 0) // Only show items that actually LOST money/margin
            .sort((a, b) => b.hemorragia - a.hemorragia);

        const total_hemorragia = report.reduce((sum, item) => sum + item.hemorragia, 0);

        return {
            period: { start, end },
            report,
            total_hemorragia
        };
    });

    // 4. Manual trigger for erosion alerts check
    app.withTypeProvider<ZodTypeProvider>().post('/trigger', {
        schema: {
            tags: ['Erosion Alerts'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();

        // Use a generic name or same name so the worker processes it
        await erosionAlertsQueue.add('manual-erosion-check', {});

        return { success: true, message: 'Verificação de erosão manual iniciada.' };
    });
}
