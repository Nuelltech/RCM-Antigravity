import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';
import { prisma } from '../../core/database';
import { priceHistoryService } from './price-history.service';
import { recalculationService } from './recalculation.service';
import { Decimal } from '@prisma/client/runtime/library';

// Schema
const createProductSchema = z.object({
    nome: z.string(),
    subfamilia_id: z.number(),
    unidade_medida: z.enum(['KG', 'L', 'Unidade']),
    descricao: z.string().optional(),
    codigo_interno: z.string().optional(),
    imagem_url: z.string().optional(),
});

const createVariationSchema = z.object({
    produto_id: z.number(),
    tipo_unidade_compra: z.string(),
    unidades_por_compra: z.number(),
    preco_compra: z.number(),
    fornecedor: z.string().optional(),
});

const createFamilySchema = z.object({
    nome: z.string(),
    codigo: z.string().optional(),
    descricao: z.string().optional(),
    icone: z.string().optional(),
});

const createSubfamilySchema = z.object({
    familia_id: z.number(),
    nome: z.string(),
    codigo: z.string().optional(),
});

const updatePriceSchema = z.object({
    preco_compra: z.number().positive(),
    origem: z.enum(['MANUAL', 'COMPRA', 'SISTEMA']).default('MANUAL'),
});

// Service
class ProductService {
    constructor(private tenantId: number) { }
    private db = new TenantDB(this.tenantId);

    async list(params: {
        page?: number;
        limit?: number;
        search?: string;
        familyId?: number;
        subfamilyId?: number;
        vendavel?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (params.search) {
            where.OR = [
                { nome: { contains: params.search } },
                { codigo_interno: { contains: params.search } }
            ];
        }

        if (params.familyId) {
            where.subfamilia = { familia_id: params.familyId };
        }

        if (params.subfamilyId) {
            where.subfamilia_id = params.subfamilyId;
        }

        if (params.vendavel && params.vendavel !== 'all') {
            where.vendavel = params.vendavel === 'vendavel';
        }

        // Get total count for pagination
        const total = await prisma.produto.count({
            where: {
                ...where,
                tenant_id: this.tenantId
            }
        });

        const data = await this.db.findMany('produto', {
            where,
            include: {
                subfamilia: {
                    include: { familia: true }
                },
                variacoes: true
            },
            skip,
            take: limit,
            orderBy: { nome: 'asc' }
        });

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async create(data: z.infer<typeof createProductSchema>) {
        try {
            // Get subfamilia with familia to generate code
            const subfamilia = await prisma.subfamilia.findUnique({
                where: { id: data.subfamilia_id },
                include: { familia: true }
            });

            if (!subfamilia || subfamilia.tenant_id !== this.tenantId) {
                throw new Error('Subfamília não encontrada');
            }

            // Get existing products to calculate next sequence
            const existingProducts = await this.db.findMany('produto', {
                where: { subfamilia_id: data.subfamilia_id },
                orderBy: { codigo_interno: 'desc' },
                take: 1
            }) as Array<{ codigo_interno: string | null }>;

            // Calculate next sequence number
            let nextSeq = 1;
            if (existingProducts.length > 0 && existingProducts[0].codigo_interno) {
                const lastCode = existingProducts[0].codigo_interno;
                const parts = lastCode.split('-');
                if (parts.length === 3) {
                    nextSeq = parseInt(parts[2]) + 1;
                }
            }

            // Generate product code
            const familiaCode = subfamilia.familia.codigo || 'XXX';
            const subfamiliaCode = subfamilia.codigo || 'XXX';
            const codigo_interno = `${familiaCode}-${subfamiliaCode}-${nextSeq.toString().padStart(3, '0')}`;

            // Create product
            return this.db.create('produto', {
                ...data,
                codigo_interno
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new Error('Produto com este nome já existe nesta subfamília');
            }
            throw error;
        }
    }

    async createVariation(data: z.infer<typeof createVariationSchema>) {
        const preco_unitario = data.preco_compra / data.unidades_por_compra;
        return this.db.create('variacaoProduto', {
            ...data,
            preco_unitario,
        });
    }

    async listFamilies() {
        return this.db.findMany('familia', {
            include: { subfamilias: true },
            orderBy: { nome: 'asc' }
        });
    }

    async createFamily(data: z.infer<typeof createFamilySchema>) {
        return this.db.create('familia', data);
    }

    async createSubfamily(data: z.infer<typeof createSubfamilySchema>) {
        return this.db.create('subfamilia', data);
    }

    async getById(productId: number) {
        const product = await prisma.produto.findFirst({
            where: {
                id: productId,
                tenant_id: this.tenantId
            },
            include: {
                subfamilia: {
                    include: {
                        familia: true
                    }
                },
                variacoes: true
            }
        });

        if (!product) {
            throw new Error('Produto não encontrado');
        }

        return product;
    }

    async update(productId: number, data: z.infer<typeof createProductSchema>) {
        // Verify product exists and belongs to tenant
        await this.getById(productId);

        return await this.db.update('produto', productId, data);
    }

    async delete(productId: number) {
        // Check if product is used in any recipes
        const recipeUsage = await prisma.ingredienteReceita.findMany({
            where: {
                produto_id: productId,
                tenant_id: this.tenantId
            },
            include: {
                receita: {
                    select: { nome: true }
                }
            }
        });

        if (recipeUsage.length > 0) {
            const recipeNames = recipeUsage.map(r => r.receita.nome).join(', ');
            throw new Error(`Este produto está vinculado às seguintes receitas: ${recipeNames}. Não pode ser apagado.`);
        }

        // Delete variations first (cascade)
        await prisma.variacaoProduto.deleteMany({
            where: {
                produto_id: productId,
                tenant_id: this.tenantId
            }
        });

        // Delete product
        await this.db.delete('produto', productId);
    }
}

// Routes
export async function productRoutes(app: FastifyInstance) {
    // Products
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            querystring: z.object({
                page: z.string().optional(),
                limit: z.string().optional(),
                search: z.string().optional(),
                familyId: z.string().optional(),
                subfamilyId: z.string().optional(),
                vendavel: z.string().optional(),
            }),
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);

        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const familyId = req.query.familyId ? parseInt(req.query.familyId) : undefined;
        const subfamilyId = req.query.subfamilyId ? parseInt(req.query.subfamilyId) : undefined;

        return service.list({
            page,
            limit,
            search: req.query.search,
            familyId,
            subfamilyId,
            vendavel: req.query.vendavel
        });
    });

