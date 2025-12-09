import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { Decimal } from '@prisma/client/runtime/library';
import { recalculationService } from '../produtos/recalculation.service';

// ========================
// DTO Schemas
// ========================

// Complex Combo - All items included
const comboItemSchema = z.object({
    receita_id: z.number().int().positive().optional(),
    produto_id: z.number().int().positive().optional(),
    quantidade: z.number().positive(),
    observacoes: z.string().optional(),
}).refine(
    (data) => (data.receita_id && !data.produto_id) || (!data.receita_id && data.produto_id),
    { message: 'Deve fornecer receita_id OU produto_id, não ambos' }
);

// Simple Combo - Category-based with options
const comboCategoriaOpcaoSchema = z.object({
    receita_id: z.number().int().positive().optional(),
    formato_venda_id: z.number().int().positive().optional(),
}).refine(
    (data) => (data.receita_id && !data.formato_venda_id) || (!data.receita_id && data.formato_venda_id),
    { message: 'Deve fornecer receita_id OU formato_venda_id, não ambos' }
);

const comboCategoriaSchema = z.object({
    categoria: z.string().min(1),
    ordem: z.number().int().min(0).default(0),
    obrigatoria: z.boolean().default(true),
    opcoes: z.array(comboCategoriaOpcaoSchema).min(1, {
        message: 'Cada categoria deve ter pelo menos 1 opção'
    }),
});

// Base schema without validation
const createComboBaseSchema = z.object({
    nome: z.string().min(1),
    tipo: z.enum(['Simples', 'Complexo']).default('Simples'),
    descricao: z.string().optional(),
    imagem_url: z.string().url().optional().or(z.literal('')),
    itens: z.array(comboItemSchema).optional(),
    categorias: z.array(comboCategoriaSchema).optional(),
});

// Create schema with validation
const createComboSchema = createComboBaseSchema.refine(
    (data) => {
        if (data.tipo === 'Complexo') {
            return data.itens && data.itens.length > 0;
        } else {
            return data.categorias && data.categorias.length > 0;
        }
    },
    {
        message: 'Combos Complexos precisam de itens, Combos Simples precisam de categorias'
    }
);

// Update schema (all fields optional except validation)
const updateComboBaseSchema = z.object({
    nome: z.string().min(1).optional(),
    tipo: z.enum(['Simples', 'Complexo']).optional(),
    descricao: z.string().optional(),
    imagem_url: z.string().url().optional().or(z.literal('')),
    ativo: z.boolean().optional(),
    itens: z.array(comboItemSchema).optional(),
    categorias: z.array(comboCategoriaSchema).optional(),
});

const updateComboSchema = updateComboBaseSchema;

// ========================
// Service
// ========================

class ComboService {
    private tenantId: number;

    constructor(tenantId: number) {
        this.tenantId = tenantId;
    }

    async list(onlyActive: boolean = true) {
        const combos = await prisma.combo.findMany({
            where: {
                tenant_id: this.tenantId,
                ...(onlyActive ? { ativo: true } : {}),
            },
            include: {
                _count: {
                    select: {
                        itens: true,
                        categorias: true,
                        menuItems: true,
                    },
                },
            },
            orderBy: { nome: 'asc' },
        });

        return combos.map((combo) => ({
            ...combo,
            custo_total: Number(combo.custo_total),
        }));
    }

