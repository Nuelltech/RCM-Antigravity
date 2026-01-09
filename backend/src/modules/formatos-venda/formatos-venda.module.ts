import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../core/database';


// DTOs
export interface CreateFormatoVendaDto {
    produto_id: number;
    nome: string;
    descricao?: string;
    codigo_interno?: string;
    quantidade_vendida: number;
    unidade_medida: string;
    preco_venda: number;
    variacao_origem_id?: number;
    conversao_necessaria?: boolean;
    disponivel_menu?: boolean;
    ordem_exibicao?: number;
    template_id?: number; // NEW: Template reference
}

export interface UpdateFormatoVendaDto {
    nome?: string;
    descricao?: string;
    codigo_interno?: string;
    quantidade_vendida?: number;
    unidade_medida?: string;
    preco_venda?: number; // allow price correction
    variacao_origem_id?: number;
    conversao_necessaria?: boolean;
    disponivel_menu?: boolean;
    ordem_exibicao?: number;
    ativo?: boolean;
    custo_unitario?: number | null; // optional manual cost update
    margem_percentual?: number; // optional manual margin override
}

export interface UpdatePrecoDto {
    preco_venda: number;
}

// Service
class FormatoVendaService {
    /**
     * Calculate unit cost based on origin variation
     */
    async calculateCusto(
        produto_id: number,
        quantidade_vendida: number,
        variacao_origem_id?: number
    ): Promise<number> {
        if (!variacao_origem_id) {
            // If no origin variation, try to get the first active variation
            const variacao = await prisma.variacaoProduto.findFirst({
                where: { produto_id, ativo: true },
            });

            if (!variacao) {
                throw new Error('Produto não tem variações ativas');
            }

            return Number(variacao.preco_unitario) * quantidade_vendida;
        }

        const variacao = await prisma.variacaoProduto.findUnique({
            where: { id: variacao_origem_id },
        });

        if (!variacao) {
            throw new Error('Variação origem não encontrada');
        }

        return Number(variacao.preco_unitario) * quantidade_vendida;
    }

    /**
     * Calculate margin percentage
     */
    calculateMargem(custo: number, pvp: number): number {
        if (custo === 0) return 0;
        return ((pvp - custo) / custo) * 100;
    }

    // Helper to transform Decimal to Number
    private transform(formato: any) {
        try {
            return {
                ...formato,
                quantidade_vendida: formato.quantidade_vendida ? Number(formato.quantidade_vendida) : 0,
                preco_venda: formato.preco_venda ? Number(formato.preco_venda) : 0,
                custo_unitario: formato.custo_unitario ? Number(formato.custo_unitario) : 0,
                margem_percentual: formato.margem_percentual ? Number(formato.margem_percentual) : 0,
                // Transform relations if they exist
                variacao_origem: formato.variacao_origem ? {
                    ...formato.variacao_origem,
                    unidades_por_compra: formato.variacao_origem.unidades_por_compra ? Number(formato.variacao_origem.unidades_por_compra) : 0,
                    preco_compra: formato.variacao_origem.preco_compra ? Number(formato.variacao_origem.preco_compra) : 0,
                    preco_unitario: formato.variacao_origem.preco_unitario ? Number(formato.variacao_origem.preco_unitario) : 0,
                } : undefined,
            };
        } catch (e) {
            console.error('❌ Error transforming formato:', formato.id, e);
            // Return raw format if transform fails, hoping for the best (or at least not crashing)
            return formato;
        }
    }

    /**
     * Create a new sell format
     */
    async create(tenant_id: number, dto: CreateFormatoVendaDto) {
        // Calculate cost
        const custo = await this.calculateCusto(
            dto.produto_id,
            dto.quantidade_vendida,
            dto.variacao_origem_id
        );

        // Calculate margin
        const margem = this.calculateMargem(custo, dto.preco_venda);

        const formato = await prisma.formatoVenda.create({
            data: {
                tenant_id,
                produto_id: dto.produto_id,
                nome: dto.nome,
                descricao: dto.descricao,
                codigo_interno: dto.codigo_interno,
                quantidade_vendida: dto.quantidade_vendida,
                unidade_medida: dto.unidade_medida,
                preco_venda: dto.preco_venda,
                custo_unitario: custo,
                margem_percentual: margem,
                variacao_origem_id: dto.variacao_origem_id,
                conversao_necessaria: dto.conversao_necessaria ?? false,
                disponivel_menu: dto.disponivel_menu ?? true,
                ordem_exibicao: dto.ordem_exibicao,
                template_id: dto.template_id, // NEW: Store template reference
            },
            include: {
                produto: true,
                variacao_origem: true,
            },
        });

        return this.transform(formato);
    }

