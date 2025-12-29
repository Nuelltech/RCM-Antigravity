import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { Decimal } from '@prisma/client/runtime/library';
import { AlertsService } from '../alerts/alerts.module';
import { menuCache } from '../../core/menu-cache';

// Validation Schemas
const createMenuItemSchema = z.object({
    receita_id: z.number().int().positive().optional(),
    combo_id: z.number().int().positive().optional(),
    formato_venda_id: z.number().int().positive().optional(),
    nome_comercial: z.string().min(1),
    pvp: z.number().positive(),
    categoria_menu: z.string().optional(),
    descricao_menu: z.string().optional(),
    alergenos: z.string().optional(),
    calorias: z.number().int().positive().optional(),
    tempo_servico: z.number().int().positive().optional(),
    posicao_menu: z.number().int().min(0).optional(),
    destacado: z.boolean().optional(),
}).refine(
    (data) => {
        const count = [data.receita_id, data.combo_id, data.formato_venda_id].filter(Boolean).length;
        return count === 1;
    },
    { message: 'Deve fornecer exatamente um: receita_id, combo_id ou formato_venda_id' }
);

const updateMenuItemSchema = z.object({
    nome_comercial: z.string().min(1).optional(),
    pvp: z.number().positive().optional(),
    categoria_menu: z.string().optional(),
    descricao_menu: z.string().optional(),
    alergenos: z.string().optional(),
    calorias: z.number().int().positive().optional(),
    tempo_servico: z.number().int().positive().optional(),
    posicao_menu: z.number().int().min(0).optional(),
    destacado: z.boolean().optional(),
});

const updatePVPSchema = z.object({
    pvp: z.number().positive(),
});

// Helper function to calculate margins
function calculateMargins(pvp: number, custo_por_porcao: number) {
    const margem_bruta = pvp - custo_por_porcao;
    const margem_percentual = pvp > 0 ? ((pvp - custo_por_porcao) / pvp) * 100 : 0;

    return {
        margem_bruta: new Decimal(margem_bruta),
        margem_percentual: new Decimal(margem_percentual),
    };
}

// Service Class
class MenuService {
    private tenantId: number;

    constructor(tenantId: number) {
        this.tenantId = tenantId;
    }