    app.withTypeProvider<ZodTypeProvider>().get('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        const productId = parseInt(req.params.id);

        try {
            return await service.getById(productId);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
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

    app.withTypeProvider<ZodTypeProvider>().delete('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        const productId = parseInt(req.params.id);

        try {
            await service.delete(productId);
            return { success: true, message: 'Produto apagado com sucesso' };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().put('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            body: createProductSchema,
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        const productId = parseInt(req.params.id);

        try {
            return await service.update(productId, req.body);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
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

    // Families & Subfamilies
    app.withTypeProvider<ZodTypeProvider>().get('/families', {
        schema: {
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        return service.listFamilies();
    });

    app.withTypeProvider<ZodTypeProvider>().post('/families', {
        schema: {
            body: createFamilySchema,
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        return service.createFamily(req.body);
    });

    app.withTypeProvider<ZodTypeProvider>().post('/subfamilies', {
        schema: {
            body: createSubfamilySchema,
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        return service.createSubfamily(req.body);
    });

    // Price Management
    app.withTypeProvider<ZodTypeProvider>().put('/variations/:id/price', {
        schema: {
            params: z.object({ id: z.string() }),
            body: updatePriceSchema,
            tags: ['Products', 'Price Management'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const variacaoId = parseInt(req.params.id);

        try {
            // Get current variation
            const variacao = await prisma.variacaoProduto.findFirst({
                where: {
                    id: variacaoId,
                    tenant_id: req.tenantId,
                },
                include: { produto: true },
            });

            if (!variacao) {
                return reply.status(404).send({ error: 'Variação não encontrada' });
            }

            // Calculate new unit price
            const novoPrecoUnitario = new Decimal(req.body.preco_compra).dividedBy(
                variacao.unidades_por_compra
            );

            // Trigger recalculation
            const impact = await recalculationService.recalculateAfterPriceChange(
                variacao.produto_id
            );

            // Record price history
            await priceHistoryService.createPriceHistory({
                tenantId: req.tenantId,
                variacaoId: variacaoId,
                precoAnterior: variacao.preco_compra,
                precoNovo: new Decimal(req.body.preco_compra),
                precoUnitarioAnterior: variacao.preco_unitario,
                precoUnitarioNovo: novoPrecoUnitario,
                origem: req.body.origem,
                alteradoPor: (req as any).user?.id || undefined,
                receitasAfetadas: impact.receitasAfetadas,
                menusAfetados: impact.menusAfetados,
            });

            // Update variation with new price
            const updated = await prisma.variacaoProduto.update({
                where: { id: variacaoId },
                data: {
                    preco_compra: req.body.preco_compra,
                    preco_unitario: novoPrecoUnitario,
                    data_ultima_compra: new Date(),
                },
                include: { produto: true },
            });

            return {
                success: true,
                variacao: updated,
                impact: {
                    receitas_afetadas: impact.receitasAfetadas,
                    menus_afetados: impact.menusAfetados,
                },
            };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().get('/variations/:id/price-history', {
        schema: {
            params: z.object({ id: z.string() }),
            querystring: z.object({ limit: z.string().optional() }),
            tags: ['Products', 'Price Management'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const variacaoId = parseInt(req.params.id);
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

        try {
            const history = await priceHistoryService.getPriceHistory(variacaoId, limit);
            return history;
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().get('/variations/:id/impact', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Products', 'Price Management'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const variacaoId = parseInt(req.params.id);

        try {
            const variacao = await prisma.variacaoProduto.findFirst({
                where: {
                    id: variacaoId,
                    tenant_id: req.tenantId,
                },
            });

            if (!variacao) {
                return reply.status(404).send({ error: 'Variação não encontrada' });
            }

            const impact = await recalculationService.previewPriceChangeImpact(
                variacao.produto_id
            );
            return impact;
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
