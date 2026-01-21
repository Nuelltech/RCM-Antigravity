import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { prisma } from '../../core/database';
import { dashboardCache } from '../../core/cache.service';
import { Decimal } from '@prisma/client/runtime/library';

// Zod Schemas
const updateDadosRestauranteSchema = z.object({
    numero_lugares: z.number().int().min(0).optional(),
    horas_trabalho_dia: z.number().positive().max(24).optional(),
    dias_trabalho_semana: z.number().positive().max(7).optional(),
    // Alert Thresholds
    cmv_alerta_amarelo: z.number().positive().optional(),
    cmv_alerta_vermelho: z.number().positive().optional(),
    alerta_aumento_custo_leve: z.number().positive().optional(),
    alerta_aumento_custo_medio: z.number().positive().optional(),
    alerta_aumento_custo_grave: z.number().positive().optional(),
    alerta_inatividade_leve: z.number().int().positive().optional(),
    alerta_inatividade_medio: z.number().int().positive().optional(),
    alerta_inatividade_grave: z.number().int().positive().optional(),
});

const createCustoSchema = z.object({
    descricao: z.string().min(1),
    classificacao: z.enum([
        'Salário',
        'Eletricidade',
        'Água',
        'Marketing',
        'Contabilidade',
        'Sistemas',
        'Internet',
        'Veículos',
        'Renda',
        'Gestão',
        'Outros'
    ]),
    valor_mensal: z.number().positive(),
});

const updateCustoSchema = z.object({
    descricao: z.string().min(1).optional(),
    classificacao: z.enum([
        'Salário',
        'Eletricidade',
        'Água',
        'Marketing',
        'Contabilidade',
        'Sistemas',
        'Internet',
        'Veículos',
        'Renda',
        'Gestão',
        'Outros'
    ]).optional(),
    valor_mensal: z.number().positive().optional(),
    ativo: z.boolean().optional(),
});

// Service
class DadosRestauranteService {
    constructor(private tenantId: number) { }