    async list(categoria?: string, onlyActive: boolean = true) {
        // Check cache first
        const cacheOptions = { categoria, ativo: onlyActive };
        const cached = await menuCache.get(this.tenantId, cacheOptions);
        if (cached) {
            return cached;
        }

        const whereClause: any = {
            tenant_id: this.tenantId,
        };

        if (onlyActive) {
            whereClause.ativo = true;
        }

        if (categoria) {
            whereClause.categoria_menu = categoria;
        }

        const menuItems = await prisma.menuItem.findMany({
            where: whereClause,
            include: {
                receita: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_por_porcao: true,
                        custo_total: true,
                        numero_porcoes: true,
                        imagem_url: true,
                        descricao: true,
                        categoria: true,
                    },
                },
                combo: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_total: true,
                        imagem_url: true,
                        descricao: true,
                    },
                },
                formatoVenda: {
                    select: {
                        id: true,
                        nome: true,
                        custo_unitario: true,
                        unidade_medida: true,
                        quantidade_vendida: true,
                        produto: {
                            select: {
                                imagem_url: true,
                                nome: true,
                            }
                        }
                    }
                }
            },
            orderBy: [
                { posicao_menu: 'asc' },
                { nome_comercial: 'asc' },
            ],
        });

        // Calculate CMV% for each item
        const result = menuItems.map(item => {
            const pvp = Number(item.pvp);
            let custo = 0;

            if (item.receita_id) {
                custo = Number(item.receita!.custo_por_porcao);
            } else if (item.combo_id) {
                custo = Number(item.combo!.custo_total);
            } else if (item.formato_venda_id) {
                custo = Number(item.formatoVenda!.custo_unitario);
            }

            const cmv_percentual = pvp > 0 ? (custo / pvp) * 100 : 0;

            return {
                ...item,
                pvp: Number(item.pvp),
                margem_bruta: item.margem_bruta ? Number(item.margem_bruta) : null,
                margem_percentual: item.margem_percentual ? Number(item.margem_percentual) : null,
                cmv_percentual: Number(cmv_percentual.toFixed(2)),
                receita: item.receita ? {
                    ...item.receita,
                    custo_por_porcao: Number(item.receita.custo_por_porcao),
                    custo_total: Number(item.receita.custo_total),
                    numero_porcoes: Number(item.receita.numero_porcoes),
                } : null,
                combo: item.combo ? {
                    ...item.combo,
                    custo_total: Number(item.combo.custo_total),
                } : null,
                formatoVenda: item.formatoVenda ? {
                    ...item.formatoVenda,
                    custo_unitario: Number(item.formatoVenda.custo_unitario),
                    quantidade_vendida: Number(item.formatoVenda.quantidade_vendida),
                } : null,
            };
        });

        // Cache the result
        await menuCache.set(this.tenantId, result, cacheOptions);

        return result;
    }

    async getById(menuItemId: number) {
        const menuItem = await prisma.menuItem.findFirst({
            where: {
                id: menuItemId,
                tenant_id: this.tenantId,
            },
            include: {
                receita: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_por_porcao: true,
                        custo_total: true,
                        numero_porcoes: true,
                        imagem_url: true,
                        descricao: true,
                        categoria: true,
                    },
                },
                combo: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_total: true,
                        imagem_url: true,
                        descricao: true,
                    },
                },
                formatoVenda: {
                    select: {
                        id: true,
                        nome: true,
                        custo_unitario: true,
                        unidade_medida: true,
                        quantidade_vendida: true,
                        produto: {
                            select: {
                                imagem_url: true,
                                nome: true,
                            }
                        }
                    }
                }
            },
        });

        if (!menuItem) {
            throw new Error('Item do menu não encontrado');
        }

        const pvp = Number(menuItem.pvp);
        let custo = 0;

        if (menuItem.receita_id) {
            custo = Number(menuItem.receita!.custo_por_porcao);
        } else if (menuItem.combo_id) {
            custo = Number(menuItem.combo!.custo_total);
        } else if (menuItem.formato_venda_id) {
            custo = Number(menuItem.formatoVenda!.custo_unitario);
        }

        const cmv_percentual = pvp > 0 ? (custo / pvp) * 100 : 0;

        return {
            ...menuItem,
            pvp: Number(menuItem.pvp),
            margem_bruta: menuItem.margem_bruta ? Number(menuItem.margem_bruta) : null,
            margem_percentual: menuItem.margem_percentual ? Number(menuItem.margem_percentual) : null,
            cmv_percentual: Number(cmv_percentual.toFixed(2)),
            receita: menuItem.receita ? {
                ...menuItem.receita,
                custo_por_porcao: Number(menuItem.receita.custo_por_porcao),
                custo_total: Number(menuItem.receita.custo_total),
                numero_porcoes: Number(menuItem.receita.numero_porcoes),
            } : null,
            combo: menuItem.combo ? {
                ...menuItem.combo,
                custo_total: Number(menuItem.combo.custo_total),
            } : null,
            formatoVenda: menuItem.formatoVenda ? {
                ...menuItem.formatoVenda,
                custo_unitario: Number(menuItem.formatoVenda.custo_unitario),
                quantidade_vendida: Number(menuItem.formatoVenda.quantidade_vendida),
            } : null,
        };
    }

    async create(data: z.infer<typeof createMenuItemSchema>) {
        // Check if recipe, combo or product exists and is active
        let custo_por_porcao = 0;

        if (data.receita_id) {
            const receita = await prisma.receita.findFirst({
                where: {
                    id: data.receita_id,
                    tenant_id: this.tenantId,
                    ativa: true,
                },
            });

            if (!receita) {
                throw new Error('Receita não encontrada');
            }

            if (receita.tipo !== 'Final') {
                throw new Error('Apenas receitas do tipo "Final" podem ser adicionadas ao menu');
            }

            // Check if recipe is already in menu
            const existing = await prisma.menuItem.findFirst({
                where: {
                    tenant_id: this.tenantId,
                    receita_id: data.receita_id,
                },
            });

            if (existing) {
                throw new Error('Esta receita já está no menu');
            }

            custo_por_porcao = Number(receita.custo_por_porcao);
        } else if (data.combo_id) {
            const combo = await prisma.combo.findFirst({
                where: {
                    id: data.combo_id,
                    tenant_id: this.tenantId,
                    ativo: true,
                },
            });

            if (!combo) {
                throw new Error('Combo não encontrado');
            }

            // Check if combo is already in menu
            const existing = await prisma.menuItem.findFirst({
                where: {
                    tenant_id: this.tenantId,
                    combo_id: data.combo_id,
                },
            });

            if (existing) {
                throw new Error('Este combo já está no menu');
            }

            custo_por_porcao = Number(combo.custo_total);
        } else if (data.formato_venda_id) {
            const formatoVenda = await prisma.formatoVenda.findFirst({
                where: {
                    id: data.formato_venda_id,
                    tenant_id: this.tenantId,
                    ativo: true,
                },
            });

            if (!formatoVenda) {
                throw new Error('Produto (Formato de Venda) não encontrado');
            }

            // Check if product is already in menu
            const existing = await prisma.menuItem.findFirst({
                where: {
                    tenant_id: this.tenantId,
                    formato_venda_id: data.formato_venda_id,
                },
            });

            if (existing) {
                throw new Error('Este produto já está no menu');
            }

            custo_por_porcao = Number(formatoVenda.custo_unitario);
        }

        // Calculate margins
        const margins = calculateMargins(data.pvp, custo_por_porcao);

        // Calculate CMV
        const cmv = data.pvp > 0 ? (custo_por_porcao / data.pvp) * 100 : 0;

        // Create menu item
        const menuItem = await prisma.menuItem.create({
            data: {
                tenant_id: this.tenantId,
                receita_id: data.receita_id,
                combo_id: data.combo_id,
                formato_venda_id: data.formato_venda_id,
                nome_comercial: data.nome_comercial,
                pvp: new Decimal(data.pvp),
                margem_bruta: margins.margem_bruta,
                margem_percentual: margins.margem_percentual,
                cmv_percentual: new Decimal(cmv.toFixed(2)),
                categoria_menu: data.categoria_menu,
                descricao_menu: data.descricao_menu,
                alergenos: data.alergenos,
                calorias: data.calorias,
                tempo_servico: data.tempo_servico,
                posicao_menu: data.posicao_menu ?? 0,
                destacado: data.destacado ?? false,
                ativo: true,
            },
            include: {
                receita: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_por_porcao: true,
                        imagem_url: true,
                    },
                },
                combo: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_total: true,
                        imagem_url: true,
                    },
                },
                formatoVenda: {
                    select: {
                        id: true,
                        nome: true,
                        custo_unitario: true,
                        produto: {
                            select: {
                                imagem_url: true,
                                nome: true,
                            }
                        }
                    }
                }
            },
        });

        // Regenerate alerts in background (fire-and-forget)
        const alertsService = new AlertsService(this.tenantId);
        alertsService.regenerateAlertsAsync();

        // Invalidate menu cache
        await menuCache.invalidateTenant(this.tenantId);

        const pvp = Number(menuItem.pvp);
        let custo = 0;
        if (menuItem.receita_id) custo = Number(menuItem.receita!.custo_por_porcao);
        else if (menuItem.combo_id) custo = Number(menuItem.combo!.custo_total);
        else if (menuItem.formato_venda_id) custo = Number(menuItem.formatoVenda!.custo_unitario);

        const cmv_percentual = pvp > 0 ? (custo / pvp) * 100 : 0;

        return {
            ...menuItem,
            pvp: Number(menuItem.pvp),
            margem_bruta: Number(menuItem.margem_bruta),
            margem_percentual: Number(menuItem.margem_percentual),
            cmv_percentual: Number(cmv_percentual.toFixed(2)),
            receita: menuItem.receita ? {
                ...menuItem.receita,
                custo_por_porcao: Number(menuItem.receita.custo_por_porcao),
            } : null,
            combo: menuItem.combo ? {
                ...menuItem.combo,
                custo_total: Number(menuItem.combo.custo_total),
            } : null,
            formatoVenda: menuItem.formatoVenda ? {
                ...menuItem.formatoVenda,
                custo_unitario: Number(menuItem.formatoVenda.custo_unitario),
            } : null,
        };
    }

    async update(menuItemId: number, data: z.infer<typeof updateMenuItemSchema>) {
        const existing = await prisma.menuItem.findFirst({
            where: {
                id: menuItemId,
                tenant_id: this.tenantId,
            },
            include: {
                receita: true,
                combo: true,
                formatoVenda: true,
            },
        });

        if (!existing) {
            throw new Error('Item do menu não encontrado');
        }

        // If PVP is being updated, recalculate margins and CMV
        let margins = undefined;
        let cmv = undefined;
        if (data.pvp) {
            let custo = 0;
            if (existing.receita_id) custo = Number(existing.receita!.custo_por_porcao);
            else if (existing.combo_id) custo = Number(existing.combo!.custo_total);
            else if (existing.formato_venda_id) custo = Number(existing.formatoVenda!.custo_unitario);

            margins = calculateMargins(data.pvp, custo);
            cmv = data.pvp > 0 ? (custo / data.pvp) * 100 : 0;
        }

        const updateData: any = {
            ...data,
        };

        if (data.pvp) {
            updateData.pvp = new Decimal(data.pvp);
            updateData.margem_bruta = margins?.margem_bruta;
            updateData.margem_percentual = margins?.margem_percentual;
            updateData.cmv_percentual = new Decimal(cmv!.toFixed(2));
        }

        const menuItem = await prisma.menuItem.update({
            where: { id: menuItemId },
            data: updateData,
            include: {
                receita: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_por_porcao: true,
                        imagem_url: true,
                    },
                },
                combo: {
                    select: {
                        id: true,
                        nome: true,
                        tipo: true,
                        custo_total: true,
                        imagem_url: true,
                    },
                },
                formatoVenda: {
                    select: {
                        id: true,
                        nome: true,
                        custo_unitario: true,
                        produto: {
                            select: {
                                imagem_url: true,
                                nome: true,
                            }
                        }
                    }
                }
            },
        });

        // Regenerate alerts in background if PVP changed (fire-and-forget)
        if (data.pvp) {
            const alertsService = new AlertsService(this.tenantId);
            alertsService.regenerateAlertsAsync();
        }

        // Invalidate menu cache
        await menuCache.invalidateTenant(this.tenantId);

        const pvp = Number(menuItem.pvp);
        let custo = 0;
        if (menuItem.receita_id) custo = Number(menuItem.receita!.custo_por_porcao);
        else if (menuItem.combo_id) custo = Number(menuItem.combo!.custo_total);
        else if (menuItem.formato_venda_id) custo = Number(menuItem.formatoVenda!.custo_unitario);

        const cmv_percentual = pvp > 0 ? (custo / pvp) * 100 : 0;

        return {
            ...menuItem,
            pvp: Number(menuItem.pvp),
            margem_bruta: menuItem.margem_bruta ? Number(menuItem.margem_bruta) : null,
            margem_percentual: menuItem.margem_percentual ? Number(menuItem.margem_percentual) : null,
            cmv_percentual: Number(cmv_percentual.toFixed(2)),
            receita: menuItem.receita ? {
                ...menuItem.receita,
                custo_por_porcao: Number(menuItem.receita.custo_por_porcao),
            } : null,
            combo: menuItem.combo ? {
                ...menuItem.combo,
                custo_total: Number(menuItem.combo.custo_total),
            } : null,
            formatoVenda: menuItem.formatoVenda ? {
                ...menuItem.formatoVenda,
                custo_unitario: Number(menuItem.formatoVenda.custo_unitario),
            } : null,
        };
    }

    async toggle(menuItemId: number) {
        const existing = await prisma.menuItem.findFirst({
            where: {
                id: menuItemId,
                tenant_id: this.tenantId,
            },
        });

        if (!existing) {
            throw new Error('Item do menu não encontrado');
        }

        // Invalidate menu cache
        await menuCache.invalidateTenant(this.tenantId);

        const menuItem = await prisma.menuItem.update({
            where: { id: menuItemId },
            data: {
                ativo: !existing.ativo,
            },
        });

        return {
            ...menuItem,
            pvp: Number(menuItem.pvp),
            margem_bruta: menuItem.margem_bruta ? Number(menuItem.margem_bruta) : null,
            margem_percentual: menuItem.margem_percentual ? Number(menuItem.margem_percentual) : null,
        };
    }

    async delete(menuItemId: number) {
        const existing = await prisma.menuItem.findFirst({
            where: {
                id: menuItemId,
                tenant_id: this.tenantId,
            },
        });

        if (!existing) {
            throw new Error('Item do menu não encontrado');
        }

        // Check if there are sales for this item
        const salesCount = await prisma.venda.count({
            where: {
                menu_item_id: menuItemId,
            },
        });

        // Invalidate menu cache
        await menuCache.invalidateTenant(this.tenantId);

        if (salesCount > 0) {
            // Soft delete by setting ativo to false
            await prisma.menuItem.update({
                where: { id: menuItemId },
                data: { ativo: false },
            });

            return {
                success: true,
                message: `Item desativado (${salesCount} vendas associadas)`,
            };
        }

        // Hard delete if no sales
        await prisma.menuItem.delete({
            where: { id: menuItemId },
        });

        return {
            success: true,
            message: 'Item removido do menu',
        };
    }

    async getAvailableRecipes() {
        // Get recipes that are "Final" type and not already in the menu
        const existingMenuItems = await prisma.menuItem.findMany({
            where: { tenant_id: this.tenantId },
            select: { receita_id: true },
        });

        const excludedRecipeIds = existingMenuItems.map(item => item.receita_id).filter(Boolean) as number[];

        const recipes = await prisma.receita.findMany({
            where: {
                tenant_id: this.tenantId,
                tipo: 'Final',
                ativa: true,
                id: {
                    notIn: excludedRecipeIds,
                },
            },
            select: {
                id: true,
                nome: true,
                custo_por_porcao: true,
                imagem_url: true,
                categoria: true,
            },
            orderBy: {
                nome: 'asc',
            },
        });

        return recipes.map((recipe: any) => ({
            ...recipe,
            custo_por_porcao: Number(recipe.custo_por_porcao),
        }));
    }

    async getAvailableCombos() {
        // Get combos that are active and not already in the menu
        const existingMenuItems = await prisma.menuItem.findMany({
            where: { tenant_id: this.tenantId },
            select: { combo_id: true },
        });

        const excludedComboIds = existingMenuItems.map(item => item.combo_id).filter(Boolean) as number[];

        const combos = await prisma.combo.findMany({
            where: {
                tenant_id: this.tenantId,
                ativo: true,
                id: {
                    notIn: excludedComboIds,
                },
            },
            select: {
                id: true,
                nome: true,
                tipo: true,
                custo_total: true,
                imagem_url: true,
                descricao: true,
            },
            orderBy: {
                nome: 'asc',
            },
        });

        return combos.map((combo: any) => ({
            ...combo,
            custo_total: Number(combo.custo_total),
        }));
    }

    async getAvailableProducts() {
        // Get FormatosVenda that are active, available for menu, and not already in the menu
        const existingMenuItems = await prisma.menuItem.findMany({
            where: { tenant_id: this.tenantId },
            select: { formato_venda_id: true },
        });

        const excludedFormatoIds = existingMenuItems.map(item => item.formato_venda_id).filter(Boolean) as number[];

        const formatos = await prisma.formatoVenda.findMany({
            where: {
                tenant_id: this.tenantId,
                ativo: true,
                disponivel_menu: true,
                id: {
                    notIn: excludedFormatoIds,
                },
            },
            select: {
                id: true,
                nome: true,
                custo_unitario: true,
                unidade_medida: true,
                quantidade_vendida: true,
                preco_venda: true, // Include selling price
                produto: {
                    select: {
                        imagem_url: true,
                    }
                }
            },
            orderBy: {
                nome: 'asc',
            },
        });

        return formatos.map((formato: any) => ({
            id: formato.id,
            nome: formato.nome,
            custo_unitario: Number(formato.custo_unitario),
            unidade_medida: formato.unidade_medida,
            quantidade_vendida: Number(formato.quantidade_vendida),
            preco_venda: Number(formato.preco_venda),
            imagem_url: formato.produto.imagem_url,
        }));
    }
}

