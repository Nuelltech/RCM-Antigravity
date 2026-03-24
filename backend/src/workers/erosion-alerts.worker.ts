import { Worker, Queue } from 'bullmq';
import { prisma } from '../core/database';
import { env } from '../core/env';
import { redisOptions } from '../core/redis';
import Redis from 'ioredis';

const connection = new Redis(env.REDIS_URL, redisOptions) as any;

const EROSION_ALERTS_QUEUE = 'erosion-alerts-queue';

export const erosionAlertsQueue = new Queue(EROSION_ALERTS_QUEUE, { connection });

export const erosionAlertsWorker = new Worker(EROSION_ALERTS_QUEUE, async (job) => {
    console.log('[EROSION ALERTS WORKER] 🔍 Starting daily erosion checks...');

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 1. Get all active tenants
    const tenants = await prisma.tenant.findMany({
        where: { ativo: true },
        select: { id: true, configuracoes: true }
    });

    for (const tenant of tenants) {
        // 2. Get active menu items with baseline cost
        const menuItems = await prisma.menuItem.findMany({
            where: { tenant_id: tenant.id, ativo: true },
            include: {
                receita: { select: { custo_por_porcao: true } },
                combo: { select: { custo_total: true } },
                formatoVenda: { select: { custo_unitario: true } }
            }
        });

        for (const item of menuItems) {
            // Determine C_hoje
            let c_hoje_num = 0;
            if (item.receita_id && item.receita) {
                c_hoje_num = Number(item.receita.custo_por_porcao);
            } else if (item.combo_id && item.combo) {
                c_hoje_num = Number(item.combo.custo_total);
            } else if (item.formato_venda_id && item.formatoVenda) {
                c_hoje_num = Number(item.formatoVenda.custo_unitario);
            } else {
                continue; // No valid cost source
            }

            // Has it been updated/recorded?
            if (!item.custo_base_snapshot) {
                // If it's the first time processing this item, set the baseline and continue
                await prisma.menuItem.update({
                    where: { id: item.id },
                    data: {
                        custo_base_snapshot: c_hoje_num,
                        data_snapshot: now
                    }
                });
                continue;
            }

            const c_base_num = Number(item.custo_base_snapshot);

            // Did the cost increase?
            if (c_hoje_num > c_base_num) {
                // 3. Calculate historical volume (V_hist)
                const sales = await prisma.venda.aggregate({
                    where: {
                        menu_item_id: item.id,
                        data_venda: { gte: thirtyDaysAgo }
                    },
                    _sum: {
                        quantidade: true
                    }
                });

                const v_hist = sales._sum.quantidade || 0;

                if (v_hist > 0) {
                    // Cost variation
                    const delta_c = c_hoje_num - c_base_num;

                    // Current Margin
                    const preco_venda = Number(item.pvp || 0);
                    const margem_atual = preco_venda - c_hoje_num;

                    if (margem_atual <= 0) {
                        // Edge case: Losing money unconditionally. 
                        // Projected loss is still delta_c * volume plus whatever it was losing.
                        // We'll keep it simple for now as requested.
                    }

                    const perda_projetada = delta_c * v_hist;

                    let pratos_extra = 0;
                    if (margem_atual > 0) {
                        pratos_extra = Math.ceil(perda_projetada / margem_atual);
                    }

                    // Suggested Price to maintain absolute margin
                    // (P_anterior - C_base) = (P_novo - C_hoje)  => P_novo = P_anterior + Delta_C
                    const preco_sugerido = preco_venda + delta_c;

                    // Upsert Alert
                    // Check if there is an active alert for this item
                    const activeAlert = await prisma.alertaErosao.findFirst({
                        where: {
                            tenant_id: tenant.id,
                            menu_item_id: item.id,
                            status: 'ATIVO'
                        }
                    });

                    if (activeAlert) {
                        // Update existing alert
                        await prisma.alertaErosao.update({
                            where: { id: activeAlert.id },
                            data: {
                                custo_hoje: c_hoje_num,
                                volume_30d: v_hist,
                                preco_venda_atual: preco_venda,
                                margem_atual: margem_atual,
                                perda_projetada: perda_projetada,
                                pratos_extra_necessarios: pratos_extra,
                                preco_sugerido: preco_sugerido,
                                data_detecao: now
                            }
                        });
                    } else {
                        // Create new alert
                        await prisma.alertaErosao.create({
                            data: {
                                tenant_id: tenant.id,
                                menu_item_id: item.id,
                                custo_base: c_base_num,
                                custo_hoje: c_hoje_num,
                                volume_30d: v_hist,
                                preco_venda_atual: preco_venda,
                                margem_atual: margem_atual,
                                perda_projetada: perda_projetada,
                                pratos_extra_necessarios: pratos_extra,
                                preco_sugerido: preco_sugerido,
                                status: 'ATIVO'
                            }
                        });
                    }
                }
            } else if (c_hoje_num < c_base_num) {
                // If the cost goes down, maybe resolve active alerts automatically or update the baseline?
                // Let's reset the baseline so we have a new lower floor to track future increases.
                await prisma.menuItem.update({
                    where: { id: item.id },
                    data: {
                        custo_base_snapshot: c_hoje_num,
                        data_snapshot: now
                    }
                });

                // Auto-resolve any active alerts
                await prisma.alertaErosao.updateMany({
                    where: {
                        tenant_id: tenant.id,
                        menu_item_id: item.id,
                        status: 'ATIVO'
                    },
                    data: {
                        status: 'RESOLVIDO',
                        data_resolucao: now
                    }
                });
            }
        }
    }

    console.log(`[EROSION ALERTS WORKER] ✅ Daily check complete.`);

}, {
    connection,
    lockDuration: 60_000, // 1 min lock
});

// Helper to schedule the job (called on server startup)
export async function scheduleErosionAlerts() {
    const repeatableJobs = await erosionAlertsQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await erosionAlertsQueue.removeRepeatableByKey(job.key);
    }

    // Schedule for 04:00 AM every day
    await erosionAlertsQueue.add('daily-erosion-check', {}, {
        repeat: {
            pattern: '0 4 * * *',
        },
    });

    console.log('[EROSION ALERTS WORKER] 🕒 Scheduled daily erosion check for 04:00 AM');
}
