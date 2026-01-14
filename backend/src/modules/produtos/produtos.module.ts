import { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';
import { prisma } from '../../core/database';
import { productsCache } from '../../core/products-cache';
import { priceHistoryService } from './price-history.service';
import { recalculationService } from './recalculation.service';
import { Decimal } from '@prisma/client/runtime/library';
import { addPriceChangeJob, getJobStatus } from '../../core/queue';

// Schema
const createProductSchema = z.object({
    nome: z.string(),
    subfamilia_id: z.number(),
    unidade_medida: z.enum(['KG', 'L', 'Unidade']),
    descricao: z.string().optional(),
    codigo_interno: z.string().optional(),
    imagem_url: z.string().optional(),
    vendavel: z.boolean().optional(),
});

const createVariationSchema = z.object({
    produto_id: z.number(),
    tipo_unidade_compra: z.string(),
    unidades_por_compra: z.number(),
    volume_por_unidade: z.number().optional(),
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

// Quick Create from Invoice Line
const quickCreateProductSchema = z.object({
    nome: z.string(),
    familia_id: z.number().optional(),
    subfamilia_id: z.number().optional(),
    unidade_medida: z.enum(['KG', 'L', 'Unidade']).default('KG'),
    vendavel: z.boolean().default(false),
    variacao_compra: z.object({
        tipo_unidade_compra: z.string(),
        unidades_por_compra: z.number(),
        volume_por_unidade: z.number().optional(),  // For packaged products (e.g., 0.250 for 250g)
        preco_compra: z.number(),
        fornecedor: z.string().optional(),
    }),
    line_id: z.number(), // Invoice line to match
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
        // Check cache first
        const cacheOptions = { page: params.page, limit: params.limit, search: params.search };
        const cached = await productsCache.get(this.tenantId, cacheOptions);
        if (cached) {
            return cached;
        }

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

        // OPTIMIZED: Remove nested familia include, select only needed fields
        const data = await this.db.findMany('produto', {
            where,
            select: {
                id: true,
                nome: true,
                codigo_interno: true,
                unidade_medida: true,
                vendavel: true,
                imagem_url: true,
                subfamilia: {
                    select: {
                        id: true,
                        nome: true,
                        familia_id: true,
                        // Skip nested familia - fetch separately if needed
                    }
                },
                variacoes: {
                    where: { ativo: true },
                    select: {
                        id: true,
                        tipo_unidade_compra: true,
                        preco_compra: true,
                        preco_unitario: true,
                        volume_por_unidade: true,
                        data_ultima_compra: true,
                    },
                    orderBy: [
                        { data_ultima_compra: 'desc' },
                        { id: 'desc' }
                    ],
                    take: 3, // Limit variations per product (most recent only)
                }
            },
            skip,
            take: limit,
            orderBy: { nome: 'asc' }
        });

        const result = {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

        // Cache the result
        await productsCache.set(this.tenantId, result, cacheOptions);

        return result;
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
            const product = await this.db.create('produto', {
                ...data,
                codigo_interno,
                vendavel: data.vendavel ?? false,
            });

            // Invalidate products cache
            await productsCache.invalidateTenant(this.tenantId);

            return product;
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new Error('Produto com este nome já existe nesta subfamília');
            }
            throw error;
        }
    }

    async createVariation(data: z.infer<typeof createVariationSchema>, userId?: number) {
        // Get current effective unit price
        const precoUnitarioAnterior = await recalculationService.getPrecoUnitarioAtual(data.produto_id);

        // Calculate unit price considering volume_por_unidade if provided
        const divisor = data.volume_por_unidade
            ? data.unidades_por_compra * data.volume_por_unidade
            : data.unidades_por_compra;
        const preco_unitario = data.preco_compra / divisor;

        const variation = await this.db.create('variacaoProduto', {
            ...data,
            preco_unitario,
        }) as any;

        // Try queue-based recalculation (background), fallback to sync if fails
        try {
            await addPriceChangeJob(data.produto_id, this.tenantId, userId || 0);
            console.log(`✅ Price change job queued for product ${data.produto_id}`);
        } catch (queueError) {
            console.warn('⚠️  Queue unavailable, using sync recalculation:', queueError);
            recalculationService.recalculateAfterPriceChange(data.produto_id).catch(err => {
                console.error('Error in fallback recalculation:', err);
            });
        }

        // Get new effective unit price (should be the one we just created if it's the latest)
        // Note: getPrecoUnitarioAtual fetches from DB, so it sees the new variation.
        const precoUnitarioNovo = await recalculationService.getPrecoUnitarioAtual(data.produto_id);

        // Record history only if unit price (€/L) changed
        // This is the correct metric since all variations normalize to the same unit (liters)
        if (!precoUnitarioAnterior.equals(precoUnitarioNovo)) {
            await priceHistoryService.createPriceHistory({
                tenantId: this.tenantId,
                variacaoId: variation.id,
                precoAnterior: precoUnitarioAnterior,  // Previous unit price (€/L)
                precoNovo: precoUnitarioNovo,           // New unit price (€/L)
                precoUnitarioAnterior: precoUnitarioAnterior,
                precoUnitarioNovo: precoUnitarioNovo,
                origem: 'MANUAL',
                alteradoPor: userId,
                receitasAfetadas: 0, // Async
                menusAfetados: 0,    // Async
            });
        }

        // Invalidate cache
        await productsCache.invalidateTenant(this.tenantId);

        return variation;
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
                variacoes: true,
                formatosVenda: {
                    where: { ativo: true }
                }
            }
        });

        if (!product) {
            throw new Error('Produto não encontrado');
        }

        return product;
    }

    async update(productId: number, data: z.infer<typeof createProductSchema>) {
        // Verify product exists and belongs to tenant
        const existing = await this.getById(productId);

        // Check if subfamily changed - if so, recalculate codigo_interno
        if (data.subfamilia_id && data.subfamilia_id !== existing.subfamilia_id) {
            // Get new subfamilia with familia to generate code
            const subfamilia = await prisma.subfamilia.findUnique({
                where: { id: data.subfamilia_id },
                include: { familia: true }
            });

            if (!subfamilia || subfamilia.tenant_id !== this.tenantId) {
                throw new Error('Subfamília não encontrada');
            }

            // Get existing products in new subfamily to calculate next sequence
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

            // Generate new product code
            const familiaCode = subfamilia.familia.codigo || 'XXX';
            const subfamiliaCode = subfamilia.codigo || 'XXX';
            data.codigo_interno = `${familiaCode}-${subfamiliaCode}-${nextSeq.toString().padStart(3, '0')}`;
        }

        const result = await this.db.update('produto', productId, data);

        // Invalidate cache
        await productsCache.invalidateTenant(this.tenantId);

        return result;
    }

    async delete(productId: number) {
        // 1. BLOCKERS - Active Configuration

        // Check Recipes
        const recipeUsage = await prisma.ingredienteReceita.findMany({
            where: { produto_id: productId },
            include: { receita: { select: { nome: true } } }
        });
        if (recipeUsage.length > 0) {
            const names = [...new Set(recipeUsage.map(r => r.receita.nome))].slice(0, 3).join(', ');
            throw new Error(`Este produto é usado na(s) receita(s): ${names}${recipeUsage.length > 3 ? '...' : ''}. Remova-o antes de apagar.`);
        }

        // Check Combos
        const comboUsage = await prisma.comboItem.count({ where: { produto_id: productId } });
        if (comboUsage > 0) {
            throw new Error(`Este produto faz parte de ${comboUsage} combo(s). Remova-o antes de apagar.`);
        }

        // Check Sell Formats (Formatos de Venda)
        // If the product has sell formats that are active, we should probably warn
        const activeFormats = await prisma.formatoVenda.count({
            where: { produto_id: productId, ativo: true }
        });
        if (activeFormats > 0) {
            throw new Error(`Este produto tem ${activeFormats} formato(s) de venda ativo(s). Desative-os ou apague-os primeiro.`);
        }

        // 2. ARCHIVAL TRIGGERS - Historical Data

        // Check Purchases
        const purchaseUsage = await prisma.compraItem.count({ where: { produto_id: productId } });
        // Check Inventory
        const inventoryUsage = await prisma.itemInventario.count({ where: { produto_id: productId } });

        if (purchaseUsage > 0 || inventoryUsage > 0) {
            // SOFT DELETE (Archive)
            await prisma.$transaction([
                prisma.produto.update({
                    where: { id: productId },
                    data: { ativo: false }
                }),
                prisma.variacaoProduto.updateMany({
                    where: { produto_id: productId },
                    data: { ativo: false }
                }),
                // Disable formats too
                prisma.formatoVenda.updateMany({
                    where: { produto_id: productId },
                    data: { ativo: false }
                })
            ]);

            return {
                success: true,
                message: 'Produto arquivado com sucesso (mantido histórico).',
                action: 'archived'
            };
        }

        // 3. HARD DELETE - Clean Slate

        // Delete variations first (cascade)
        await prisma.variacaoProduto.deleteMany({
            where: {
                produto_id: productId,
                tenant_id: this.tenantId
            }
        });

        // Delete formats
        await prisma.formatoVenda.deleteMany({
            where: { produto_id: productId }
        });

        // Delete product
        await this.db.delete('produto', productId);

        // Invalidate cache
        await productsCache.invalidateTenant(this.tenantId);

        return {
            success: true,
            message: 'Produto eliminado permanentemente.',
            action: 'deleted'
        };
    }
}

