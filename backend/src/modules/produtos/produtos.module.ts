import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

// Schema
const createProductSchema = z.object({
    nome: z.string(),
    subfamilia_id: z.number(),
    unidade_medida: z.enum(['KG', 'L', 'Unidade']),
    descricao: z.string().optional(),
    codigo_interno: z.string().optional(),
});

const createVariationSchema = z.object({
    produto_id: z.number(),
    tipo_unidade_compra: z.string(),
    unidades_por_compra: z.number(),
    preco_compra: z.number(),
    fornecedor: z.string().optional(),
});

// Service
class ProductService {
    constructor(private tenantId: number) { }
    private db = new TenantDB(this.tenantId);

    async list() {
        return this.db.findMany('produto', {
            include: { variacoes: true, subfamilia: true },
        });
    }

    async create(data: z.infer<typeof createProductSchema>) {
        return this.db.create('produto', data);
    }

    async createVariation(data: z.infer<typeof createVariationSchema>) {
        const preco_unitario = data.preco_compra / data.unidades_por_compra;
        return this.db.create('variacaoProduto', {
            ...data,
            preco_unitario,
        });
    }
}

// Routes
export async function productRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        return service.list();
    });

    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createProductSchema,
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        return service.create(req.body);
    });

    app.withTypeProvider<ZodTypeProvider>().post('/variations', {
        schema: {
            body: createVariationSchema,
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        return service.createVariation(req.body);
    });
}