    /**
     * Update existing format (except price - use updatePreco for that)
     */
    async update(id: number, tenant_id: number, dto: UpdateFormatoVendaDto) {
        // Verify ownership
        const existing = await prisma.formatoVenda.findFirst({
            where: { id, tenant_id },
        });

        if (!existing) {
            throw new Error('Formato não encontrado');
        }

        // Determine cost: if manual cost provided, use it; otherwise recalculate if needed
        let custo: number;
        if (dto.custo_unitario !== undefined && dto.custo_unitario !== null) {
            // Manual cost override
            custo = dto.custo_unitario;
        } else if (dto.quantidade_vendida || dto.variacao_origem_id || dto.custo_unitario === null) {
            // Recalculate based on quantity or origin change, OR if user explicitly cleared cost (sent null)
            custo = await this.calculateCusto(
                existing.produto_id,
                dto.quantidade_vendida ?? Number(existing.quantidade_vendida),
                dto.variacao_origem_id ?? existing.variacao_origem_id ?? undefined
            );
        } else {
            // Keep existing cost
            custo = Number(existing.custo_unitario);
        }

        // Determine margin: if manual margin provided, use it; otherwise recalculate
        const margem = dto.margem_percentual !== undefined
            ? dto.margem_percentual
            : this.calculateMargem(custo, Number(existing.preco_venda));

        const formato = await prisma.formatoVenda.update({
            where: { id },
            data: {
                // Manually map fields to avoid "Unknown argument" errors with spread
                nome: dto.nome,
                descricao: dto.descricao,
                codigo_interno: dto.codigo_interno,
                quantidade_vendida: dto.quantidade_vendida,
                unidade_medida: dto.unidade_medida,
                preco_venda: dto.preco_venda ? Number(dto.preco_venda) : undefined, // Ensure number
                conversao_necessaria: dto.conversao_necessaria,
                disponivel_menu: dto.disponivel_menu,
                ordem_exibicao: dto.ordem_exibicao,
                ativo: dto.ativo,

                // Calculated/Manual fields
                custo_unitario: custo,
                margem_percentual: margem,

                // Relation update (Prisma sometimes trips on variacao_origem_id scalar update if not unchecked)
                variacao_origem: dto.variacao_origem_id ? {
                    connect: { id: dto.variacao_origem_id }
                } : dto.variacao_origem_id === null ? {
                    disconnect: true
                } : undefined,
            },
            include: {
                produto: true,
                variacao_origem: true,
            },
        });

        return this.transform(formato);
    }

    /**
     * Update price (creates price history)
     */
    async updatePreco(id: number, tenant_id: number, dto: UpdatePrecoDto) {
        const existing = await prisma.formatoVenda.findFirst({
            where: { id, tenant_id, data_fim_vigencia: null }, // Only active price
        });

        if (!existing) {
            throw new Error('Formato ativo não encontrado');
        }

        const now = new Date();

        // End current price validity
        await prisma.formatoVenda.update({
            where: { id },
            data: { data_fim_vigencia: now },
        });

        // Create new price entry
        const custo = Number(existing.custo_unitario);
        const margem = this.calculateMargem(custo, dto.preco_venda);

        const formato = await prisma.formatoVenda.create({
            data: {
                tenant_id,
                produto_id: existing.produto_id,
                nome: existing.nome,
                descricao: existing.descricao,
                codigo_interno: existing.codigo_interno,
                quantidade_vendida: existing.quantidade_vendida,
                unidade_medida: existing.unidade_medida,
                preco_venda: dto.preco_venda,
                custo_unitario: custo,
                margem_percentual: margem,
                variacao_origem_id: existing.variacao_origem_id,
                conversao_necessaria: existing.conversao_necessaria,
                disponivel_menu: existing.disponivel_menu,
                ordem_exibicao: existing.ordem_exibicao,
                data_inicio_vigencia: now,
            },
            include: {
                produto: true,
                variacao_origem: true,
            },
        });

        return this.transform(formato);
    }

    /**
     * Get all formats (active by default)
     */
    async findAll(tenant_id: number, filters?: {
        produto_id?: number;
        ativo?: boolean;
        disponivel_menu?: boolean;
        includeExpired?: boolean; // NEW: include expired prices
    }) {
        const { includeExpired, ...otherFilters } = filters || {};

        const formats = await prisma.formatoVenda.findMany({
            where: {
                tenant_id,
                // Only filter by data_fim_vigencia if NOT including expired
                ...(includeExpired ? {} : { data_fim_vigencia: null }),
                ...otherFilters,
            },
            include: {
                produto: true,
                variacao_origem: true,
            },
            orderBy: [
                { produto_id: 'asc' },
                { ordem_exibicao: 'asc' },
            ],
        });

        return formats.map((f: any) => this.transform(f));
    }

    /**
     * Get format by ID
     */
    async findOne(id: number, tenant_id: number) {
        const formato = await prisma.formatoVenda.findFirst({
            where: { id, tenant_id },
            include: {
                produto: true,
                variacao_origem: true,
            },
        });

        return formato ? this.transform(formato) : null;
    }

    /**
     * Get price history for a format
     */
    async findHistory(id: number, tenant_id: number) {
        // Get the formato to extract produto_id and nome
        const formato = await this.findOne(id, tenant_id);

        if (!formato) {
            throw new Error('Formato não encontrado');
        }

        // Find all versions (same product + nome)
        const history = await prisma.formatoVenda.findMany({
            where: {
                tenant_id,
                produto_id: formato.produto_id,
                nome: formato.nome,
            },
            orderBy: { data_inicio_vigencia: 'desc' },
        });

        return history.map((h: any) => this.transform(h));
    }

