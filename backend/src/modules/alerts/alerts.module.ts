import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';
import { subDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

// Types
interface Alert {
    id: string;
    type: 'cmv' | 'cost_increase' | 'inactivity' | 'stale_price';
    severity: 'info' | 'warning' | 'high';
    item: string;
    message: string;
    date: string;
    value?: number;
    threshold?: number;
    lido: boolean;
    arquivado: boolean;
}

class AlertsService {
    constructor(private tenantId: number) { }

    async getAlerts(): Promise<Alert[]> {
        // 1. Run checks and generate new alerts if needed
        await this.generateAlerts();

        // 2. Return persisted alerts from database
        const dbAlerts = await prisma.alertaAi.findMany({
            where: {
                tenant_id: this.tenantId,
                arquivado: false
            },
            orderBy: [
                { lido: 'asc' }, // Unread first
                { createdAt: 'desc' } // Newest first
            ]
        });

        return dbAlerts.map(alert => {
            const contextData = alert.dados_contexto as any;

            // Helper to safely convert to number (returns undefined if NaN or null/undefined)
            const toNumber = (val: any): number | undefined => {
                if (val == null) return undefined;
                const num = Number(val);
                return isNaN(num) ? undefined : num;
            };

            return {
                id: alert.id.toString(),
                type: this.mapAlertType(alert.tipo_alerta),
                severity: this.mapSeverity(alert.severidade),
                item: alert.titulo,
                message: alert.mensagem,
                date: alert.createdAt.toISOString(),
                lido: alert.lido,
                arquivado: alert.arquivado,
                value: toNumber(contextData?.value),
                threshold: toNumber(contextData?.threshold)
            };
        });
    }

    async markAsRead(id: number, userId: number): Promise<void> {
        await prisma.alertaAi.update({
            where: { id, tenant_id: this.tenantId },
            data: {
                lido: true,
                lido_por: userId,
                data_leitura: new Date()
            }
        });
    }

    async archiveAlert(id: number): Promise<void> {
        await prisma.alertaAi.update({
            where: { id, tenant_id: this.tenantId },
            data: {
                arquivado: true
            }
        });
    }

    async regenerateAlerts(): Promise<Alert[]> {
        // Track valid alert IDs during generation
        const validAlertIds = new Set<number>();

        // Generate new alerts and collect their IDs
        await this.generateAlerts(validAlertIds);

        // Archive alerts that are no longer valid (not in the set of generated alerts)
        // Only archive alerts that are currently active (not archived)
        if (validAlertIds.size > 0) {
            await prisma.alertaAi.updateMany({
                where: {
                    tenant_id: this.tenantId,
                    arquivado: false,
                    NOT: {
                        id: { in: Array.from(validAlertIds) }
                    }
                },
                data: {
                    arquivado: true
                }
            });
        } else {
            // If no alerts were generated, archive ALL active alerts
            await prisma.alertaAi.updateMany({
                where: {
                    tenant_id: this.tenantId,
                    arquivado: false
                },
                data: {
                    arquivado: true
                }
            });
        }

        // Return updated alerts
        return await this.getAlerts();
    }

    private async generateAlerts(validAlertIds?: Set<number>) {
        // Get thresholds or create defaults
        let settings = await prisma.dadosRestaurante.findUnique({
            where: { tenant_id: this.tenantId }
        });

        if (!settings) {
            settings = await prisma.dadosRestaurante.create({
                data: {
                    tenant_id: this.tenantId,
                    numero_lugares: 0,
                    horas_trabalho_dia: new Decimal(8),
                    dias_trabalho_semana: new Decimal(5),
                    cmv_alerta_amarelo: new Decimal(30),
                    cmv_alerta_vermelho: new Decimal(35),
                    alerta_aumento_custo_leve: new Decimal(5),
                    alerta_aumento_custo_medio: new Decimal(10),
                    alerta_aumento_custo_grave: new Decimal(15),
                    alerta_inatividade_leve: 3,
                    alerta_inatividade_medio: 6,
                    alerta_inatividade_grave: 10,
                    dias_alerta_preco_estagnado: 30
                }
            });
        }

        const cmvWarning = Number(settings.cmv_alerta_amarelo);
        const cmvHigh = Number(settings.cmv_alerta_vermelho);
        const costIncreaseLow = Number(settings.alerta_aumento_custo_leve);
        const costIncreaseMed = Number(settings.alerta_aumento_custo_medio);
        const costIncreaseHigh = Number(settings.alerta_aumento_custo_grave);
        const inactivityLow = settings.alerta_inatividade_leve;
        const inactivityMed = settings.alerta_inatividade_medio;
        const inactivityHigh = settings.alerta_inatividade_grave;
        const stalePriceDays = settings.dias_alerta_preco_estagnado || 30;

        // 1. CMV Alerts
        const menuItems = await prisma.menuItem.findMany({
            where: { tenant_id: this.tenantId, ativo: true },
            select: { id: true, nome_comercial: true, cmv_percentual: true }
        });

        for (const item of menuItems) {
            const cmv = Number(item.cmv_percentual || 0);
            if (cmv === 0) continue;

            let severity = '';
            let message = '';

            if (cmv >= cmvHigh) {
                severity = 'high';
                message = `CMV muito alto (${cmv.toFixed(1)}%). Meta: <${cmvWarning}%`;
            } else if (cmv >= cmvWarning) {
                severity = 'warning';
                message = `CMV elevado (${cmv.toFixed(1)}%). Atenção necessária.`;
            }

            if (severity) {
                await this.upsertAlert({
                    tipo_alerta: 'cmv',
                    titulo: item.nome_comercial,
                    mensagem: message,
                    severidade: severity,
                    entidade_tipo: 'MenuItem',
                    entidade_id: item.id.toString(),
                    dados_contexto: { value: cmv, threshold: severity === 'high' ? cmvHigh : cmvWarning }
                }, validAlertIds);
            }
        }

        // 2. Cost Increase Alerts
        const recentChanges = await prisma.historicoPreco.findMany({
            where: {
                tenant_id: this.tenantId,
                data_mudanca: { gte: subDays(new Date(), 30) },
                percentual_mudanca: { gt: 0 }
            },
            include: { variacao: { include: { produto: true } } },
            orderBy: { data_mudanca: 'desc' },
            take: 20
        });

        for (const change of recentChanges) {
            const percent = Number(change.percentual_mudanca);
            const productName = change.variacao.produto.nome;
            let severity = '';
            let message = '';

            if (percent >= costIncreaseHigh) {
                severity = 'high';
                message = `Aumento grave de custo: +${percent.toFixed(1)}%`;
            } else if (percent >= costIncreaseMed) {
                severity = 'warning';
                message = `Aumento considerável de custo: +${percent.toFixed(1)}%`;
            } else if (percent >= costIncreaseLow) {
                severity = 'info';
                message = `Ligeiro aumento de custo: +${percent.toFixed(1)}%`;
            }

            if (severity) {
                await this.upsertAlert({
                    tipo_alerta: 'cost_increase',
                    titulo: productName,
                    mensagem: message,
                    severidade: severity,
                    entidade_tipo: 'HistoricoPreco',
                    entidade_id: change.id.toString(),
                    dados_contexto: { value: percent, threshold: costIncreaseLow }
                }, validAlertIds);
            }
        }

        // 3. Inactivity Alerts
        const lastSale = await prisma.venda.findFirst({
            where: { tenant_id: this.tenantId },
            orderBy: { data_venda: 'desc' }
        });

        const lastPurchase = await prisma.compra.findFirst({
            where: { tenant_id: this.tenantId },
            orderBy: { data_compra: 'desc' }
        });

        const now = new Date();

        // Sales Inactivity
        if (lastSale) {
            const daysSinceSale = Math.floor((now.getTime() - lastSale.data_venda.getTime()) / (1000 * 60 * 60 * 24));
            let severity = '';

            if (daysSinceSale >= inactivityHigh) severity = 'high';
            else if (daysSinceSale >= inactivityMed) severity = 'warning';

            if (severity) {
                await this.upsertAlert({
                    tipo_alerta: 'inactivity',
                    titulo: 'Vendas',
                    mensagem: `Sem vendas registadas há ${daysSinceSale} dias.`,
                    severidade: severity,
                    entidade_tipo: 'Venda',
                    entidade_id: lastSale.id.toString(),
                    dados_contexto: { value: daysSinceSale, threshold: inactivityMed }
                }, validAlertIds);
            }
        }

        // Purchases Inactivity
        if (lastPurchase) {
            const daysSincePurchase = Math.floor((now.getTime() - lastPurchase.data_compra.getTime()) / (1000 * 60 * 60 * 24));
            let severity = '';

            if (daysSincePurchase >= inactivityHigh) severity = 'high';
            else if (daysSincePurchase >= inactivityMed) severity = 'warning';

            if (severity) {
                await this.upsertAlert({
                    tipo_alerta: 'inactivity',
                    titulo: 'Compras',
                    mensagem: `Sem compras registadas há ${daysSincePurchase} dias.`,
                    severidade: severity,
                    entidade_tipo: 'Compra',
                    entidade_id: lastPurchase.id.toString(),
                    dados_contexto: { value: daysSincePurchase, threshold: inactivityMed }
                }, validAlertIds);
            }
        }

        // 4. Stale Price Alerts (New)
        // Find products used in Recipes, Combos, or Menus
        const activeProductIds = new Set<number>();

        // Recipes
        const recipeIngredients = await prisma.ingredienteReceita.findMany({
            where: { tenant_id: this.tenantId, produto_id: { not: null } },
            select: { produto_id: true }
        });
        recipeIngredients.forEach((i: any) => i.produto_id && activeProductIds.add(i.produto_id));

        // Combos (Items)
        const comboItems = await prisma.comboItem.findMany({
            where: { tenant_id: this.tenantId, produto_id: { not: null } },
            select: { produto_id: true }
        });
        comboItems.forEach((i: any) => i.produto_id && activeProductIds.add(i.produto_id));

        // Menu Items (Direct Product Sales via FormatoVenda)
        const menuFormats = await prisma.menuItem.findMany({
            where: { tenant_id: this.tenantId, formato_venda_id: { not: null } },
            include: { formatoVenda: true }
        });
        menuFormats.forEach((m: any) => m.formatoVenda?.produto_id && activeProductIds.add(m.formatoVenda.produto_id));

        if (activeProductIds.size > 0) {
            const productsToCheck = await prisma.produto.findMany({
                where: {
                    id: { in: Array.from(activeProductIds) },
                    tenant_id: this.tenantId,
                    ativo: true
                },
                include: {
                    variacoes: {
                        where: { ativo: true },
                        include: {
                            historicoPrecos: {
                                orderBy: { data_mudanca: 'desc' },
                                take: 1
                            }
                        }
                    }
                }
            });

            for (const product of productsToCheck) {
                // Check if ANY active variation has a recent price update
                // If ALL active variations are stale (or no history), then alert.
                // Or should we alert per variation? Usually per product is enough noise.
                // Let's alert if the product has NO recent updates on ANY active variation.

                let hasRecentUpdate = false;
                let lastUpdateDate: Date | null = null;

                for (const variation of product.variacoes) {
                    const lastHistory = variation.historicoPrecos[0];
                    if (lastHistory) {
                        if (!lastUpdateDate || lastHistory.data_mudanca > lastUpdateDate) {
                            lastUpdateDate = lastHistory.data_mudanca;
                        }
                        const daysSinceUpdate = Math.floor((now.getTime() - lastHistory.data_mudanca.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysSinceUpdate <= stalePriceDays) {
                            hasRecentUpdate = true;
                        }
                    }
                }

                // If no variations have history, it's stale (never updated/bought)
                // If all variations have history but > threshold, it's stale.
                if (!hasRecentUpdate && product.variacoes.length > 0) {
                    const daysStale = lastUpdateDate
                        ? Math.floor((now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24))
                        : -1; // -1 indicates never updated

                    const message = daysStale >= 0
                        ? `Preço não atualizado há ${daysStale} dias.`
                        : `Preço nunca atualizado.`;

                    await this.upsertAlert({
                        tipo_alerta: 'stale_price',
                        titulo: product.nome,
                        mensagem: message,
                        severidade: 'warning', // Default to warning
                        entidade_tipo: 'Produto',
                        entidade_id: product.id.toString(),
                        dados_contexto: { value: daysStale >= 0 ? daysStale : null, threshold: stalePriceDays }
                    }, validAlertIds);
                }
            }
        }
    }

    private async upsertAlert(data: {
        tipo_alerta: string;
        titulo: string;
        mensagem: string;
        severidade: string;
        entidade_tipo: string;
        entidade_id: string;
        dados_contexto: any;
    }, validAlertIds?: Set<number>) {
        // Check if active alert exists for this entity
        const existing = await prisma.alertaAi.findFirst({
            where: {
                tenant_id: this.tenantId,
                entidade_tipo: data.entidade_tipo,
                entidade_id: data.entidade_id,
                arquivado: false,
                tipo_alerta: data.tipo_alerta // Added type check to differentiate multiple alerts for same entity
            }
        });

        if (!existing) {
            const newAlert = await prisma.alertaAi.create({
                data: {
                    tenant_id: this.tenantId,
                    ...data
                }
            });
            if (validAlertIds) validAlertIds.add(newAlert.id);
        } else {
            // Update existing if severity changed or message updated
            if (existing.severidade !== data.severidade || existing.mensagem !== data.mensagem) {
                await prisma.alertaAi.update({
                    where: { id: existing.id },
                    data: {
                        severidade: data.severidade,
                        mensagem: data.mensagem,
                        dados_contexto: data.dados_contexto,
                        lido: false // Re-open if things changed
                    }
                });
            }
            if (validAlertIds) validAlertIds.add(existing.id);
        }
    }

    private mapAlertType(type: string): 'cmv' | 'cost_increase' | 'inactivity' | 'stale_price' {
        if (['cmv', 'cost_increase', 'inactivity', 'stale_price'].includes(type)) {
            return type as any;
        }
        return 'cmv'; // Default fallback
    }

    private mapSeverity(severity: string): 'info' | 'warning' | 'high' {
        if (['info', 'warning', 'high'].includes(severity)) {
            return severity as any;
        }
        return 'info'; // Default fallback
    }
}

export async function alertsRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Alerts'],
            security: [{ bearerAuth: [] }],
            response: {
                200: z.array(z.object({
                    id: z.string(),
                    type: z.enum(['cmv', 'cost_increase', 'inactivity', 'stale_price']),
                    severity: z.enum(['info', 'warning', 'high']),
                    item: z.string(),
                    message: z.string(),
                    date: z.string(),
                    value: z.number().optional(),
                    threshold: z.number().optional(),
                    lido: z.boolean(),
                    arquivado: z.boolean()
                }))
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new AlertsService(req.tenantId);
        return await service.getAlerts();
    });

    app.withTypeProvider<ZodTypeProvider>().post('/regenerate', {
        schema: {
            tags: ['Alerts'],
            security: [{ bearerAuth: [] }],
            body: z.object({}).optional(),
            response: {
                200: z.array(z.object({
                    id: z.string(),
                    type: z.enum(['cmv', 'cost_increase', 'inactivity', 'stale_price']),
                    severity: z.enum(['info', 'warning', 'high']),
                    item: z.string(),
                    message: z.string(),
                    date: z.string(),
                    value: z.number().optional(),
                    threshold: z.number().optional(),
                    lido: z.boolean(),
                    arquivado: z.boolean()
                }))
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new AlertsService(req.tenantId);
        return await service.regenerateAlerts();
    });

    app.withTypeProvider<ZodTypeProvider>().patch('/:id/read', {
        schema: {
            tags: ['Alerts'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number)
            }),
            response: {
                204: z.null()
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new AlertsService(req.tenantId);
        const userId = (req.user as any).id;
        await service.markAsRead(req.params.id, userId);
        return reply.status(204).send();
    });

    app.withTypeProvider<ZodTypeProvider>().patch('/:id/archive', {
        schema: {
            tags: ['Alerts'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number)
            }),
            response: {
                204: z.null()
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new AlertsService(req.tenantId);
        await service.archiveAlert(req.params.id);
        return reply.status(204).send();
    });
}
