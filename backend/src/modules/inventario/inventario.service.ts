import { prisma } from '../../core/database';
import { CreateSessionInput, SaveCalculatorListInput, UpdateItemInput, CreateLocationInput } from './inventario.schema';
import { Decimal } from '@prisma/client/runtime/library';

export class InventoryService {
    constructor(private tenantId: number, private userId: number) { }

    async getLocations() {
        return prisma.localizacao.findMany({
            where: { tenant_id: this.tenantId, ativo: true },
        });
    }

    async createLocation(input: CreateLocationInput) {
        return prisma.localizacao.create({
            data: {
                tenant_id: this.tenantId,
                ...input,
            },
        });
    }

    async saveCalculatorList(input: SaveCalculatorListInput) {
        return prisma.listaCalculadora.create({
            data: {
                tenant_id: this.tenantId,
                nome: input.nome,
                itens: input.itens,
                criado_por: this.userId,
            },
        });
    }

    async getCalculatorLists() {
        return prisma.listaCalculadora.findMany({
            where: { tenant_id: this.tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createSession(input: CreateSessionInput) {
        // 1. Determine products to include
        let products: any[] = [];

        if (input.tipo === 'Total') {
            products = await prisma.produto.findMany({
                where: { tenant_id: this.tenantId, ativo: true },
            });
        } else if (input.tipo === 'Personalizado' && input.filtros) {
            const where: any = { tenant_id: this.tenantId, ativo: true };
            if (input.filtros.familia_id) {
                // Need to find subfamilies for this family first, or join.
                // Prisma doesn't support deep filter on relation easily in one go without include, 
                // but we can filter by subfamilia.familia_id
                where.subfamilia = { familia_id: input.filtros.familia_id };
            }
            if (input.filtros.subfamilia_id) {
                where.subfamilia_id = input.filtros.subfamilia_id;
            }
            products = await prisma.produto.findMany({ where });
        } else if (input.tipo === 'Calculadora' && input.filtros?.lista_calculadora_id) {
            const list = await prisma.listaCalculadora.findUnique({
                where: { id: input.filtros.lista_calculadora_id },
            });
            if (list && Array.isArray(list.itens)) {
                const productIds = (list.itens as any[]).map((i: any) => i.id);
                products = await prisma.produto.findMany({
                    where: { tenant_id: this.tenantId, id: { in: productIds } },
                });
            }
        }

        // 2. Create Session
        const lastSession = await prisma.sessaoInventario.findFirst({
            where: { tenant_id: this.tenantId },
            orderBy: { numero: 'desc' },
        });
        const numero = (lastSession?.numero || 0) + 1;

        const session = await prisma.sessaoInventario.create({
            data: {
                tenant_id: this.tenantId,
                numero,
                nome: input.nome || `Inventário #${numero}`,
                tipo: input.tipo,
                status: 'Aberto',
                filtros_usados: input.filtros as any,
                criado_por: this.userId,
            },
        });

        // 3. Create Items (Snapshots)
        // We create one empty count entry per product found.
        // Default location? Maybe null or the first one found.
        const defaultLocation = await prisma.localizacao.findFirst({
            where: { tenant_id: this.tenantId, ativo: true },
        });

        if (products.length > 0) {
            await prisma.itemInventario.createMany({
                data: products.map(p => ({
                    tenant_id: this.tenantId,
                    sessao_id: session.id,
                    produto_id: p.id,
                    quantidade_contada: 0,
                    unidade_medida: p.unidade_medida,
                    localizacao_id: defaultLocation?.id,
                })),
            });
        }

        return session;
    }

    async getSession(id: number) {
        return prisma.sessaoInventario.findUnique({
            where: { id },
            include: {
                itens: {
                    include: {
                        produto: true,
                        localizacao: true,
                        variacao: true,
                    },
                    orderBy: { produto: { nome: 'asc' } }
                },
            },
        });
    }

    async getOpenSessions() {
        return prisma.sessaoInventario.findMany({
            where: { tenant_id: this.tenantId, status: 'Aberto' },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateItem(itemId: number, input: UpdateItemInput) {
        return prisma.itemInventario.update({
            where: { id: itemId },
            data: {
                quantidade_contada: input.quantidade,
                localizacao_id: input.localizacao_id,
                variacao_id: input.variacao_id,
                observacoes: input.observacoes,
                contado_por: this.userId,
            },
        });
    }

    async addItem(sessionId: number, productId: number) {
        const product = await prisma.produto.findUnique({ where: { id: productId } });
        if (!product) throw new Error('Product not found');

        return prisma.itemInventario.create({
            data: {
                tenant_id: this.tenantId,
                sessao_id: sessionId,
                produto_id: productId,
                quantidade_contada: 0,
                unidade_medida: product.unidade_medida,
                contado_por: this.userId,
            },
            include: { produto: true, localizacao: true, variacao: true }
        });
    }

    async deleteItem(itemId: number) {
        return prisma.itemInventario.delete({
            where: { id: itemId },
        });
    }

    async closeSession(sessionId: number) {
        const session = await prisma.sessaoInventario.findUnique({
            where: { id: sessionId },
            include: { itens: true },
        });

        if (!session || session.status !== 'Aberto') {
            throw new Error('Session not found or already closed');
        }

        // Transaction to update stock and close session
        await prisma.$transaction(async (tx) => {
            // 1. Group counts by Product + Variation
            // If a product appears multiple times (different locations), sum them up.
            const stockMap = new Map<string, Decimal>();

            for (const item of session.itens) {
                const key = `${item.produto_id}-${item.variacao_id || 0}`;
                const current = stockMap.get(key) || new Decimal(0);
                stockMap.set(key, current.plus(item.quantidade_contada));
            }

            // 2. Update StockTeorico
            for (const [key, quantity] of stockMap.entries()) {
                const [produtoIdStr, variacaoIdStr] = key.split('-');
                const produtoId = Number(produtoIdStr);
                const variacaoId = Number(variacaoIdStr); // 0 if none

                // Upsert StockTeorico
                // Note: Prisma upsert requires a unique compound key. 
                // Our model has @@id([tenant_id, produto_id, variacao_id])

                // Check if exists first (because upsert with composite ID where part is default 0 might be tricky if not strictly unique constraint in prisma client logic sometimes, but @@id should work)
                // Actually, let's try upsert.

                await tx.stockTeorico.upsert({
                    where: {
                        tenant_id_produto_id_variacao_id: {
                            tenant_id: this.tenantId,
                            produto_id: produtoId,
                            variacao_id: variacaoId,
                        }
                    },
                    create: {
                        tenant_id: this.tenantId,
                        produto_id: produtoId,
                        variacao_id: variacaoId,
                        quantidade_atual: quantity,
                        valor_total: new Decimal(0), // TODO: Calculate value based on cost
                    },
                    update: {
                        quantidade_atual: quantity,
                        data_ultima_atualizacao: new Date(),
                    }
                });
            }

            // 3. Close Session
            await tx.sessaoInventario.update({
                where: { id: sessionId },
                data: {
                    status: 'Fechado',
                    fechado_por: this.userId,
                    data_fim: new Date(),
                },
            });
        });

        return { message: 'Inventory closed and stock updated' };
    }
}
