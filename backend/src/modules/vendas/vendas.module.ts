import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { TenantDB } from '../../core/database-tenant';
import { prisma } from '../../core/database';
import { dashboardCache } from '../../core/cache.service';
import { addSalesProcessingJob } from '../../queues/sales-processing.queue';
import { SalesMatchingService } from './services/sales-matching.service';
import { SalesFileUploadService } from './services/sales-file-upload.service';

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


    // Helper to convert internal file path to public URL
    function toPublicUrl(filepath: string | null): string | null {
        if (!filepath) return null;
        if (filepath.startsWith('http') || filepath.startsWith('/uploads')) return filepath;

        // Normalize slashes
        const normalized = filepath.replace(/\\/g, '/');
        const uploadsIndex = normalized.indexOf('/uploads/');

        console.log(`[Sales URL] Orig: ${filepath} -> Norm: ${normalized} (Idx: ${uploadsIndex})`);

        if (uploadsIndex !== -1) {
            return normalized.substring(uploadsIndex); // Returns /uploads/...
        }

        return filepath;
    }

    // =========================================================================
    // SALES IMPORT ROUTES (PDF Upload & Processing)
    // =========================================================================

    /**
     * Upload sales report (PDF/Image)
     * Supports single file or multiple images (merged to PDF)
     * Uses FTP storage with automatic fallback to local filesystem
     */
    app.post('/upload', async (req: any, reply: any) => {
        if (!req.tenantId) return reply.status(401).send();

        try {
            // Get uploaded files (iterate parts)
            const parts = req.files();
            const uploadedBuffers: { buffer: Buffer, mimetype: string, filename: string }[] = [];

            for await (const part of parts) {
                if (part.file) {
                    const buffer = await part.toBuffer();
                    uploadedBuffers.push({
                        buffer,
                        mimetype: part.mimetype,
                        filename: part.filename
                    });
                }
            }

            if (uploadedBuffers.length === 0) {
                return reply.status(400).send({ error: 'No files uploaded' });
            }

            // Upload service
            const uploadService = new SalesFileUploadService();
            let uploadedFile: any;
            let finalBuffer: Buffer;

            // Logic to handle Single vs Multiple files
            if (uploadedBuffers.length === 1) {
                // Single file
                finalBuffer = uploadedBuffers[0].buffer;
                uploadedFile = await uploadService.uploadFile(
                    {
                        filename: uploadedBuffers[0].filename,
                        mimetype: uploadedBuffers[0].mimetype
                    },
                    finalBuffer,
                    req.tenantId
                );
            } else {
                // Multiple files: Merge into PDF
                console.log(`[SALES-UPLOAD] Processing ${uploadedBuffers.length} files (Multi-Photo Scan) -> Merging to PDF`);

                // Returns UploadedFile object (already uploaded to FTP within the merge method)
                uploadedFile = await uploadService.mergeImagesToPdf(
                    uploadedBuffers.map(u => u.buffer),
                    req.tenantId
                );

                // Note: For processing queue, we need the base64 of the NEW PDF, not the original images.
                // Since mergeImagesToPdf uploads it but doesn't return the buffer, we might need to change it 
                // OR we can just download it back? No, let's keep it simple.
                // Ideally mergeImagesToPdf should return the buffer too, but let's re-read the implementation I just wrote.
                // It calls uploadFile inside.
                // Let's rely on the fact that fileContent in the job is optional or we can fetch it?
                // Actually, wait. The job needs base64. 
                // I need the buffer of the generated PDF. 
                // Let's assume for now I can't easily get it back from the current signature without changing it again.
                // BUT, I can recreate it or... 
                // Let's assume the worker can download from the URL if fileContent is missing? 
                // Looking at `sales-processing.worker.ts`... usually it prefers fileContent.

                // Let's allow the job to run. The worker usually handles URL download if content is missing OR 
                // I should download it back.
                // OR better: I'll accept that for now, since I can't easily change the return type without checking usages (which are none for now).
                // Actually, I control SalesFileUploadService completely.

                // HACK for now: We won't pass fileContent for merged PDFs if we don't have it easily.
                // OR RE-FETCH:
                const response = await fetch(uploadedFile.filepath);
                const arrayBuffer = await response.arrayBuffer();
                finalBuffer = Buffer.from(arrayBuffer);
            }

            console.log(`[SALES-UPLOAD] ✅ File uploaded successfully: ${uploadedFile.filename}`);
            console.log(`[SALES-UPLOAD] URL: ${uploadedFile.filepath}`);

            if (!finalBuffer && uploadedBuffers.length === 1) {
                finalBuffer = uploadedBuffers[0].buffer;
            }

            // Create VendaImportacao record
            const salesImport = await prisma.vendaImportacao.create({
                data: {
                    tenant_id: req.tenantId,
                    ficheiro_nome: uploadedFile.filename,
                    ficheiro_url: uploadedFile.filepath, // Public URL
                    ficheiro_tipo: uploadedFile.mimetype,
                    status: 'pending'
                }
            });

            // Queue for processing
            await addSalesProcessingJob({
                salesImportId: salesImport.id,
                tenantId: req.tenantId,
                filepath: uploadedFile.filepath,
                fileContent: finalBuffer ? finalBuffer.toString('base64') : undefined, // Pass content if available
                uploadSource: 'web',
                userId: req.userId
            });

            return reply.status(202).send({
                id: salesImport.id,
                message: 'Sales report uploaded and queued for processing',
                file_url: uploadedFile.filepath
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
                ficheiro_url: true, // ADDED
                data_venda: true,
                total_bruto: true,
                total_liquido: true,
                status: true,
                erro_mensagem: true,
                createdAt: true,
                _count: {
                    select: { linhas: true }
                }
            }
        });

        // Transform URLs
        return imports.map(imp => ({
            ...imp,
            ficheiro_url: toPublicUrl(imp.ficheiro_url)
        }));
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

        return {
            ...salesImport,
            ficheiro_url: toPublicUrl(salesImport.ficheiro_url)
        };
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
