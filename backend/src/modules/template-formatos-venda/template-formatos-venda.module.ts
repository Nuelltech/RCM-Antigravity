import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

// Schemas
const createTemplateSchema = z.object({
    nome: z.string().min(1),
    descricao: z.string().optional(),
    quantidade: z.number().positive(),
    unidade_medida: z.enum(['L', 'ML', 'KG', 'G', 'UN', 'Unidade']),
    ordem_exibicao: z.number().int().optional(),
});

const updateTemplateSchema = z.object({
    nome: z.string().min(1).optional(),
    descricao: z.string().optional(),
    quantidade: z.number().positive().optional(),
    unidade_medida: z.enum(['L', 'ML', 'KG', 'G', 'UN', 'Unidade']).optional(),
    ativo: z.boolean().optional(),
    ordem_exibicao: z.number().int().optional(),
});

// Service
class TemplateFormatoVendaService {
    constructor(private tenantId: number) { }
    private db = new TenantDB(this.tenantId);

    async list(params: { ativo?: boolean }) {
        const where: any = {};

        if (params.ativo !== undefined) {
            where.ativo = params.ativo;
        }

        return await this.db.findMany('templateFormatoVenda', {
            where,
            orderBy: [
                { ordem_exibicao: 'asc' },
                { nome: 'asc' }
            ]
        });
    }

    async getById(id: number) {
        const templates = await this.db.findMany<any>('templateFormatoVenda', {
            where: { id },
            include: {
                _count: {
                    select: { formatosVenda: true }
                }
            },
            take: 1
        });

        const template = templates[0];

        if (!template) {
            throw new Error('Template não encontrado');
        }

        return template;
    }

    async create(data: z.infer<typeof createTemplateSchema>) {
        return await this.db.create('templateFormatoVenda', data);
    }

    async update(id: number, data: z.infer<typeof updateTemplateSchema>) {
        // Verify template exists
        await this.getById(id);

        return await this.db.update('templateFormatoVenda', id, data);
    }

    async delete(id: number) {
        // Check if template is in use
        const template = await this.getById(id);

        if (template._count.formatosVenda > 0) {
            throw new Error(`Template está a ser usado por ${template._count.formatosVenda} formato(s) de venda`);
        }

        return await this.db.delete('templateFormatoVenda', id);
    }
}

// Routes
export async function templateFormatoVendaRoutes(server: FastifyInstance) {
    const typedServer = server.withTypeProvider<ZodTypeProvider>();

    // List templates
    typedServer.get('/template-formatos-venda', {
        schema: {
            querystring: z.object({
                ativo: z.enum(['true', 'false']).optional(),
            }),
        },
    }, async (request, reply) => {
        const tenantId = request.tenantId;
        if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const service = new TemplateFormatoVendaService(tenantId);

        const ativo = request.query.ativo === 'true' ? true :
            request.query.ativo === 'false' ? false : undefined;

        const templates = await service.list({ ativo });
        return reply.send(templates);
    });

    // Get template by ID
    typedServer.get('/template-formatos-venda/:id', {
        schema: {
            params: z.object({
                id: z.string().transform(Number),
            }),
        },
    }, async (request, reply) => {
        const tenantId = request.tenantId;
        if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const service = new TemplateFormatoVendaService(tenantId);

        try {
            const template = await service.getById(request.params.id);
            return reply.send(template);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
    });

    // Create template
    typedServer.post('/template-formatos-venda', {
        schema: {
            body: createTemplateSchema,
        },
    }, async (request, reply) => {
        const tenantId = request.tenantId;
        if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const service = new TemplateFormatoVendaService(tenantId);

        const template = await service.create(request.body);
        return reply.status(201).send(template);
    });

    // Update template
    typedServer.put('/template-formatos-venda/:id', {
        schema: {
            params: z.object({
                id: z.string().transform(Number),
            }),
            body: updateTemplateSchema,
        },
    }, async (request, reply) => {
        const tenantId = request.tenantId;
        if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const service = new TemplateFormatoVendaService(tenantId);

        try {
            const template = await service.update(request.params.id, request.body);
            return reply.send(template);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
    });

    // Delete template
    typedServer.delete('/template-formatos-venda/:id', {
        schema: {
            params: z.object({
                id: z.string().transform(Number),
            }),
        },
    }, async (request, reply) => {
        const tenantId = request.tenantId;
        if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

        const service = new TemplateFormatoVendaService(tenantId);

        try {
            await service.delete(request.params.id);
            return reply.status(204).send();
        } catch (error: any) {
            const status = error.message.includes('está a ser usado') ? 400 : 404;
            return reply.status(status).send({ error: error.message });
        }
    });
}