    async getById(comboId: number) {
        const combo = await prisma.combo.findFirst({
            where: {
                id: comboId,
                tenant_id: this.tenantId,
            },
            include: {
                itens: {
                    include: {
                        receita: {
                            select: {
                                id: true,
                                nome: true,
                                tipo: true,
                                custo_por_porcao: true,
                            },
                        },
                        produto: {
                            select: {
                                id: true,
                                nome: true,
                                unidade_medida: true,
                                variacoes: {
                                    where: { ativo: true },
                                    select: {
                                        preco_unitario: true,
                                    },
                                    orderBy: { data_ultima_compra: 'desc' },
                                    take: 1,
                                },
                            },
                        },
                    },
                    orderBy: { ordem: 'asc' },
                },
                categorias: {
                    include: {
                        opcoes: {
                            include: {
                                receita: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        custo_por_porcao: true,
                                    },
                                },
                                formatoVenda: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        custo_unitario: true,
                                    },
                                },
                            },
                            orderBy: { ordem: 'asc' },
                        },
                    },
                    orderBy: { ordem: 'asc' },
                },
                _count: {
                    select: {
                        menuItems: true,
                    },
                },
            },
        });

        if (!combo) {
            throw new Error('Combo não encontrado');
        }

        return {
            ...combo,
            custo_total: Number(combo.custo_total),
            itens: combo.itens.map((item) => ({
                ...item,
                quantidade: Number(item.quantidade),
                custo_unitario: Number(item.custo_unitario),
                custo_total: Number(item.custo_total),
            })),
            categorias: combo.categorias.map((cat) => ({
                ...cat,
                custo_max_calculado: Number(cat.custo_max_calculado),
                opcoes: cat.opcoes.map((opc) => ({
                    ...opc,
                    custo_unitario: Number(opc.custo_unitario),
                })),
            })),
        };
    }

    async create(data: z.infer<typeof createComboSchema>) {
        if (data.tipo === 'Complexo') {
            return this.createComplexCombo(data);
        } else {
            return this.createSimpleCombo(data);
        }
    }

    // Complex Combo
    private async createComplexCombo(data: z.infer<typeof createComboSchema>) {
        return await prisma.$transaction(async (tx) => {
            const combo = await tx.combo.create({
                data: {
                    tenant_id: this.tenantId,
                    nome: data.nome,
                    tipo: 'Complexo',
                    descricao: data.descricao,
                    imagem_url: data.imagem_url || null,
                    ativo: true,
                },
            });

            // Bulk fetch items
            const recipeIds = data.itens!.filter(i => i.receita_id).map(i => i.receita_id!);
            const productIds = data.itens!.filter(i => i.produto_id).map(i => i.produto_id!);

            const recipes = recipeIds.length > 0 ? await tx.receita.findMany({
                where: {
                    id: { in: recipeIds },
                    tenant_id: this.tenantId,
                    tipo: 'Final',
                }
            }) : [];

            const products = productIds.length > 0 ? await tx.produto.findMany({
                where: {
                    id: { in: productIds },
                    tenant_id: this.tenantId,
                },
                include: {
                    variacoes: {
                        where: { ativo: true },
                        orderBy: { data_ultima_compra: 'desc' },
                        take: 1,
                    },
                },
            }) : [];

            const recipesMap = new Map(recipes.map(r => [r.id, r]));
            const productsMap = new Map(products.map(p => [p.id, p]));

            let custoTotal = new Decimal(0);

            for (let i = 0; i < data.itens!.length; i++) {
                const item = data.itens![i];
                let custoUnitario = new Decimal(0);

                if (item.receita_id) {
                    const receita = recipesMap.get(item.receita_id);
                    if (!receita) {
                        throw new Error(`Receita com ID ${item.receita_id} não encontrada`);
                    }
                    custoUnitario = receita.custo_por_porcao;
                } else if (item.produto_id) {
                    const produto = productsMap.get(item.produto_id);
                    if (!produto) {
                        throw new Error(`Produto com ID ${item.produto_id} não encontrado`);
                    }
                    custoUnitario = produto.variacoes[0]?.preco_unitario || new Decimal(0);
                }

                const custoTotalItem = new Decimal(item.quantidade).mul(custoUnitario);
                custoTotal = custoTotal.add(custoTotalItem);

                await tx.comboItem.create({
                    data: {
                        tenant_id: this.tenantId,
                        combo_id: combo.id,
                        receita_id: item.receita_id,
                        produto_id: item.produto_id,
                        quantidade: new Decimal(item.quantidade),
                        custo_unitario: custoUnitario,
                        custo_total: custoTotalItem,
                        ordem: i,
                        observacoes: item.observacoes,
                    },
                });
            }

            await tx.combo.update({
                where: { id: combo.id },
                data: { custo_total: custoTotal },
            });

            return {
                ...combo,
                custo_total: Number(custoTotal),
            };
        }, {
            maxWait: 5000,
            timeout: 20000
        });
    }

    // Simple Combo - NEW
    private async createSimpleCombo(data: z.infer<typeof createComboSchema>) {
        return await prisma.$transaction(async (tx) => {
            const combo = await tx.combo.create({
                data: {
                    tenant_id: this.tenantId,
                    nome: data.nome,
                    tipo: 'Simples',
                    descricao: data.descricao,
                    imagem_url: data.imagem_url || null,
                    ativo: true,
                },
            });

            // Bulk fetch for Simple Combo
            const recipeIds: number[] = [];
            const formatIds: number[] = [];

            if (data.categorias) {
                for (const cat of data.categorias) {
                    for (const op of cat.opcoes) {
                        if (op.receita_id) recipeIds.push(op.receita_id);
                        if (op.formato_venda_id) formatIds.push(op.formato_venda_id);
                    }
                }
            }

            const recipes = recipeIds.length > 0 ? await tx.receita.findMany({
                where: {
                    id: { in: recipeIds },
                    tenant_id: this.tenantId,
                    tipo: 'Final',
                }
            }) : [];

            const formats = formatIds.length > 0 ? await tx.formatoVenda.findMany({
                where: {
                    id: { in: formatIds },
                    tenant_id: this.tenantId,
                    ativo: true,
                }
            }) : [];

            const recipesMap = new Map(recipes.map(r => [r.id, r]));
            const formatsMap = new Map(formats.map(f => [f.id, f]));

            let custoTotal = new Decimal(0);

            for (const catData of data.categorias!) {
                let custoMaxCategoria = new Decimal(0);

                // Find max cost in this category
                for (const opcaoData of catData.opcoes) {
                    let custoOpcao = new Decimal(0);

                    if (opcaoData.receita_id) {
                        const receita = recipesMap.get(opcaoData.receita_id);
                        if (!receita) {
                            throw new Error(`Receita com ID ${opcaoData.receita_id} não encontrada`);
                        }
                        custoOpcao = receita.custo_por_porcao;
                    } else if (opcaoData.formato_venda_id) {
                        const formato = formatsMap.get(opcaoData.formato_venda_id);
                        if (!formato) {
                            throw new Error(`Formato de venda com ID ${opcaoData.formato_venda_id} não encontrado`);
                        }
                        custoOpcao = formato.custo_unitario;
                    }

                    if (custoOpcao.gt(custoMaxCategoria)) {
                        custoMaxCategoria = custoOpcao;
                    }
                }

                // Create category
                const categoria = await tx.comboCategoria.create({
                    data: {
                        tenant_id: this.tenantId,
                        combo_id: combo.id,
                        categoria: catData.categoria,
                        ordem: catData.ordem,
                        obrigatoria: catData.obrigatoria,
                        custo_max_calculado: custoMaxCategoria,
                    },
                });

                // Create options
                for (let i = 0; i < catData.opcoes.length; i++) {
                    const opcaoData = catData.opcoes[i];
                    let custoOpcao = new Decimal(0);

                    if (opcaoData.receita_id) {
                        const receita = recipesMap.get(opcaoData.receita_id);
                        custoOpcao = receita!.custo_por_porcao;
                    } else if (opcaoData.formato_venda_id) {
                        const formato = formatsMap.get(opcaoData.formato_venda_id);
                        custoOpcao = formato!.custo_unitario;
                    }

                    await tx.comboCategoriaOpcao.create({
                        data: {
                            tenant_id: this.tenantId,
                            categoria_id: categoria.id,
                            receita_id: opcaoData.receita_id,
                            formato_venda_id: opcaoData.formato_venda_id,
                            custo_unitario: custoOpcao,
                            ordem: i,
                        },
                    });
                }

                custoTotal = custoTotal.add(custoMaxCategoria);
            }

            await tx.combo.update({
                where: { id: combo.id },
                data: { custo_total: custoTotal },
            });

            return {
                ...combo,
                custo_total: Number(custoTotal),
            };
        }, {
            maxWait: 5000,
            timeout: 20000
        });
    }

    async update(comboId: number, data: z.infer<typeof updateComboSchema>) {
        const existing = await prisma.combo.findFirst({
            where: { id: comboId, tenant_id: this.tenantId },
        });

        if (!existing) {
            throw new Error('Combo não encontrado');
        }

        if (existing.tipo === 'Complexo') {
            return this.updateComplexCombo(comboId, data);
        } else {
            return this.updateSimpleCombo(comboId, data);
        }
    }

    private async updateComplexCombo(comboId: number, data: z.infer<typeof updateComboSchema>) {
        return await prisma.$transaction(async (tx) => {
            let updateData: any = {};

            if (data.nome !== undefined) updateData.nome = data.nome;
            if (data.descricao !== undefined) updateData.descricao = data.descricao;
            if (data.imagem_url !== undefined) updateData.imagem_url = data.imagem_url || null;
            if (data.ativo !== undefined) updateData.ativo = data.ativo;

            if (data.itens) {
                await tx.comboItem.deleteMany({
                    where: { combo_id: comboId },
                });

                // Bulk fetch items
                const recipeIds = data.itens.filter(i => i.receita_id).map(i => i.receita_id!);
                const productIds = data.itens.filter(i => i.produto_id).map(i => i.produto_id!);

                const recipes = recipeIds.length > 0 ? await tx.receita.findMany({
                    where: {
                        id: { in: recipeIds },
                        tenant_id: this.tenantId,
                        tipo: 'Final',
                    }
                }) : [];

                const products = productIds.length > 0 ? await tx.produto.findMany({
                    where: {
                        id: { in: productIds },
                        tenant_id: this.tenantId,
                    },
                    include: {
                        variacoes: {
                            where: { ativo: true },
                            orderBy: [
                                { data_ultima_compra: 'desc' },
                                { id: 'desc' }
                            ],
                            take: 1,
                        },
                    },
                }) : [];

                const recipesMap = new Map(recipes.map(r => [r.id, r]));
                const productsMap = new Map(products.map(p => [p.id, p]));

                let custoTotal = new Decimal(0);

                for (let i = 0; i < data.itens.length; i++) {
                    const item = data.itens[i];
                    let custoUnitario = new Decimal(0);

                    if (item.receita_id) {
                        const receita = recipesMap.get(item.receita_id);
                        if (!receita) {
                            throw new Error(`Receita com ID ${item.receita_id} não encontrada`);
                        }
                        custoUnitario = receita.custo_por_porcao;
                    } else if (item.produto_id) {
                        const produto = productsMap.get(item.produto_id);
                        if (!produto) {
                            throw new Error(`Produto com ID ${item.produto_id} não encontrado`);
                        }
                        custoUnitario = produto.variacoes[0]?.preco_unitario || new Decimal(0);
                    }

                    const custoTotalItem = new Decimal(item.quantidade).mul(custoUnitario);
                    custoTotal = custoTotal.add(custoTotalItem);

                    await tx.comboItem.create({
                        data: {
                            tenant_id: this.tenantId,
                            combo_id: comboId,
                            receita_id: item.receita_id,
                            produto_id: item.produto_id,
                            quantidade: new Decimal(item.quantidade),
                            custo_unitario: custoUnitario,
                            custo_total: custoTotalItem,
                            ordem: i,
                            observacoes: item.observacoes,
                        },
                    });
                }

                updateData.custo_total = custoTotal;
            }

            const updatedCombo = await tx.combo.update({
                where: { id: comboId },
                data: updateData,
            });

            // Trigger cascade recalculation
            await recalculationService.recalculateAfterComboChange(comboId);

            return {
                ...updatedCombo,
                custo_total: Number(updatedCombo.custo_total),
            };
        }, {
            maxWait: 5000,
            timeout: 20000
        });
    }

    private async updateSimpleCombo(comboId: number, data: z.infer<typeof updateComboSchema>) {
        return await prisma.$transaction(async (tx) => {
            let updateData: any = {};

            if (data.nome !== undefined) updateData.nome = data.nome;
            if (data.descricao !== undefined) updateData.descricao = data.descricao;
            if (data.imagem_url !== undefined) updateData.imagem_url = data.imagem_url || null;
            if (data.ativo !== undefined) updateData.ativo = data.ativo;

            if (data.categorias) {
                await tx.comboCategoria.deleteMany({
                    where: { combo_id: comboId },
                });

                // Bulk fetch for Simple Combo
                const recipeIds: number[] = [];
                const formatIds: number[] = [];

                for (const cat of data.categorias) {
                    for (const op of cat.opcoes) {
                        if (op.receita_id) recipeIds.push(op.receita_id);
                        if (op.formato_venda_id) formatIds.push(op.formato_venda_id);
                    }
                }

                const recipes = recipeIds.length > 0 ? await tx.receita.findMany({
                    where: {
                        id: { in: recipeIds },
                        tenant_id: this.tenantId,
                        tipo: 'Final',
                    }
                }) : [];

                const formats = formatIds.length > 0 ? await tx.formatoVenda.findMany({
                    where: {
                        id: { in: formatIds },
                        tenant_id: this.tenantId,
                        ativo: true,
                    }
                }) : [];

                const recipesMap = new Map(recipes.map(r => [r.id, r]));
                const formatsMap = new Map(formats.map(f => [f.id, f]));

                let custoTotal = new Decimal(0);

                for (const catData of data.categorias) {
                    let custoMaxCategoria = new Decimal(0);

                    for (const opcaoData of catData.opcoes) {
                        let custoOpcao = new Decimal(0);

                        if (opcaoData.receita_id) {
                            const receita = recipesMap.get(opcaoData.receita_id);
                            if (!receita) {
                                throw new Error(`Receita com ID ${opcaoData.receita_id} não encontrada`);
                            }
                            custoOpcao = receita.custo_por_porcao;
                        } else if (opcaoData.formato_venda_id) {
                            const formato = formatsMap.get(opcaoData.formato_venda_id);
                            if (!formato) {
                                throw new Error(`Formato de venda com ID ${opcaoData.formato_venda_id} não encontrado`);
                            }
                            custoOpcao = formato.custo_unitario;
                        }

                        if (custoOpcao.gt(custoMaxCategoria)) {
                            custoMaxCategoria = custoOpcao;
                        }
                    }

                    const categoria = await tx.comboCategoria.create({
                        data: {
                            tenant_id: this.tenantId,
                            combo_id: comboId,
                            categoria: catData.categoria,
                            ordem: catData.ordem,
                            obrigatoria: catData.obrigatoria,
                            custo_max_calculado: custoMaxCategoria,
                        },
                    });

                    for (let i = 0; i < catData.opcoes.length; i++) {
                        const opcaoData = catData.opcoes[i];
                        let custoOpcao = new Decimal(0);

                        if (opcaoData.receita_id) {
                            const receita = recipesMap.get(opcaoData.receita_id);
                            custoOpcao = receita!.custo_por_porcao;
                        } else if (opcaoData.formato_venda_id) {
                            const formato = formatsMap.get(opcaoData.formato_venda_id);
                            custoOpcao = formato!.custo_unitario;
                        }

                        await tx.comboCategoriaOpcao.create({
                            data: {
                                tenant_id: this.tenantId,
                                categoria_id: categoria.id,
                                receita_id: opcaoData.receita_id,
                                formato_venda_id: opcaoData.formato_venda_id,
                                custo_unitario: custoOpcao,
                                ordem: i,
                            },
                        });
                    }

                    custoTotal = custoTotal.add(custoMaxCategoria);
                }

                updateData.custo_total = custoTotal;
            }

            const updatedCombo = await tx.combo.update({
                where: { id: comboId },
                data: updateData,
            });

            // Trigger cascade recalculation
            await recalculationService.recalculateAfterComboChange(comboId);

            return {
                ...updatedCombo,
                custo_total: Number(updatedCombo.custo_total),
            };
        }, {
            maxWait: 5000,
            timeout: 20000
        });
    }

    async toggle(comboId: number) {
        const combo = await prisma.combo.findFirst({
            where: { id: comboId, tenant_id: this.tenantId },
        });

        if (!combo) {
            throw new Error('Combo não encontrado');
        }

        const updated = await prisma.combo.update({
            where: { id: comboId },
            data: { ativo: !combo.ativo },
        });

        return {
            ...updated,
            custo_total: Number(updated.custo_total),
        };
    }

    async delete(comboId: number) {
        const combo = await prisma.combo.findFirst({
            where: { id: comboId, tenant_id: this.tenantId },
        });

        if (!combo) {
            throw new Error('Combo não encontrado');
        }

        const usedInMenus = await prisma.menuItem.count({
            where: { combo_id: comboId },
        });

        if (usedInMenus > 0) {
            throw new Error(`Este combo é usado em ${usedInMenus} menu(s). Não pode ser eliminado.`);
        }

        await prisma.combo.delete({
            where: { id: comboId },
        });

        return { success: true, message: 'Combo eliminado com sucesso' };
    }

    async getCostBreakdown(comboId: number) {
        const combo = await this.getById(comboId);

        if (combo.tipo === 'Complexo') {
            return {
                combo_id: combo.id,
                nome: combo.nome,
                tipo: combo.tipo,
                custo_total: combo.custo_total,
                itens: combo.itens.map((item) => ({
                    tipo: item.receita_id ? 'Receita' : 'Produto',
                    nome: item.receita?.nome || item.produto?.nome,
                    quantidade: item.quantidade,
                    custo_unitario: item.custo_unitario,
                    custo_total: item.custo_total,
                })),
            };
        } else {
            return {
                combo_id: combo.id,
                nome: combo.nome,
                tipo: combo.tipo,
                custo_total: combo.custo_total,
                categorias: combo.categorias.map((cat) => ({
                    categoria: cat.categoria,
                    custo_max: cat.custo_max_calculado,
                    opcoes: cat.opcoes.map((opc) => ({
                        tipo: opc.receita_id ? 'Receita' : 'Formato Venda',
                        nome: opc.receita?.nome || opc.formatoVenda?.nome,
                        custo: opc.custo_unitario,
                    })),
                })),
            };
        }
    }
}