    async getOrCreate() {
        let dados = await prisma.dadosRestaurante.findUnique({
            where: { tenant_id: this.tenantId }
        });

        if (!dados) {
            dados = await prisma.dadosRestaurante.create({
                data: {
                    tenant_id: this.tenantId,
                    numero_lugares: 0,
                    horas_trabalho_dia: new Decimal(8),
                    dias_trabalho_semana: new Decimal(5),
                    // Defaults
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

        return dados;
    }

    async update(data: z.infer<typeof updateDadosRestauranteSchema>) {
        const updateData: any = {};

        if (data.numero_lugares !== undefined) {
            updateData.numero_lugares = data.numero_lugares;
        }
        if (data.horas_trabalho_dia !== undefined) {
            updateData.horas_trabalho_dia = new Decimal(data.horas_trabalho_dia);
        }
        if (data.dias_trabalho_semana !== undefined) {
            updateData.dias_trabalho_semana = new Decimal(data.dias_trabalho_semana);
        }

        // Alert Thresholds
        if (data.cmv_alerta_amarelo !== undefined) updateData.cmv_alerta_amarelo = new Decimal(data.cmv_alerta_amarelo);
        if (data.cmv_alerta_vermelho !== undefined) updateData.cmv_alerta_vermelho = new Decimal(data.cmv_alerta_vermelho);
        if (data.alerta_aumento_custo_leve !== undefined) updateData.alerta_aumento_custo_leve = new Decimal(data.alerta_aumento_custo_leve);
        if (data.alerta_aumento_custo_medio !== undefined) updateData.alerta_aumento_custo_medio = new Decimal(data.alerta_aumento_custo_medio);
        if (data.alerta_aumento_custo_grave !== undefined) updateData.alerta_aumento_custo_grave = new Decimal(data.alerta_aumento_custo_grave);
        if (data.alerta_inatividade_leve !== undefined) updateData.alerta_inatividade_leve = data.alerta_inatividade_leve;
        if (data.alerta_inatividade_medio !== undefined) updateData.alerta_inatividade_medio = data.alerta_inatividade_medio;
        if (data.alerta_inatividade_grave !== undefined) updateData.alerta_inatividade_grave = data.alerta_inatividade_grave;

        return await prisma.dadosRestaurante.upsert({
            where: { tenant_id: this.tenantId },
            update: updateData,
            create: {
                tenant_id: this.tenantId,
                numero_lugares: data.numero_lugares ?? 0,
                horas_trabalho_dia: data.horas_trabalho_dia ? new Decimal(data.horas_trabalho_dia) : new Decimal(8),
                dias_trabalho_semana: data.dias_trabalho_semana ? new Decimal(data.dias_trabalho_semana) : new Decimal(5),
                cmv_alerta_amarelo: data.cmv_alerta_amarelo ? new Decimal(data.cmv_alerta_amarelo) : new Decimal(30),
                cmv_alerta_vermelho: data.cmv_alerta_vermelho ? new Decimal(data.cmv_alerta_vermelho) : new Decimal(35),
                alerta_aumento_custo_leve: data.alerta_aumento_custo_leve ? new Decimal(data.alerta_aumento_custo_leve) : new Decimal(5),
                alerta_aumento_custo_medio: data.alerta_aumento_custo_medio ? new Decimal(data.alerta_aumento_custo_medio) : new Decimal(10),
                alerta_aumento_custo_grave: data.alerta_aumento_custo_grave ? new Decimal(data.alerta_aumento_custo_grave) : new Decimal(15),
                alerta_inatividade_leve: data.alerta_inatividade_leve ?? 3,
                alerta_inatividade_medio: data.alerta_inatividade_medio ?? 6,
                alerta_inatividade_grave: data.alerta_inatividade_grave ?? 10,
            }
        });
    }

    async listCustos() {
        return await prisma.custoEstrutura.findMany({
            where: {
                tenant_id: this.tenantId,
                ativo: true
            },
            orderBy: [
                { classificacao: 'asc' },
                { descricao: 'asc' }
            ]
        });
    }

    async createCusto(data: z.infer<typeof createCustoSchema>) {
        // 1. Create the Cost Item (Parent)
        const custo = await prisma.custoEstrutura.create({
            data: {
                tenant_id: this.tenantId,
                descricao: data.descricao,
                classificacao: data.classificacao,
                valor_mensal: new Decimal(data.valor_mensal),
            }
        });


        // 2. Create the Initial History Record (Child)
        await prisma.custoEstruturaHistorico.create({
            data: {
                tenant_id: this.tenantId,
                custo_estrutura_id: custo.id,
                valor: new Decimal(data.valor_mensal),
                data_inicio: new Date(),
                motivo_mudanca: 'Criação inicial',
            }
        });

        // Invalidate dashboard cache
        await dashboardCache.invalidate(`*:${this.tenantId}:*`);

        return custo;
    }

    async updateCusto(id: number, data: z.infer<typeof updateCustoSchema>) {
        const custo = await prisma.custoEstrutura.findFirst({
            where: { id, tenant_id: this.tenantId }
        });

        if (!custo) {
            throw new Error('Custo não encontrado');
        }

        const updateData: any = {};
        if (data.descricao !== undefined) updateData.descricao = data.descricao;
        if (data.classificacao !== undefined) updateData.classificacao = data.classificacao;
        if (data.ativo !== undefined) updateData.ativo = data.ativo;

        // Handle Value Change with History
        if (data.valor_mensal !== undefined && Number(data.valor_mensal) !== Number(custo.valor_mensal)) {
            updateData.valor_mensal = new Decimal(data.valor_mensal);

            // 1. Close current history record
            await prisma.custoEstruturaHistorico.updateMany({
                where: {
                    custo_estrutura_id: id,
                    data_fim: null
                },
                data: {
                    data_fim: new Date()
                }
            });

            // 2. Create new history record
            await prisma.custoEstruturaHistorico.create({
                data: {
                    tenant_id: this.tenantId,
                    custo_estrutura_id: id,
                    valor: new Decimal(data.valor_mensal),
                    data_inicio: new Date(),
                    motivo_mudanca: 'Atualização de valor',
                }
            });
        }

        const result = await prisma.custoEstrutura.update({
            where: { id },
            data: updateData
        });

        // Invalidate dashboard cache
        await dashboardCache.invalidate(`*:${this.tenantId}:*`);

        return result;
    }

    async deleteCusto(id: number) {
        const custo = await prisma.custoEstrutura.findFirst({
            where: { id, tenant_id: this.tenantId }
        });

        if (!custo) {
            throw new Error('Custo não encontrado');
        }

        // Close history when disabling/deleting
        await prisma.custoEstruturaHistorico.updateMany({
            where: {
                custo_estrutura_id: id,
                data_fim: null
            },
            data: {
                data_fim: new Date()
            }
        });

        const result = await prisma.custoEstrutura.update({
            where: { id },
            data: { ativo: false }
        });

        // Invalidate dashboard cache
        await dashboardCache.invalidate(`*:${this.tenantId}:*`);

        return result;
    }

    async calculateCustos(periodo: 'mes' | 'semana' | 'dia' | 'hora') {
        const custos = await this.listCustos();
        const dados = await this.getOrCreate();

        const totalMensal = custos.reduce((sum, custo) => {
            return sum + Number(custo.valor_mensal);
        }, 0);

        let valor = totalMensal;
        let label = 'Mês';

        switch (periodo) {
            case 'semana':
                valor = totalMensal / 4.33; // Average weeks per month
                label = 'Semana';
                break;
            case 'dia':
                const diasPorMes = Number(dados.dias_trabalho_semana) * 4.33;
                valor = totalMensal / diasPorMes;
                label = 'Dia';
                break;
            case 'hora':
                const diasPorMes2 = Number(dados.dias_trabalho_semana) * 4.33;
                const custoDiario = totalMensal / diasPorMes2;
                valor = custoDiario / Number(dados.horas_trabalho_dia);
                label = 'Hora';
                break;
            default:
                label = 'Mês';
        }

        return {
            valor: Number(valor.toFixed(2)),
            periodo: label,
            totalMensal: Number(totalMensal.toFixed(2)),
            breakdown: custos.map(c => ({
                id: c.id,
                descricao: c.descricao,
                classificacao: c.classificacao,
                valor_mensal: Number(c.valor_mensal)
            }))
        };
    }
}

// Routes
export async function dadosRestauranteRoutes(app: FastifyInstance) {
    // Get restaurant data
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Dados Restaurante'],
            security: [{ bearerAuth: [] }],
            response: {
                200: z.object({
                    id: z.number(),
                    tenant_id: z.number(),
                    numero_lugares: z.number(),
                    horas_trabalho_dia: z.number(),
                    dias_trabalho_semana: z.number(),
                    // Alert Thresholds
                    cmv_alerta_amarelo: z.number(),
                    cmv_alerta_vermelho: z.number(),
                    alerta_aumento_custo_leve: z.number(),
                    alerta_aumento_custo_medio: z.number(),
                    alerta_aumento_custo_grave: z.number(),
                    alerta_inatividade_leve: z.number(),
                    alerta_inatividade_medio: z.number(),
                    alerta_inatividade_grave: z.number(),
                    createdAt: z.string(),
                    updatedAt: z.string(),
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const service = new DadosRestauranteService(req.tenantId);
        const dados = await service.getOrCreate();

        return {
            ...dados,
            horas_trabalho_dia: Number(dados.horas_trabalho_dia),
            dias_trabalho_semana: Number(dados.dias_trabalho_semana),
            cmv_alerta_amarelo: Number(dados.cmv_alerta_amarelo),
            cmv_alerta_vermelho: Number(dados.cmv_alerta_vermelho),
            alerta_aumento_custo_leve: Number(dados.alerta_aumento_custo_leve),
            alerta_aumento_custo_medio: Number(dados.alerta_aumento_custo_medio),
            alerta_aumento_custo_grave: Number(dados.alerta_aumento_custo_grave),
            createdAt: dados.createdAt.toISOString(),
            updatedAt: dados.updatedAt.toISOString(),
        };
    });

    // Update restaurant data
    app.withTypeProvider<ZodTypeProvider>().put('/', {
        schema: {
            tags: ['Dados Restaurante'],
            security: [{ bearerAuth: [] }],
            body: updateDadosRestauranteSchema,
            response: {
                200: z.object({
                    id: z.number(),
                    tenant_id: z.number(),
                    numero_lugares: z.number(),
                    horas_trabalho_dia: z.number(),
                    dias_trabalho_semana: z.number(),
                    cmv_alerta_amarelo: z.number(),
                    cmv_alerta_vermelho: z.number(),
                    alerta_aumento_custo_leve: z.number(),
                    alerta_aumento_custo_medio: z.number(),
                    alerta_aumento_custo_grave: z.number(),
                    alerta_inatividade_leve: z.number(),
                    alerta_inatividade_medio: z.number(),
                    alerta_inatividade_grave: z.number(),
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const service = new DadosRestauranteService(req.tenantId);
        const dados = await service.update(req.body);

        return {
            ...dados,
            horas_trabalho_dia: Number(dados.horas_trabalho_dia),
            dias_trabalho_semana: Number(dados.dias_trabalho_semana),
            cmv_alerta_amarelo: Number(dados.cmv_alerta_amarelo),
            cmv_alerta_vermelho: Number(dados.cmv_alerta_vermelho),
            alerta_aumento_custo_leve: Number(dados.alerta_aumento_custo_leve),
            alerta_aumento_custo_medio: Number(dados.alerta_aumento_custo_medio),
            alerta_aumento_custo_grave: Number(dados.alerta_aumento_custo_grave),
        };
    });

    // List costs
    app.withTypeProvider<ZodTypeProvider>().get('/custos', {
        schema: {
            tags: ['Dados Restaurante'],
            security: [{ bearerAuth: [] }],
            response: {
                200: z.array(z.object({
                    id: z.number(),
                    uuid: z.string(),
                    descricao: z.string(),
                    classificacao: z.string(),
                    valor_mensal: z.number(),
                    ativo: z.boolean(),
                    createdAt: z.string(),
                    updatedAt: z.string(),
                }))
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const service = new DadosRestauranteService(req.tenantId);
        const custos = await service.listCustos();

        return custos.map(c => ({
            ...c,
            valor_mensal: Number(c.valor_mensal),
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        }));
    });

    // Create cost
    app.withTypeProvider<ZodTypeProvider>().post('/custos', {
        schema: {
            tags: ['Dados Restaurante'],
            security: [{ bearerAuth: [] }],
            body: createCustoSchema,
            response: {
                201: z.object({
                    id: z.number(),
                    uuid: z.string(),
                    descricao: z.string(),
                    classificacao: z.string(),
                    valor_mensal: z.number(),
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const service = new DadosRestauranteService(req.tenantId);
        const custo = await service.createCusto(req.body);

        reply.status(201);
        return {
            ...custo,
            valor_mensal: Number(custo.valor_mensal),
        };
    });

    // Update cost
    app.withTypeProvider<ZodTypeProvider>().put('/custos/:id', {
        schema: {
            tags: ['Dados Restaurante'],
            security: [{ bearerAuth: [] }],
            params: z.object({ id: z.string() }),
            body: updateCustoSchema,
            response: {
                200: z.object({
                    id: z.number(),
                    descricao: z.string(),
                    classificacao: z.string(),
                    valor_mensal: z.number(),
                    ativo: z.boolean(),
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const service = new DadosRestauranteService(req.tenantId);
        const custo = await service.updateCusto(parseInt(req.params.id), req.body);

        return {
            ...custo,
            valor_mensal: Number(custo.valor_mensal),
        };
    });

    // Delete cost
    app.withTypeProvider<ZodTypeProvider>().delete('/custos/:id', {
        schema: {
            tags: ['Dados Restaurante'],
            security: [{ bearerAuth: [] }],
            params: z.object({ id: z.string() }),
            response: {
                200: z.object({ success: z.boolean() })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const service = new DadosRestauranteService(req.tenantId);
        await service.deleteCusto(parseInt(req.params.id));

        return { success: true };
    });

    // Get total costs by period
    app.withTypeProvider<ZodTypeProvider>().get('/custos/total', {
        schema: {
            tags: ['Dados Restaurante'],
            security: [{ bearerAuth: [] }],
            querystring: z.object({
                periodo: z.enum(['mes', 'semana', 'dia', 'hora']).default('mes')
            }),
            response: {
                200: z.object({
                    valor: z.number(),
                    periodo: z.string(),
                    totalMensal: z.number(),
                    breakdown: z.array(z.object({
                        id: z.number(),
                        descricao: z.string(),
                        classificacao: z.string(),
                        valor_mensal: z.number(),
                    }))
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const service = new DadosRestauranteService(req.tenantId);
        return await service.calculateCustos(req.query.periodo);
    });
}
