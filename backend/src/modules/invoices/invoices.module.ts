import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { FileUploadService } from './services/file-upload.service';
import { OCRService } from './services/ocr.service';
import { IntelligentParserRouter } from './services/intelligent-parser-router.service';
import { ProductMatcherService } from './services/matcher.service';
import { InvoiceIntegrationService } from './services/integration.service';

const prisma = new PrismaClient();

// Initialize services
const fileUploadService = new FileUploadService();
const ocrService = new OCRService();
const parserRouter = new IntelligentParserRouter(); // Intelligent routing: Template first → Gemini fallback
const matcherService = new ProductMatcherService();
const integrationService = new InvoiceIntegrationService();

// Helper to convert internal file path to public URL
function toPublicUrl(filepath: string | null): string | null {
    if (!filepath) return null;
    if (filepath.startsWith('http') || filepath.startsWith('/uploads')) return filepath;

    // Normalize slashes
    const normalized = filepath.replace(/\\/g, '/');
    const uploadsIndex = normalized.indexOf('/uploads/');

    // DEBUG LOG
    console.log(`[URL Transform] Original: ${filepath} -> Normalized: ${normalized} (Index: ${uploadsIndex})`);

    if (uploadsIndex !== -1) {
        return normalized.substring(uploadsIndex);
    }

    return filepath;
}