// ========================
// Routes
// ========================

export async function comboRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            querystring: z.object({
                onlyActive: z.enum(['true', 'false']).optional(),
            }),
            tags: ['Combos'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ComboService(req.tenantId);
        const onlyActive = req.query.onlyActive !== 'false';
        return service.list(onlyActive);
    });

    app.withTypeProvider<ZodTypeProvider>().get('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Combos'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ComboService(req.tenantId);
        const comboId = parseInt(req.params.id);

        try {
            return await service.getById(comboId);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().get('/:id/cost-breakdown', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Combos'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ComboService(req.tenantId);
        const comboId = parseInt(req.params.id);

        try {
            return await service.getCostBreakdown(comboId);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createComboSchema,
            tags: ['Combos'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ComboService(req.tenantId);

        try {
            const combo = await service.create(req.body);
            return reply.status(201).send(combo);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().put('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            body: updateComboSchema,
            tags: ['Combos'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ComboService(req.tenantId);
        const comboId = parseInt(req.params.id);

        try {
            const combo = await service.update(comboId, req.body);
            return reply.send(combo);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().patch('/:id/toggle', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Combos'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ComboService(req.tenantId);
        const comboId = parseInt(req.params.id);

        try {
            const combo = await service.toggle(comboId);
            return reply.send(combo);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().delete('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Combos'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new ComboService(req.tenantId);
        const comboId = parseInt(req.params.id);

        try {
            const result = await service.delete(comboId);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
