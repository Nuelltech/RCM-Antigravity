import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';

// Schema
const ingredientSchema = z.object({
    produto_id: z.number().optional(),
    receita_preparo_id: z.number().optional(),
    quantidade: z.number(),
    unidade: z.string(),
});

const stepSchema = z.object({
    numero_etapa: z.number(),
    descricao: z.string(),
    tempo_estimado: z.number().optional(),
});

const createRecipeSchema = z.object({
    nome: z.string(),
    tipo: z.enum(['Final', 'Pre-preparo']),
    numero_porcoes: z.number(),
    tempo_preparacao: z.number().optional(),
    ingredientes: z.array(ingredientSchema),
    etapas: z.array(stepSchema),
});

// Service
class RecipeService {
    constructor(private tenantId: number) { }
    private db = new TenantDB(this.tenantId);

    async create(data: z.infer<typeof createRecipeSchema>) {
        // Complex logic to calculate costs would go here
        // For now, just saving structure

        // We need to use a transaction here ideally, but TenantDB helper is simple.
        // We'll use the raw prisma client with tenant injection for complex nested writes

        // @ts-ignore
        return this.db.create('receita', {
            nome: data.nome,
            tipo: data.tipo,
            numero_porcoes: data.numero_porcoes,
            tempo_preparacao: data.tempo_preparacao,
            ingredientes: {
                create: data.ingredientes.map(i => ({
                    tenant_id: this.tenantId,
                    ...i
                }))
            },
            etapas: {
                create: data.etapas.map(e => ({
                    tenant_id: this.tenantId,
                    ...e
                }))
            }
        });
    }

    async list() {
        return this.db.findMany('receita', {
            include: { ingredientes: true, etapas: true }
        });
    }
}

// Routes
export async function recipeRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createRecipeSchema,
            tags: ['Recipes'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new RecipeService(req.tenantId);
        return service.create(req.body);
    });

    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Recipes'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new RecipeService(req.tenantId);
        return service.list();
    });
}
