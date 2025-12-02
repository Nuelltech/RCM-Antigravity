import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';
import { subDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

// Types
interface Alert {
    id: string;
    type: 'cmv' | 'cost_increase' | 'inactivity';
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

        return dbAlerts.map(alert => ({
            id: alert.id.toString(),
            type: this.mapAlertType(alert.tipo_alerta),
            severity: this.mapSeverity(alert.severidade),
            item: alert.titulo,
            message: alert.mensagem,
            date: alert.createdAt.toISOString(),
            lido: alert.lido,
            arquivado: alert.arquivado,
            value: (alert.dados_contexto as any)?.value,
            threshold: (alert.dados_contexto as any)?.threshold
        }));
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

    private async generateAlerts() {
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
                });
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
                });
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
                });
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
                });
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
    }) {
        // Check if active alert exists for this entity
        const existing = await prisma.alertaAi.findFirst({
            where: {
                tenant_id: this.tenantId,
                entidade_tipo: data.entidade_tipo,
                entidade_id: data.entidade_id,
                arquivado: false
            }
        });

        if (!existing) {
            await prisma.alertaAi.create({
                data: {
                    tenant_id: this.tenantId,
                    ...data
                }
            });
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
        }
    }

    private mapAlertType(type: string): 'cmv' | 'cost_increase' | 'inactivity' {
        if (['cmv', 'cost_increase', 'inactivity'].includes(type)) {
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
                    type: z.enum(['cmv', 'cost_increase', 'inactivity']),
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