// Routes
export async function menuRoutes(app: FastifyInstance) {
    // GET /menu - List all menu items
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            querystring: z.object({
                categoria: z.string().optional(),
                ativo: z.enum(['true', 'false']).optional(),
            }),
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        const { categoria, ativo } = req.query;
        const onlyActive = ativo !== 'false';
        return service.list(categoria, onlyActive);
    });

    // GET /menu/available-recipes - Get recipes available to add to menu
    app.withTypeProvider<ZodTypeProvider>().get('/available-recipes', {
        schema: {
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        return service.getAvailableRecipes();
    });

    // GET /menu/available-combos - Get combos available to add to menu
    app.withTypeProvider<ZodTypeProvider>().get('/available-combos', {
        schema: {
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        return service.getAvailableCombos();
    });

    // GET /menu/available-products - Get products available to add to menu
    app.withTypeProvider<ZodTypeProvider>().get('/available-products', {
        schema: {
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        return service.getAvailableProducts();
    });

    // GET /menu/:id - Get specific menu item
    app.withTypeProvider<ZodTypeProvider>().get('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        const menuItemId = parseInt(req.params.id);

        try {
            return await service.getById(menuItemId);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
    });

    // POST /menu - Add item to menu
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createMenuItemSchema,
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);

        try {
            const menuItem = await service.create(req.body);
            return reply.status(201).send(menuItem);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // PUT /menu/:id - Update menu item
    app.withTypeProvider<ZodTypeProvider>().put('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            body: updateMenuItemSchema,
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        const menuItemId = parseInt(req.params.id);

        try {
            const menuItem = await service.update(menuItemId, req.body);
            return reply.send(menuItem);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // PATCH /menu/:id/toggle - Toggle menu item active status
    app.withTypeProvider<ZodTypeProvider>().patch('/:id/toggle', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        const menuItemId = parseInt(req.params.id);

        try {
            const menuItem = await service.toggle(menuItemId);
            return reply.send(menuItem);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // DELETE /menu/:id - Remove menu item
    app.withTypeProvider<ZodTypeProvider>().delete('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Menu'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new MenuService(req.tenantId);
        const menuItemId = parseInt(req.params.id);

        try {
            const result = await service.delete(menuItemId);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