// Routes
export async function productRoutes(app: FastifyInstance) {

    // List Products
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            querystring: z.object({
                page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
                limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
                search: z.string().optional(),
                familyId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
                subfamilyId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
                vendavel: z.string().optional(),
            }),
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        return service.list(req.query);
    });

    // Create Product
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createProductSchema,
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ProductService(req.tenantId);
        try {
            return await service.create(req.body);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Get Product (Specific ID)
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

        // Fastify routing might catch "families" as :id if defined before specific routes
        // But since we are inside /:id, we should ensure ID is number.
        // If :id matches "families", parseInt("families") is NaN.
        if (isNaN(productId)) {
            // Pass to next handler? Fastify doesn't easily chain like Express.
            // We generally rely on Route order. 
            // IMPORTANT: Put this route AFTER specific routes if they share prefix. 
            // But here Param is :id vs Static "families". Fastify handles static routes with higher priority if defined properly.
            return reply.status(404).send();
        }

        try {
            return await service.getById(productId);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
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
            const result = await service.delete(productId);
            return result; // Return the specific message from service
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
        return service.createVariation(req.body, (req as unknown as { user: { id: number } }).user?.id);
    });

    app.withTypeProvider<ZodTypeProvider>().put('/variations/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            body: createVariationSchema,
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const variacaoId = parseInt(req.params.id);

        try {
            // Find existing variation
            const current = await prisma.variacaoProduto.findUnique({
                where: { id: variacaoId, tenant_id: req.tenantId }
            });

            if (!current) return reply.status(404).send({ error: 'Variação não encontrada' });

            // Calculate unit price logic
            let totalUnits = new Decimal(req.body.unidades_por_compra);
            if (req.body.volume_por_unidade) {
                totalUnits = totalUnits.mul(req.body.volume_por_unidade);
            }
            const precoUnitario = new Decimal(req.body.preco_compra).dividedBy(totalUnits);

            // Just update fields directly
            const updated = await prisma.variacaoProduto.update({
                where: { id: variacaoId },
                data: {
                    ...req.body,
                    preco_unitario: precoUnitario, // Recalculate based on input
                    updatedAt: new Date()
                }
            });

            // Trigger recalculations logic similar to update price
            try {
                // background recalc
                recalculationService.recalculateAfterPriceChange(updated.produto_id).catch(() => { });
            } catch (e) { }

            // Invalidate cache
            await productsCache.invalidateTenant(req.tenantId);

            return updated;
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().delete('/variations/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const variacaoId = parseInt(req.params.id);

        try {
            await prisma.variacaoProduto.update({
                where: { id: variacaoId, tenant_id: req.tenantId },
                data: { ativo: false } // Soft delete
            });
            // Invalidate cache
            await productsCache.invalidateTenant(req.tenantId);
            return { success: true };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().get('/:id/variations', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Products'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const productId = parseInt(req.params.id);

        const variations = await prisma.variacaoProduto.findMany({
            where: {
                produto_id: productId,
                tenant_id: req.tenantId,
                ativo: true,
            },
            include: {
                produto: {
                    select: {
                        unidade_medida: true,
                    }
                }
            },
            orderBy: [
                { data_ultima_compra: 'desc' },
                { id: 'desc' }
            ]
        });

        return variations;
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

            // Update variation with new price FIRST
            const updated = await prisma.variacaoProduto.update({
                where: { id: variacaoId },
                data: {
                    preco_compra: req.body.preco_compra,
                    preco_unitario: novoPrecoUnitario,
                    data_ultima_compra: new Date(),
                },
                include: { produto: true },
            });

            // Try queue-based recalculation (background), fallback to sync if fails
            try {
                await addPriceChangeJob(variacao.produto_id, req.tenantId, (req as unknown as { user: { id: number } }).user?.id || 0);
                console.log(`✅ Price change job queued for product ${variacao.produto_id}`);
            } catch (queueError) {
                console.warn('⚠️  Queue unavailable, using sync recalculation:', queueError);
                recalculationService.recalculateAfterPriceChange(variacao.produto_id).catch((err: any) => {
                    console.error('Error in fallback recalculation:', err);
                });
            }

            // Record price history (impact stats will be 0/unknown for now to prioritize speed)
            await priceHistoryService.createPriceHistory({
                tenantId: req.tenantId,
                variacaoId: variacaoId,
                precoAnterior: variacao.preco_compra,
                precoNovo: new Decimal(req.body.preco_compra),
                precoUnitarioAnterior: variacao.preco_unitario,
                precoUnitarioNovo: novoPrecoUnitario,
                origem: req.body.origem,
                alteradoPor: (req as unknown as { user: { id: number } }).user?.id || undefined,
                receitasAfetadas: 0, // Async
                menusAfetados: 0,    // Async
            });

            return reply.send({
                success: true,
                variacao: updated,
                message: 'Preço atualizado com sucesso!',
            });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    // POST /api/products/quick-create - Create product from invoice line
    app.withTypeProvider<ZodTypeProvider>().post('/quick-create', {
        schema: {
            body: quickCreateProductSchema,
            description: 'Quickly create product with variation from invoice line and auto-match',
            tags: ['Products', 'Invoice Integration'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { nome, familia_id, subfamilia_id, unidade_medida, vendavel, variacao_compra, line_id } = req.body;

        try {
            // Start transaction
            const result = await prisma.$transaction(async (tx) => {
                // 1. Generate codigo_interno if subfamilia exists
                let codigo_interno: string | undefined;

                if (subfamilia_id) {
                    const subfamilia = await tx.subfamilia.findUnique({
                        where: { id: subfamilia_id },
                        include: { familia: true }
                    });

                    if (subfamilia && subfamilia.tenant_id === req.tenantId) {
                        // Get existing products to calculate next sequence
                        const existingProducts = await tx.produto.findMany({
                            where: {
                                subfamilia_id: subfamilia_id,
                                tenant_id: req.tenantId
                            },
                            orderBy: { codigo_interno: 'desc' },
                            take: 1,
                            select: { codigo_interno: true }
                        });

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
                        codigo_interno = `${familiaCode}-${subfamiliaCode}-${nextSeq.toString().padStart(3, '0')}`;
                    }
                }

                // 2. Create Product
                const productData: any = {
                    nome,
                    unidade_medida,
                    vendavel: vendavel || false,
                    ativo: true,
                    tenant: {
                        connect: { id: req.tenantId! }
                    }
                };

                // Use relation connect for subfamilia (Prisma requirement)
                if (subfamilia_id) {
                    productData.subfamilia = {
                        connect: { id: subfamilia_id }
                    };
                }

                if (codigo_interno) productData.codigo_interno = codigo_interno;

                const produto = await tx.produto.create({
                    data: productData
                });

                // 3. Create Purchase Variation
                // Use same logic as createVariation (lines 231-234)
                const divisor = variacao_compra.volume_por_unidade
                    ? variacao_compra.unidades_por_compra * variacao_compra.volume_por_unidade
                    : variacao_compra.unidades_por_compra;
                const precoPorUnidade = variacao_compra.preco_compra / divisor;

                const variacao = await tx.variacaoProduto.create({
                    data: {
                        tenant_id: req.tenantId!,
                        produto_id: produto.id,
                        tipo_unidade_compra: variacao_compra.tipo_unidade_compra,
                        unidades_por_compra: new Decimal(variacao_compra.unidades_por_compra),
                        preco_compra: new Decimal(variacao_compra.preco_compra),
                        preco_unitario: new Decimal(precoPorUnidade),
                        fornecedor: variacao_compra.fornecedor,
                    }
                });

                // 4. Auto-match to invoice line
                const linha = await tx.faturaLinhaImportacao.update({
                    where: {
                        id: line_id,
                        tenant_id: req.tenantId!,
                    },
                    data: {
                        produto_id: produto.id,
                        variacao_id: variacao.id,
                        status: 'matched',
                        confianca_match: new Decimal(100), // Manual match = 100%
                    }
                });

                return { produto, variacao, linha };
            });

            // Invalidate cache
            await productsCache.invalidateTenant(req.tenantId);

            return {
                produto: result.produto,
                variacao: result.variacao,
                linha_matched: true,
            };
        } catch (error: any) {
            console.error('[Quick Create] Error:', error);

            // User-friendly error messages
            if (error.code === 'P2002') {
                return reply.status(400).send({
                    error: 'Já existe um produto com este nome nesta subfamília.'
                });
            }

            if (error.code === 'P2025') {
                return reply.status(404).send({
                    error: 'Subfamília não encontrada. Por favor, selecione uma subfamília válida.'
                });
            }

            if (error.message?.includes('subfamilia')) {
                return reply.status(400).send({
                    error: 'Por favor, selecione uma subfamília antes de criar o produto.'
                });
            }

            // Generic fallback
            return reply.status(500).send({
                error: 'Erro ao criar produto. Verifique se todos os campos obrigatórios estão preenchidos.'
            });
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

    // GET /api/products/jobs/:jobId - Check recalculation job status
    app.withTypeProvider<ZodTypeProvider>().get('/jobs/:jobId', {
        schema: {
            params: z.object({ jobId: z.string() }),
            tags: ['Products', 'Jobs'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        try {
            const status = await getJobStatus(req.params.jobId);

            if (status.status === 'not-found') {
                return reply.status(404).send({ error: 'Job not found' });
            }

            return {
                jobId: req.params.jobId,
                status: status.status,
                progress: status.progress || 0,
                result: status.result,
                error: status.error,
            };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
