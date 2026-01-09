import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../core/database';
import { recalculationService } from '../produtos/recalculation.service';
import { priceHistoryService } from '../produtos/price-history.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AlertsService } from '../alerts/alerts.module';

// DTOs
export interface CreateVariacaoDto {
    produto_id: number;
    tipo_unidade_compra: string;
    unidades_por_compra: number;
    preco_compra: number;
    fornecedor?: string;
    codigo_fornecedor?: string;
    template_id?: number; // Reference to template used
}

export interface UpdateVariacaoDto {
    tipo_unidade_compra?: string;
    unidades_por_compra?: number;
    volume_por_unidade?: number;  // For packaged products
    preco_compra?: number;
    fornecedor?: string;
    codigo_fornecedor?: string;
    ativo?: boolean;
}

// Service
class VariacaoProdutoService {
    /**
     * Calculate unit price from purchase price and units
     */
    calculatePrecoUnitario(preco_compra: number, unidades_por_compra: number): number {
        if (unidades_por_compra === 0) {
            throw new Error('Unidades por compra não pode ser zero');
        }
        return preco_compra / unidades_por_compra;
    }

    /**
     * Create new purchase variation
     */
    async create(tenant_id: number, dto: CreateVariacaoDto, userId?: number) {
        // Get current effective unit price
        const precoUnitarioAnterior = await recalculationService.getPrecoUnitarioAtual(dto.produto_id);

        const preco_unitario = this.calculatePrecoUnitario(dto.preco_compra, dto.unidades_por_compra);

        const variacao = await prisma.variacaoProduto.create({
            data: {
                tenant_id,
                produto_id: dto.produto_id,
                tipo_unidade_compra: dto.tipo_unidade_compra,
                unidades_por_compra: dto.unidades_por_compra,
                preco_compra: dto.preco_compra,
                preco_unitario,
                fornecedor: dto.fornecedor,
                codigo_fornecedor: dto.codigo_fornecedor,
                template_id: dto.template_id,
                data_ultima_compra: new Date(), // Set as most recent to make it the main variation
            },
        });

        // Trigger cascade recalculation for recipes, combos, and menus
        const impact = await recalculationService.recalculateAfterPriceChange(dto.produto_id);

        // Get new effective unit price
        const precoUnitarioNovo = await recalculationService.getPrecoUnitarioAtual(dto.produto_id);

        // Record history if effective price changed
        if (!precoUnitarioAnterior.equals(precoUnitarioNovo)) {
            await priceHistoryService.createPriceHistory({
                tenantId: tenant_id,
                variacaoId: variacao.id,
                precoAnterior: new Decimal(0),
                precoNovo: new Decimal(dto.preco_compra),
                precoUnitarioAnterior: precoUnitarioAnterior,
                precoUnitarioNovo: precoUnitarioNovo,
                origem: 'MANUAL',
                alteradoPor: userId,
                receitasAfetadas: impact.receitasAfetadas,
                menusAfetados: impact.menusAfetados,
            });
        }

        // Trigger background alert regeneration (fire-and-forget)
        const alertsService = new AlertsService(tenant_id);
        alertsService.regenerateAlertsAsync();

        return this.transform(variacao);
    }

    /**
     * Update existing variation
     */
    async update(id: number, tenant_id: number, dto: UpdateVariacaoDto, userId?: number) {
        const existing = await prisma.variacaoProduto.findFirst({
            where: { id, tenant_id },
        });

        if (!existing) {
            throw new Error('Variação não encontrada');
        }

        // Recalculate unit price if purchase price, units, or volume changed
        let preco_unitario = Number(existing.preco_unitario);
        let precoMudou = false;

        const newPrecoCompra = dto.preco_compra ?? Number(existing.preco_compra);
        const newUnidades = dto.unidades_por_compra ?? Number(existing.unidades_por_compra);
        const newVolume = dto.volume_por_unidade ?? (existing.volume_por_unidade ? Number(existing.volume_por_unidade) : undefined);

        if (dto.preco_compra !== undefined || dto.unidades_por_compra !== undefined || dto.volume_por_unidade !== undefined) {
            const oldPrecoUnitario = Number(existing.preco_unitario);

            // Use same logic as produtos.module.ts:231-234
            const divisor = newVolume
                ? newUnidades * newVolume
                : newUnidades;
            preco_unitario = newPrecoCompra / divisor;

            precoMudou = Math.abs(preco_unitario - oldPrecoUnitario) > 0.0001; // Threshold for change
        }

        // Update variation
        const variacao = await prisma.variacaoProduto.update({
            where: { id },
            data: {
                ...dto,
                preco_unitario,
                updatedAt: new Date(), // Explicitly update timestamp for "last edit" tracking
            },
        });

        // If price changed, trigger cascade recalculation
        let impactResult = null;
        if (precoMudou) {
            impactResult = await recalculationService.recalculateAfterPriceChange(
                existing.produto_id
            );

            // Record price history
            await priceHistoryService.createPriceHistory({
                tenantId: tenant_id,
                variacaoId: id,
                precoAnterior: existing.preco_compra,
                precoNovo: new Decimal(newPrecoCompra),
                precoUnitarioAnterior: existing.preco_unitario,
                precoUnitarioNovo: new Decimal(preco_unitario),
                origem: 'MANUAL',
                alteradoPor: userId,
                receitasAfetadas: impactResult?.receitasAfetadas || 0,
                menusAfetados: impactResult?.menusAfetados || 0,
            });

            // Trigger background alert regeneration (fire-and-forget)
            const alertsService = new AlertsService(tenant_id);
            alertsService.regenerateAlertsAsync();
        }

        return {
            variacao: this.transform(variacao),
            impact: impactResult ? {
                receitas_afetadas: impactResult.receitasAfetadas,
                combos_afetados: impactResult.combosAfetados,
                menus_afetados: impactResult.menusAfetados,
            } : null,
        };
    }