    /**
     * Delete format (soft delete)
     */
    /**
     * Delete format (Safe Delete)
     */
    async delete(id: number, tenant_id: number) {
        const existing = await prisma.formatoVenda.findFirst({
            where: { id, tenant_id },
        });

        if (!existing) {
            throw new Error('Formato não encontrado');
        }

        // 1. BLOCK: Check if used in Active Menu or Active Combos
        const activeMenuUsage = await prisma.menuItem.count({
            where: {
                formato_venda_id: id,
                ativo: true,
                tenant_id
            }
        });

        if (activeMenuUsage > 0) {
            throw new Error('Não é possível apagar: Este formato está em uso no Menu ativo. Remova-o do menu primeiro.');
        }

        const activeComboUsage = await prisma.comboCategoriaOpcao.count({
            where: {
                formato_venda_id: id,
                categoria: {
                    combo: {
                        ativo: true,
                        tenant_id
                    }
                }
            }
        });

        if (activeComboUsage > 0) {
            throw new Error('Não é possível apagar: Este formato está em uso em Combos ativos. Remova-o dos combos primeiro.');
        }

        // 2. ARCHIVE: Check if has Sales or Historical Usage (Inactive Combo)
        const hasSales = await prisma.venda.count({
            where: {
                menuItem: {
                    formato_venda_id: id
                },
                tenant_id
            }
        });

        // Also check if used in ANY combo (even inactive) to preserve history
        const anyComboUsage = await prisma.comboCategoriaOpcao.count({
            where: {
                formato_venda_id: id,
                categoria: {
                    combo: {
                        tenant_id
                    }
                }
            }
        });

        if (hasSales > 0 || anyComboUsage > 0) {
            // Soft Delete (Archive)
            // We also disable it in menu just in case (though we checked active menu above)
            return prisma.formatoVenda.update({
                where: { id },
                data: { ativo: false, disponivel_menu: false },
            });
        }

        // 3. HARD DELETE: Clean up and remove
        // Finds orphan menu items to clean up
        const orphanMenuItems = await prisma.menuItem.findMany({
            where: {
                formato_venda_id: id,
                tenant_id
            },
            select: { id: true }
        });

        if (orphanMenuItems.length > 0) {
            const orphanIds = orphanMenuItems.map(m => m.id);

            // Clean up POS mappings for these orphans first
            await prisma.mapeamentoPos.deleteMany({
                where: {
                    menu_item_id: { in: orphanIds },
                    tenant_id
                }
            });

            // Now delete the menu items
            await prisma.menuItem.deleteMany({
                where: {
                    id: { in: orphanIds },
                    tenant_id
                }
            });
        }

        return prisma.formatoVenda.delete({
            where: { id },
        });
    }
}

// Controller
const formatoVendaService = new FormatoVendaService();

export async function formatosVendaRoutes(app: any) {
    // Create
    app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const dto = request.body as CreateFormatoVendaDto;

            const formato = await formatoVendaService.create(tenant_id, dto);
            return reply.code(201).send(formato);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Get all
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { produto_id, ativo, disponivel_menu, includeExpired } = request.query as any;
            const formats = await formatoVendaService.findAll(tenant_id, {
                produto_id: produto_id ? Number(produto_id) : undefined,
                ativo: ativo !== undefined ? ativo === 'true' : undefined,
                disponivel_menu: disponivel_menu !== undefined ? disponivel_menu === 'true' : undefined,
                includeExpired: includeExpired !== undefined ? includeExpired === 'true' : undefined,
            });
            return reply.send(formats);
        } catch (error: any) {
            request.log.error({ err: error }, '❌ Error fetching formatos-venda');
            return reply.code(500).send({
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });

    // Get one
    app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { id } = request.params as { id: string };

            const formato = await formatoVendaService.findOne(Number(id), tenant_id);

            if (!formato) {
                return reply.code(404).send({ error: 'Formato não encontrado' });
            }

            return reply.send(formato);
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Get history
    app.get('/:id/history', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { id } = request.params as { id: string };

            const history = await formatoVendaService.findHistory(Number(id), tenant_id);
            return reply.send(history);
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Update
    app.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { id } = request.params as { id: string };
            const dto = request.body as UpdateFormatoVendaDto;

            const formato = await formatoVendaService.update(Number(id), tenant_id, dto);
            return reply.send(formato);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Update price (with history)
    app.post('/:id/preco', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { id } = request.params as { id: string };
            const dto = request.body as UpdatePrecoDto;

            const formato = await formatoVendaService.updatePreco(Number(id), tenant_id, dto);
            return reply.code(201).send(formato);
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    // Delete (soft)
    app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { id } = request.params as { id: string };

            await formatoVendaService.delete(Number(id), tenant_id);
            return reply.code(204).send();
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });
}
