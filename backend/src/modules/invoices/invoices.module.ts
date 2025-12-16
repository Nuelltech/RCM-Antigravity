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
            // Get uploaded file
            const data = await req.file();

            if (!data) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }

            // Upload file
            const uploadedFile = await fileUploadService.uploadFile(data, req.tenantId);

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

            // Process OCR in background
            console.log(`[Upload] Invoice ${fatura.id} created, starting async processing...`);
            processInvoiceAsync(fatura.id, uploadedFile.filepath, req.tenantId).catch(err => {
                console.error(`[Upload] Async processing failed for invoice ${fatura.id}:`, err);
            });

            return {
                id: fatura.id,
                status: fatura.status,
                ficheiro_nome: fatura.ficheiro_nome
            };
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
                    }
                }
            }),
            prisma.faturaImportacao.count({ where })
        ]);

        return {
            invoices,
            total,
            page: pageNum,
            limit: limitNum
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
                compras: true
            }
        });

        if (!fatura) {
            return reply.status(404).send({ error: 'Invoice not found' });
        }

        return fatura;
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
                const variations = await prisma.variacaoProduto.findMany({
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
                });

                return {
                    ...s,
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

    } catch (error: any) {
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
    }
}
