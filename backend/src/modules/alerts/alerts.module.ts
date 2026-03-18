import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';
import { addAlertsJob } from '../../core/queue';

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
        // Return persisted alerts from database (fast read-only operation)
        // Alert regeneration happens in background via regenerateAlertsAsync()
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

    /**
     * Dispatch alert generation job to the background worker
     */
    async regenerateAlertsAsync(userId?: number): Promise<void> {
        await addAlertsJob(this.tenantId, userId, true);
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
                202: z.object({
                    message: z.string(),
                    status: z.string()
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new AlertsService(req.tenantId);

        // Dispatch job and return 202 Accepted immediately
        await service.regenerateAlertsAsync((req.user as any)?.id);

        return reply.status(202).send({
            message: 'Alert generation started in background.',
            status: 'processing'
        });
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

// Export AlertsService for use in other modules
export { AlertsService };