export async function invoicesRoutes(app: FastifyInstance) {
    // Register multipart support
    await app.register(require('@fastify/multipart'), {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        }
    });

    // Upload invoice
    app.post('/upload', async (req, reply) => {
        if (!req.tenantId || !req.userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

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

            let uploadedFile: any;

            if (uploadedBuffers.length === 1) {
                // Single file: Reuse existing uploadFile logic by mocking MultipartFile
                const mockFile = {
                    filename: uploadedBuffers[0].filename,
                    mimetype: uploadedBuffers[0].mimetype,
                    toBuffer: async () => uploadedBuffers[0].buffer,
                    file: null as any,
                    fieldname: 'file',
                    encoding: '7bit',
                    fields: {}
                };
                uploadedFile = await fileUploadService.uploadFile(mockFile as any, req.tenantId);
            } else {
                // Multiple files: Merge into PDF
                console.log(`[Upload] Processing ${uploadedBuffers.length} files (Multi-Photo Scan)`);
                uploadedFile = await fileUploadService.mergeImagesToPdf(
                    uploadedBuffers.map(u => u.buffer),
                    req.tenantId
                );
            }

            // Create invoice record
            const fatura = await prisma.faturaImportacao.create({
                data: {
                    tenant_id: req.tenantId,
                    ficheiro_nome: uploadedFile.filename,
                    ficheiro_url: uploadedFile.filepath,
                    ficheiro_tipo: fileUploadService.getFileType(uploadedFile.mimetype),
                    status: 'pending'
                }
            });


            // Perform OCR (non-blocking - multimodal can work without it)
            let ocrText = '';
            try {
                const ocrResult = await ocrService.extractText(uploadedFile.filepath);
                ocrText = ocrResult.fullText;

                // Update invoice with OCR text
                await prisma.faturaImportacao.update({
                    where: { id: fatura.id },
                    data: {
                        ocr_texto_bruto: ocrText
                    }
                });
            } catch (ocrError: any) {
                console.warn(`[Upload] OCR failed (will use multimodal): ${ocrError.message}`);
                // Continue - multimodal in worker will handle the file directly
            }


            // Add to processing queue (async via BullMQ)
            const { invoiceProcessingQueue } = await import('../../queues/invoice-processing.queue');

            await invoiceProcessingQueue.add('process-invoice', {
                invoiceId: fatura.id,
                tenantId: req.tenantId,
                ocrText: ocrText,  // May be empty if OCR failed
                filepath: uploadedFile.filepath, // Public URL to file on Hostinger
                uploadSource: 'web',
                userId: req.userId,
                mimetype: uploadedFile.mimetype
            });

            console.log(`[Upload] Invoice ${fatura.id} created and queued for processing`);

            // Return 202 Accepted (processing async)
            return reply.status(202).send({
                id: fatura.id,
                status: 'pending',
                message: 'Invoice uploaded successfully. Processing in background.',
                ficheiro_nome: fatura.ficheiro_nome
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            return reply.status(500).send({ error: error?.message || 'Upload failed' });
        }
    });

    // List invoices
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            querystring: z.object({
                status: z.string().optional(),
                page: z.string().optional(),
                limit: z.string().optional(),
            }),
            response: {
                200: z.object({
                    invoices: z.array(z.any()),
                    total: z.number(),
                    page: z.number(),
                    limit: z.number(),
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { status, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {
            tenant_id: req.tenantId
        };

        if (status) {
            where.status = status;
        }

        const [invoices, total] = await Promise.all([
            prisma.faturaImportacao.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    linhas: {
                        select: {
                            id: true,
                            status: true
                        }
                    },
                    fornecedorRel: {
                        select: {
                            nome: true,
                            nif: true
                        }
                    }
                }
            }),
            prisma.faturaImportacao.count({ where })
        ]);

        // Transform file URLs and Provider
        const transformedInvoices = invoices.map(inv => ({
            ...inv,
            ficheiro_url: toPublicUrl(inv.ficheiro_url),
            fornecedor: inv.fornecedorRel ? {
                nome: inv.fornecedorRel.nome,
                nif: inv.fornecedorRel.nif
            } : undefined
        }));

        return {
            invoices: transformedInvoices,
            total,
            page: pageNum,
            limit: limitNum
        };
    });

    // Get invoice stats (for dashboard KPI cards)
    app.withTypeProvider<ZodTypeProvider>().get('/stats', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            response: {
                200: z.object({
                    total: z.number(),
                    reviewing: z.number(),
                    approved: z.number(),
                    approved_partial: z.number(),
                    errors: z.number(),
                    pending: z.number(),
                    processing: z.number(),
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const where = {
            tenant_id: req.tenantId
        };

        const [total, reviewing, approved, approved_partial, errors, pending, processing] = await Promise.all([
            prisma.faturaImportacao.count({ where }),
            prisma.faturaImportacao.count({ where: { ...where, status: 'reviewing' } }),
            prisma.faturaImportacao.count({ where: { ...where, status: 'approved' } }),
            prisma.faturaImportacao.count({ where: { ...where, status: 'approved_partial' } }),
            prisma.faturaImportacao.count({ where: { ...where, status: 'error' } }),
            prisma.faturaImportacao.count({ where: { ...where, status: 'pending' } }),
            prisma.faturaImportacao.count({ where: { ...where, status: 'processing' } }),
        ]);

        return {
            total,
            reviewing,
            approved,
            approved_partial,
            errors,
            pending,
            processing,
        };
    });

    // Get invoice details
    app.withTypeProvider<ZodTypeProvider>().get('/:id', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number)
            }),
            response: {
                200: z.any()
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { id } = req.params;

        const fatura = await prisma.faturaImportacao.findFirst({
            where: {
                id,
                tenant_id: req.tenantId
            },
            include: {
                linhas: {
                    include: {
                        produto: true,
                        variacao: true
                    }
                },
                compras: true,
                fornecedorRel: true
            }
        });

        if (!fatura) {
            return reply.status(404).send({ error: 'Invoice not found' });
        }

        return {
            ...fatura,
            ficheiro_url: toPublicUrl(fatura.ficheiro_url),
            fornecedor: fatura.fornecedorRel ? {
                nome: fatura.fornecedorRel.nome,
                nif: fatura.fornecedorRel.nif,
                // ...fatura.fornecedorRel // spread other fields if needed
            } : undefined
        };
    });

    // Match line item to product
    app.withTypeProvider<ZodTypeProvider>().post('/:id/lines/:lineId/match', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number),
                lineId: z.string().transform(Number)
            }),
            body: z.object({
                produto_id: z.number(),
                variacao_id: z.number().optional()
            }),
            response: {
                200: z.object({
                    success: z.boolean()
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId || !req.userId) return reply.status(401).send();

        const { id, lineId } = req.params;
        const { produto_id, variacao_id } = req.body;

        // Update line
        const linha = await prisma.faturaLinhaImportacao.update({
            where: { id: lineId },
            data: {
                produto_id,
                variacao_id,
                status: 'matched',
                confianca_match: new Prisma.Decimal(100)
            }
        });

        // Save to matching history
        await matcherService.saveMatchToHistory(
            linha.descricao_original,
            produto_id,
            variacao_id || null,
            req.tenantId,
            req.userId
        );

        return { success: true };
    });

    // Get matching suggestions
    app.withTypeProvider<ZodTypeProvider>().get('/:id/lines/:lineId/suggestions', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number),
                lineId: z.string().transform(Number)
            }),
            response: {
                200: z.array(z.any())
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { lineId } = req.params;

        const linha = await prisma.faturaLinhaImportacao.findUnique({
            where: { id: lineId }
        });

        if (!linha) {
            return reply.status(404).send([]);
        }

        const suggestions = await matcherService.getSuggestions(
            linha.descricao_original,
            req.tenantId,
            10
        );

        // Add variations to each suggestion
        const suggestionsWithVariations = await Promise.all(
            suggestions.map(async (s) => {
                const [variations, produto] = await Promise.all([
                    prisma.variacaoProduto.findMany({
                        where: {
                            produto_id: s.produtoId,
                            tenant_id: req.tenantId,
                            ativo: true
                        },
                        select: {
                            id: true,
                            tipo_unidade_compra: true,
                            unidades_por_compra: true,
                            preco_compra: true,
                            preco_unitario: true
                        },
                        orderBy: {
                            id: 'asc'  // First variation created = default
                        }
                    }),
                    prisma.produto.findUnique({
                        where: { id: s.produtoId },
                        select: { unidade_medida: true }
                    })
                ]);

                return {
                    ...s,
                    unidadeMedida: produto?.unidade_medida || 'UN',
                    variations
                };
            })
        );

        return suggestionsWithVariations;
    });

    // Approve invoice
    app.withTypeProvider<ZodTypeProvider>().post('/:id/approve', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number)
            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    compra_id: z.number().optional(),
                    items_created: z.number().optional(),
                    prices_updated: z.number().optional(),
                    partial: z.boolean().optional()
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId || !req.userId) return reply.status(401).send();

        const { id } = req.params;

        try {
            const result = await integrationService.integrateInvoice(
                id,
                req.tenantId,
                req.userId
            );

            return {
                success: true,
                compra_id: result.compraId,
                items_created: result.itemsCreated,
                prices_updated: result.pricesUpdated,
                partial: result.partial
            };
        } catch (error: any) {
            console.error('Approval error:', error);
            return reply.status(400).send({ success: false });
        }
    });

    // Get Integration Log
    app.withTypeProvider<ZodTypeProvider>().get('/:id/integration-log', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number)
            }),
            response: {
                200: z.object({
                    log: z.any().nullable()
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const { id } = req.params;

        const log = await prisma.integrationLog.findFirst({
            where: { fatura_id: id, tenant_id: req.tenantId },
            include: {
                // Include summary counts if needed, but for now just the log
            }
        });

        return { log };
    });

    // Get Integration Log Items
    app.withTypeProvider<ZodTypeProvider>().get('/:id/integration-log/items', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number)
            }),
            querystring: z.object({
                type: z.string().optional() // Filter by PRODUCT, RECIPE, MENU_ITEM
            }),
            response: {
                200: z.array(z.any())
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const { id } = req.params;
        const { type } = req.query;

        const log = await prisma.integrationLog.findFirst({
            where: { fatura_id: id, tenant_id: req.tenantId },
            select: { id: true }
        });

        if (!log) return [];

        const items = await prisma.integrationLogItem.findMany({
            where: {
                log_id: log.id,
                ...(type ? { entity_type: type } : {})
            },
            orderBy: { id: 'asc' }
        });

        return items;
    });

    // Get invoices that recently completed processing (for frontend polling)
    app.get('/pending-status', async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const query = req.query as { since?: string };
        const since = query.since ? new Date(query.since) : new Date(Date.now() - 30000); // Last 30s

        const recentlyCompleted = await prisma.faturaImportacao.findMany({
            where: {
                tenant_id: req.tenantId,
                status: {
                    in: ['reviewing', 'error']
                },
                processado_em: {
                    gte: since
                }
            },
            select: {
                id: true,
                status: true,
                fornecedor_nome: true,
                numero_fatura: true,
                processado_em: true
            },
            orderBy: {
                processado_em: 'desc'
            }
        });

        return { invoices: recentlyCompleted };
    });

    // Delete/reject invoice
    app.withTypeProvider<ZodTypeProvider>().delete('/:id', {
        schema: {
            tags: ['Invoices'],
            security: [{ bearerAuth: [] }],
            params: z.object({
                id: z.string().transform(Number)
            }),
            response: {
                200: z.object({
                    success: z.boolean()
                })
            }
        }
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();

        const { id } = req.params;

        await integrationService.rejectInvoice(id);

        return { success: true };
    });
}

