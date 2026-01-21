import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';
import { prisma } from '../../core/database';
import { dashboardCache } from '../../core/cache.service';
import { addSalesProcessingJob } from '../../queues/sales-processing.queue';
import { SalesMatchingService } from './services/sales-matching.service';

const createBatchSalesSchema = z.object({
    date: z.string().datetime(),
    comment: z.string().optional(),
    type: z.enum(['ITEM', 'TOTAL']),
    amount: z.number().optional(), // For TOTAL
    items: z.array(z.object({
        id: z.number(),
        qty: z.number(),
    })).optional(), // For ITEMIZED
});

export async function salesRoutes(app: FastifyInstance) {
    // Register multipart support for file uploads
    await app.register(require('@fastify/multipart'), {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        }
    });

    // Dashboard Data
    app.withTypeProvider<ZodTypeProvider>().get('/dashboard', {
        schema: {
            querystring: z.object({
                startDate: z.string(),
                endDate: z.string(),
            }),
            tags: ['Sales'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Querystring: { startDate: string; endDate: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const sales = await prisma.venda.findMany({
            where: {
                tenant_id: req.tenantId,
                data_venda: {
                    gte: start,
                    lte: end,
                },
            },
            include: {
                menuItem: {
                    include: {
                        receita: true,
                        combo: true,
                        formatoVenda: true,
                    },
                },
            },
            orderBy: { data_venda: 'asc' },
        });

        // 1. Trend
        const trendMap = new Map<string, number>();
        sales.forEach((sale: any) => {
            const dateKey = sale.data_venda.toISOString().split('T')[0];
            const currentTotal = trendMap.get(dateKey) || 0;
            trendMap.set(dateKey, currentTotal + Number(sale.receita_total));
        });
        const trend = Array.from(trendMap.entries()).map(([date, total]) => ({ date, total }));

        // 2. Histogram (Top Items)
        const itemSales = sales.filter((s: any) => s.tipo === 'ITEM' && s.menu_item_id);
        const histogramMap = new Map<string, number>();
        itemSales.forEach((sale: any) => {
            const name = sale.menuItem?.nome_comercial || 'Unknown';
            const currentTotal = histogramMap.get(name) || 0;
            histogramMap.set(name, currentTotal + Number(sale.receita_total));
        });
        const histogram = Array.from(histogramMap.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // 3. Items List with Cost
        const itemsListMap = new Map<number, { id: number, name: string, quantity: number, total: number, cmv: number }>();
        itemSales.forEach((sale: any) => {
            const id = sale.menu_item_id!;

            // Calculate cost based on source
            let cost = 0;
            if (sale.menuItem?.receita) {
                cost = Number(sale.menuItem.receita.custo_por_porcao || 0);
            } else if (sale.menuItem?.combo) {
                cost = Number(sale.menuItem.combo.custo_total || 0);
            } else if (sale.menuItem?.formatoVenda) {
                cost = Number(sale.menuItem.formatoVenda.custo_unitario || 0);
            }

            const existing = itemsListMap.get(id) || {
                id,
                name: sale.menuItem?.nome_comercial || 'Unknown',
                quantity: 0,
                total: 0,
                cmv: cost
            };
            existing.quantity += sale.quantidade;
            existing.total += Number(sale.receita_total);
            itemsListMap.set(id, existing);
        });
        const itemsList = Array.from(itemsListMap.values()).sort((a, b) => b.total - a.total);

        return {
            trend,
            histogram,
            itemsList,
            totalSales: sales.reduce((sum: number, s: any) => sum + Number(s.receita_total), 0),
        };
    });

    // Create Sale (Batch or Single)
    app.withTypeProvider<ZodTypeProvider>().post('/', {
        schema: {
            body: createBatchSalesSchema,
            tags: ['Sales'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Body: z.infer<typeof createBatchSalesSchema> }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();
        const db = new TenantDB(req.tenantId);
        const { date, comment, type, amount, items } = req.body;
        const dataVenda = new Date(date);

        if (type === 'TOTAL' && amount) {
            await db.create('venda', {
                data_venda: dataVenda,
                tipo: 'TOTAL',
                receita_total: amount,
                pvp_praticado: amount,
                quantidade: 1,
                metodo_entrada: 'Manual',
                observacoes: comment,
            });
        } else if (type === 'ITEM' && items) {
            const itemIds = items.map((i: any) => i.id);
            const menuItems = await prisma.menuItem.findMany({
                where: { id: { in: itemIds }, tenant_id: req.tenantId }
            });

            for (const item of items) {
                const menuItem = menuItems.find((mi: any) => mi.id === item.id);
                if (menuItem) {
                    // Calculate cost from MenuItem: custo = pvp - margem_bruta
                    const pvp = Number(menuItem.pvp || 0);
                    const margemBruta = Number(menuItem.margem_bruta || 0);
                    const custoUnitario = pvp - margemBruta;
                    const custoTotal = custoUnitario * item.qty;

                    await db.create('venda', {
                        data_venda: dataVenda,
                        tipo: 'ITEM',
                        menu_item_id: item.id,
                        quantidade: item.qty,
                        pvp_praticado: menuItem.pvp,
                        receita_total: Number(menuItem.pvp) * item.qty,
                        custo_total: custoTotal, // ✅ Store historical cost
                        metodo_entrada: 'Manual',
                        observacoes: comment,
                    });
                }
            }
        }

        // Invalidate dashboard cache after creating sales
        await dashboardCache.invalidateTenant(req.tenantId);
        console.log(`[CACHE INVALIDATE] Dashboard cache cleared for tenant ${req.tenantId} after sales creation`);

        return { success: true };
    });

    // Item Details
    app.withTypeProvider<ZodTypeProvider>().get('/item/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            querystring: z.object({
                startDate: z.string(),
                endDate: z.string(),
            }),
            tags: ['Sales'],
            security: [{ bearerAuth: [] }],
        },
    }, async (req: FastifyRequest<{ Params: { id: string }, Querystring: { startDate: string; endDate: string } }>, reply: FastifyReply) => {
        if (!req.tenantId) return reply.status(401).send();
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const itemId = parseInt(req.params.id);

        const sales = await prisma.venda.findMany({
            where: {
                tenant_id: req.tenantId,
                menu_item_id: itemId,
                data_venda: { gte: start, lte: end },
            },
            orderBy: { data_venda: 'asc' },
        });

        const trendMap = new Map<string, number>();
        sales.forEach((sale: any) => {
            const dateKey = sale.data_venda.toISOString().split('T')[0];
            const currentTotal = trendMap.get(dateKey) || 0;
            trendMap.set(dateKey, currentTotal + Number(sale.receita_total));
        });
        const trend = Array.from(trendMap.entries()).map(([date, total]) => ({ date, total }));

        return {
            trend,
            totalSales: sales.reduce((sum: number, s: any) => sum + Number(s.receita_total), 0),
            totalQuantity: sales.reduce((sum: number, s: any) => sum + s.quantidade, 0),
        };
    });

    // =========================================================================
    // SALES IMPORT ROUTES (PDF Upload & Processing)
    // =========================================================================

    /**
     * Upload sales report (PDF/Image)
     */
    app.post('/upload', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        try {
            const data = await req.file();
            if (!data) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }

            const buffer = await data.toBuffer();
            const filename = data.filename;

            // Save file
            const fs = require('fs');
            const path = require('path');
            const uploadDir = path.join(__dirname, '../../../uploads', req.tenantId.toString());

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const uniqueFilename = `sales_${Date.now()}_${filename}`;
            const filepath = path.join(uploadDir, uniqueFilename);
            fs.writeFileSync(filepath, buffer);

            // Create VendaImportacao record
            const salesImport = await prisma.vendaImportacao.create({
                data: {
                    tenant_id: req.tenantId,
                    ficheiro_nome: filename,
                    ficheiro_url: filepath,
                    ficheiro_tipo: data.mimetype,
                    status: 'pending'
                }
            });

            // Queue for processing
            await addSalesProcessingJob({
                salesImportId: salesImport.id,
                tenantId: req.tenantId,
                filepath,
                fileContent: buffer.toString('base64'), // Pass content for workers in separate containers
                uploadSource: 'web',
                userId: req.userId
            });

            return reply.status(202).send({
                id: salesImport.id,
                message: 'Sales report uploaded and queued for processing'
            });

        } catch (error: any) {
            console.error('[SALES-UPLOAD] Error:', error);
            return reply.status(500).send({ error: error.message });
        }
    });

    /**
     * List sales imports
     */
    app.get('/importacoes', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        const imports = await prisma.vendaImportacao.findMany({
            where: { tenant_id: req.tenantId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                ficheiro_nome: true,
                data_venda: true,
                total_bruto: true,
                total_liquido: true,
                status: true,
                createdAt: true,
                _count: {
                    select: { linhas: true }
                }
            }
        });

        return imports;
    });

    /**
     * Get sales import details (for review page)
     */
    app.get('/importacoes/:id', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        const { id } = req.params;

        const salesImport = await prisma.vendaImportacao.findFirst({
            where: {
                id: parseInt(id),
                tenant_id: req.tenantId
            },
            include: {
                linhas: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                nome_comercial: true
                            }
                        }
                    },
                    orderBy: { linha_numero: 'asc' }
                }
            }
        });

        if (!salesImport) {
            return reply.status(404).send({ error: 'Sales import not found' });
        }

        return salesImport;
    });

    /**
     * Get menu item suggestions for a line
     */
    app.get('/importacoes/:id/linhas/:lineId/suggestions', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        const { lineId } = req.params;

        const line = await prisma.vendaLinhaImportacao.findFirst({
            where: {
                id: parseInt(lineId),
                tenant_id: req.tenantId
            }
        });

        if (!line) {
            return reply.status(404).send({ error: 'Line not found' });
        }


        const matchingService = new SalesMatchingService();

        const suggestions = await matchingService.findMenuItemSuggestions(
            line.descricao_original,
            req.tenantId
        );

        return suggestions;
    });

    /**
     * Match a line to a menu item (manual matching)
     */
    app.post('/importacoes/:id/linhas/:lineId/match', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        const { lineId } = req.params;
        const { menu_item_id } = req.body;

        const line = await prisma.vendaLinhaImportacao.findFirst({
            where: {
                id: parseInt(lineId),
                tenant_id: req.tenantId
            }
        });

        if (!line) {
            return reply.status(404).send({ error: 'Line not found' });
        }

        // Update match
        await prisma.vendaLinhaImportacao.update({
            where: { id: parseInt(lineId) },
            data: {
                menu_item_id: menu_item_id,
                confianca_match: 100, // Manual = 100%
                status: 'matched'
            }
        });

        // Save to history for learning

        const matchingService = new SalesMatchingService();

        await matchingService.saveMatchHistory(
            line.descricao_original,
            menu_item_id,
            req.tenantId,
            req.userId,
            100
        );

        return { success: true };
    });

    /**
     * Approve sales import and create Venda records
     */
    app.post('/importacoes/:id/approve', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        const { id } = req.params;

        const salesImport = await prisma.vendaImportacao.findFirst({
            where: {
                id: parseInt(id),
                tenant_id: req.tenantId
            },
            include: {
                linhas: {
                    include: {
                        menuItem: true
                    }
                }
            }
        });

        if (!salesImport) {
            return reply.status(404).send({ error: 'Sales import not found' });
        }

        // Filter matched lines
        const matchedLines = salesImport.linhas.filter(l => l.menu_item_id);
        const unmatchedLines = salesImport.linhas.filter(l => !l.menu_item_id);

        // Create Venda records for matched lines
        const vendasCreated = [];
        for (const line of matchedLines) {
            const menuItem = line.menuItem!;

            const venda = await prisma.venda.create({
                data: {
                    tenant_id: req.tenantId,
                    data_venda: salesImport.data_venda || new Date(),
                    tipo: 'ITEM',
                    menu_item_id: line.menu_item_id!,
                    quantidade: Number(line.quantidade) || 1,
                    pvp_praticado: line.preco_unitario || menuItem.pvp,
                    receita_total: line.preco_total,
                    metodo_entrada: 'PDF',  // Manual, POS, API, PDF
                    venda_importacao_id: salesImport.id,
                    user_id: req.userId
                }
            });

            vendasCreated.push(venda);

            // Update line status
            await prisma.vendaLinhaImportacao.update({
                where: { id: line.id },
                data: { status: 'approved' }
            });
        }

        // Update sales import status
        await prisma.vendaImportacao.update({
            where: { id: salesImport.id },
            data: {
                status: 'approved',
                aprovado_em: new Date(),
                aprovado_por: req.userId
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                tenant_id: req.tenantId,
                user_id: req.userId,
                acao: 'VENDA_IMPORTACAO_APROVADA',
                entidade_tipo: 'VendaImportacao',
                entidade_id: id.toString(),
                dados_novos: {
                    matched_lines: matchedLines.length,
                    unmatched_lines: unmatchedLines.length,
                    total_vendas: vendasCreated.length
                },
                resultado: 'sucesso'
            }
        });

        // Invalidate dashboard cache
        await dashboardCache.invalidateTenant(req.tenantId);

        return {
            success: true,
            vendas_criadas: vendasCreated.length,
            linhas_nao_processadas: unmatchedLines.length,
            partial: unmatchedLines.length > 0
        };
    });

    /**
     * Reject/Delete sales import
     */
    app.delete('/importacoes/:id', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        const { id } = req.params;

        await prisma.vendaImportacao.update({
            where: {
                id: parseInt(id)
            },
            data: {
                status: 'rejected'
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                tenant_id: req.tenantId,
                user_id: req.userId,
                acao: 'VENDA_IMPORTACAO_REJEITADA',
                entidade_tipo: 'VendaImportacao',
                entidade_id: id.toString(),
                resultado: 'sucesso'
            }
        });

        return { success: true };
    });
}