    /**
     * Get all variations for a product
     */
    async findByProduto(tenant_id: number, produto_id: number) {
        const variacoes = await prisma.variacaoProduto.findMany({
            where: {
                tenant_id,
                produto_id,
            },
            orderBy: [
                { ativo: 'desc' }, // Active first
                { data_ultima_compra: 'desc' }, // Most recent purchase
                { updatedAt: 'desc' }, // Most recently updated
            ],
        });

        return variacoes.map(v => this.transform(v));
    }

    /**
     * Get main (current) variation - most recent purchase OR edit
     */
    async getMainVariacao(tenant_id: number, produto_id: number) {
        const variacao = await prisma.variacaoProduto.findFirst({
            where: {
                tenant_id,
                produto_id,
                ativo: true,
            },
            orderBy: [
                { data_ultima_compra: 'desc' },
                { id: 'desc' }
            ],
        });

        if (!variacao) {
            return null;
        }

        return this.transform(variacao);
    }

    /**
     * Soft delete variation
     */
    async delete(id: number, tenant_id: number) {
        const existing = await prisma.variacaoProduto.findFirst({
            where: { id, tenant_id },
        });

        if (!existing) {
            throw new Error('Variação não encontrada');
        }

        await prisma.variacaoProduto.update({
            where: { id },
            data: { ativo: false },
        });

        // Trigger cascade recalculation as the main variation might have changed
        await recalculationService.recalculateAfterPriceChange(existing.produto_id);
    }

    /**
     * Transform Decimal fields to numbers
     */
    private transform(variacao: any) {
        return {
            ...variacao,
            unidades_por_compra: Number(variacao.unidades_por_compra),
            preco_compra: Number(variacao.preco_compra),
            preco_unitario: Number(variacao.preco_unitario),
        };
    }
}

// Controller
const variacaoService = new VariacaoProdutoService();

export async function variacoesProdutoRoutes(app: any) {
    // Get all variations for a product
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { produto_id } = request.query as any;

            if (!produto_id) {
                return reply.status(400).send({ error: 'produto_id is required' });
            }

            const variacoes = await variacaoService.findByProduto(tenant_id, Number(produto_id));
            return reply.send(variacoes);
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    // Get main variation for a product
    app.get('/main', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { produto_id } = request.query as any;

            if (!produto_id) {
                return reply.status(400).send({ error: 'produto_id is required' });
            }

            const mainVariacao = await variacaoService.getMainVariacao(tenant_id, Number(produto_id));

            if (!mainVariacao) {
                return reply.status(404).send({ error: 'Nenhuma variação ativa encontrada' });
            }

            return reply.send(mainVariacao);
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    // Create variation
    app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const userId = (request as any).user?.id;
            const dto = request.body as CreateVariacaoDto;

            const variacao = await variacaoService.create(tenant_id, dto, userId);
            return reply.code(201).send(variacao);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Update variation
    app.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const userId = (request as any).user?.id;
            const { id } = request.params as { id: string };
            const dto = request.body as UpdateVariacaoDto;

            const result = await variacaoService.update(Number(id), tenant_id, dto, userId);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // Delete (soft) variation
    app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            if (!(request as any).tenantId) return reply.status(401).send();
            const tenant_id = (request as any).tenantId;
            const { id } = request.params as { id: string };

            await variacaoService.delete(Number(id), tenant_id);
            return reply.code(204).send();
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