/**
 * Process invoice OCR and parsing in background
 */
async function processInvoiceAsync(faturaId: number, filepath: string, tenantId: number): Promise<void> {
    const startTime = Date.now();

    try {
        console.log(`[ProcessInvoice] Starting processing for invoice ${faturaId}`);

        // Update status to processing
        await prisma.faturaImportacao.update({
            where: { id: faturaId },
            data: { status: 'processing' }
        });

        // Run OCR
        console.log(`[ProcessInvoice] Running OCR on file: ${filepath}`);
        const ocrResult = await ocrService.extractText(filepath);
        console.log(`[ProcessInvoice] OCR completed. Text length: ${ocrResult.fullText.length}`);

        // Parse invoice (intelligent routing: Template → Gemini fallback)
        console.log(`[ProcessInvoice] Starting intelligent parsing`);
        const parsed = await parserRouter.parse(ocrResult.fullText, tenantId);
        console.log(`[ProcessInvoice] Parsing completed. Line items: ${parsed.lineItems.length}`);

        // Validate parsing result
        if (!parsed.lineItems || parsed.lineItems.length === 0) {
            throw new Error('Parsing failed: No line items extracted. This could be due to API failures or unsupported invoice format.');
        }

        // Update invoice header
        await prisma.faturaImportacao.update({
            where: { id: faturaId },
            data: {
                fornecedor_nome: parsed.header.fornecedorNome,
                fornecedor_nif: parsed.header.fornecedorNif,
                numero_fatura: parsed.header.numeroFatura,
                data_fatura: parsed.header.dataFatura,
                total_sem_iva: parsed.header.totalSemIva ? new Prisma.Decimal(parsed.header.totalSemIva) : null,
                total_iva: parsed.header.totalIva ? new Prisma.Decimal(parsed.header.totalIva) : null,
                total_com_iva: parsed.header.totalComIva ? new Prisma.Decimal(parsed.header.totalComIva) : null,
                ocr_texto_bruto: ocrResult.fullText,
                ocr_metadata: {
                    confidence: ocrResult.confidence,
                    pages: ocrResult.pages.length
                },
                status: 'reviewing'
            }
        });

        // Create line items        // Process each line item
        for (const item of parsed.lineItems) {
            // Log Gemini extraction for debugging
            console.log(`[Gemini Extract] Line ${item.linhaNumero}:`, {
                original: item.descricaoOriginal,
                clean: item.descricaoLimpa,
                package: item.embalagem,
                calculated: item.precosCalculados
            });

            // Match product based on description
            const match = await matcherService.findMatch(
                item.descricaoOriginal,
                tenantId,
                parsed.header.fornecedorNome
            );

            await prisma.faturaLinhaImportacao.create({
                data: {
                    fatura_importacao_id: faturaId,
                    tenant_id: tenantId,
                    linha_numero: item.linhaNumero,
                    descricao_original: item.descricaoOriginal,
                    descricao_limpa: item.descricaoLimpa,  // NEW
                    quantidade: item.quantidade ? new Prisma.Decimal(item.quantidade) : null,
                    unidade: item.unidade,
                    preco_unitario: item.precoUnitario ? new Prisma.Decimal(item.precoUnitario) : null,
                    preco_total: item.precoTotal ? new Prisma.Decimal(item.precoTotal) : null,
                    iva_percentual: item.ivaPercentual ? new Prisma.Decimal(item.ivaPercentual) : null,
                    iva_valor: item.ivaValor ? new Prisma.Decimal(item.ivaValor) : null,
                    // NEW: Package information
                    emb_tipo: item.embalagem?.tipo,
                    emb_quantidade: item.embalagem?.quantidade ? new Prisma.Decimal(item.embalagem.quantidade) : null,
                    emb_unidade: item.embalagem?.unidade,
                    // NEW: Calculated prices
                    preco_por_kg: item.precosCalculados?.porKg ? new Prisma.Decimal(item.precosCalculados.porKg) : null,
                    preco_por_litro: item.precosCalculados?.porLitro ? new Prisma.Decimal(item.precosCalculados.porLitro) : null,
                    preco_por_unidade: item.precosCalculados?.porUnidade ? new Prisma.Decimal(item.precosCalculados.porUnidade) : null,
                    produto_id: match?.produtoId,
                    variacao_id: match?.variacaoId,
                    confianca_match: match ? new Prisma.Decimal(match.confianca) : null,
                    status: match ? (match.confianca >= 80 ? 'matched' : 'manual_review') : 'pending',
                    metadata: match ? { matchReason: match.matchReason } as any : undefined
                }
            });
        }

        console.log(`[ProcessInvoice] Invoice ${faturaId} processing completed successfully!`);

        // ✅ SAVE METRICS TO AUDIT TABLE
        const duration = Date.now() - startTime;
        await prisma.invoiceProcessingMetrics.create({
            data: {
                tenant_id: tenantId,
                invoice_id: faturaId,
                upload_source: 'web',
                user_id: undefined,
                parsing_method: parsed.method || 'legacy',
                total_duration_ms: duration,
                success: true,
                line_items_extracted: parsed.lineItems.length,
                gemini_attempts: 0,
                created_at: new Date()
            }
        });
        console.log(`[ProcessInvoice] ✅ Metrics saved: method=${parsed.method}, duration=${duration}ms, items=${parsed.lineItems.length}`);

        // 🔔 NOTIFICATION: Invoice ready for review
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 FATURA PRONTA PARA REVISÃO`);
        console.log(`   ID: ${faturaId}`);
        console.log(`   Fornecedor: ${parsed.header.fornecedorNome || 'N/A'}`);
        console.log(`   Nº Fatura: ${parsed.header.numeroFatura || 'N/A'}`);
        console.log(`   Linhas: ${parsed.lineItems.length}`);
        console.log(`   Total: €${parsed.header.totalComIva || 'N/A'}`);
        console.log(`${'='.repeat(60)}\n`);

        // TODO: Implement real-time notification (WebSocket/SSE) to frontend
        // await notificationService.send(tenantId, {
        //     type: 'INVOICE_READY',
        //     faturaId,
        //     title: 'Fatura Pronta',
        //     message: `Fatura ${parsed.header.numeroFatura} pronta para revisão`
        // });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[ProcessInvoice] ERROR for invoice ${faturaId}:`, error);
        console.error(`[ProcessInvoice] Error stack:`, error.stack);

        // Update status to error
        await prisma.faturaImportacao.update({
            where: { id: faturaId },
            data: {
                status: 'error',
                erro_mensagem: error?.message || 'Processing error'
            }
        });

        // ✅ SAVE ERROR METRICS TO AUDIT TABLE
        await prisma.invoiceProcessingMetrics.create({
            data: {
                tenant_id: tenantId,
                invoice_id: faturaId,
                upload_source: 'web',
                user_id: undefined,
                parsing_method: 'failed',
                total_duration_ms: duration,
                success: false,
                line_items_extracted: 0,
                gemini_attempts: 0,
                created_at: new Date()
            }
        });
        console.log(`[ProcessInvoice] ❌ Error metrics saved: duration=${duration}ms`);
    }
}
