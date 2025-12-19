import { PrismaClient } from '@prisma/client';
import { TemplateMatcherService } from './template-matcher.service';
import { TemplateParserService } from './template-parser.service';
import { GeminiInvoiceParserService, ParsedInvoice } from './gemini-parser.service';

const prisma = new PrismaClient();

/**
 * Intelligent router that decides: Template vs Gemini AI
 * Uses templates when available and confident, falls back to Gemini for new suppliers
 */
export class IntelligentParserRouter {
    private matcher: TemplateMatcherService;
    private templateParser: TemplateParserService;
    private geminiParser: GeminiInvoiceParserService;

    // Confidence threshold to use template
    private readonly CONFIDENCE_THRESHOLD = 70;

    constructor() {
        this.matcher = new TemplateMatcherService();
        this.templateParser = new TemplateParserService();
        this.geminiParser = new GeminiInvoiceParserService();
    }

    /**
     * Main entry point: Parse invoice intelligently
     */
    async parse(ocrText: string, tenantId: number): Promise<ParsedInvoice & { method: 'template' | 'gemini' }> {
        // Step 1: Try to identify supplier
        const nif = this.matcher.extractNIF(ocrText);
        const supplierName = this.matcher.extractSupplierName(ocrText);

        console.log(`[IntelligentRouter] Identified - NIF: ${nif}, Name: ${supplierName}`);

        // Step 2: Find template
        let template = null;

        if (nif) {
            template = await this.matcher.findTemplateByNIF(nif);
        }

        if (!template && supplierName) {
            template = await this.matcher.findTemplateBySupplierName(supplierName);
        }

        // Step 3a: Use template if available and confident
        if (template && template.is_active && template.confidence_score >= this.CONFIDENCE_THRESHOLD) {
            console.log(`[IntelligentRouter] Using template ${template.id} (confidence: ${template.confidence_score}%)`);

            try {
                const result = await this.templateParser.parseWithTemplate(ocrText, template);

                // Validate result
                if (this.validateParsedData(result)) {
                    // Success! Update stats
                    await this.updateTemplateStats(template.id, true);

                    return {
                        ...result,
                        method: 'template'
                    };
                } else {
                    console.log(`[IntelligentRouter] Template parsing validation failed, falling back to Gemini`);
                    await this.updateTemplateStats(template.id, false);
                }
            } catch (error) {
                console.error(`[IntelligentRouter] Template parsing error:`, error);
                await this.updateTemplateStats(template.id, false);
            }
        }

        // Step 3b: Fallback to Gemini with retry logic
        console.log(`[IntelligentRouter] Using Gemini AI`);

        let geminiResult: ParsedInvoice | null = null;
        let lastError: any = null;
        const maxRetries = 3;
        const retryDelays = [2000, 4000, 8000]; // 2s, 4s, 8s

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`[IntelligentRouter] Gemini attempt ${attempt + 1}/${maxRetries}`);
                geminiResult = await this.geminiParser.parseInvoice(ocrText);
                console.log(`[IntelligentRouter] Gemini succeeded on attempt ${attempt + 1}`);
                break; // Success!
            } catch (error: any) {
                lastError = error;
                const is503 = error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded');

                if (is503 && attempt < maxRetries - 1) {
                    const delay = retryDelays[attempt];
                    console.log(`[IntelligentRouter] Gemini 503 error, retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else if (attempt < maxRetries - 1) {
                    console.log(`[IntelligentRouter] Gemini error (not 503), retrying immediately...`);
                } else {
                    console.error(`[IntelligentRouter] Gemini failed after ${maxRetries} attempts:`, error.message);
                }
            }
        }

        // If Gemini failed after all retries, try template as last resort
        if (!geminiResult) {
            console.log(`[IntelligentRouter] Gemini failed, attempting template parser as last resort...`);

            if (template) {
                try {
                    const templateResult = await this.templateParser.parseWithTemplate(ocrText, template);
                    if (this.validateParsedData(templateResult)) {
                        console.log(`[IntelligentRouter] Template parser succeeded as fallback`);
                        await this.updateTemplateStats(template.id, true);
                        return {
                            ...templateResult,
                            method: 'template'
                        };
                    }
                } catch (templateError) {
                    console.error(`[IntelligentRouter] Template fallback also failed:`, templateError);
                }
            }

            // Both failed - throw the last Gemini error
            throw new Error(`Invoice parsing failed after ${maxRetries} Gemini attempts and template fallback. Last error: ${lastError?.message || 'Unknown error'}`);
        }

        // Step 4: Learn from Gemini - create or update template
        if (nif && supplierName) {
            await this.learnFromGemini(geminiResult, ocrText, nif, supplierName, tenantId, template);
        }

        return {
            ...geminiResult,
            method: 'gemini'
        };
    }

    /**
     * Validate parsed data quality
     */
    private validateParsedData(result: ParsedInvoice): boolean {
        // Must have at least some header data
        if (!result.header.fornecedorNome && !result.header.numeroFatura) {
            return false;
        }

        // Must have line items
        if (!result.lineItems || result.lineItems.length === 0) {
            return false;
        }

        // Line items must have descriptions
        const validItems = result.lineItems.filter(item =>
            item.descricaoOriginal && item.descricaoOriginal.length > 0
        );

        if (validItems.length === 0) {
            return false;
        }

        return true;
    }

    /**
     * Update template statistics
     */
    private async updateTemplateStats(templateId: number, success: boolean): Promise<void> {
        try {
            const template = await prisma.invoiceTemplate.findUnique({
                where: { id: templateId }
            });

            if (!template) return;

            const newTimesUsed = template.times_used + 1;
            const newTimesSuccessful = template.times_successful + (success ? 1 : 0);
            const newConfidence = (newTimesSuccessful / newTimesUsed) * 100;

            await prisma.invoiceTemplate.update({
                where: { id: templateId },
                data: {
                    times_used: newTimesUsed,
                    times_successful: newTimesSuccessful,
                    confidence_score: newConfidence
                }
            });

            console.log(`[IntelligentRouter] Template ${templateId} stats updated: ${newTimesSuccessful}/${newTimesUsed} = ${newConfidence.toFixed(1)}%`);
        } catch (error) {
            console.error(`[IntelligentRouter] Error updating template stats:`, error);
        }
    }

    /**
     * Learn from Gemini: create or update template
     */
    private async learnFromGemini(
        geminiResult: ParsedInvoice,
        ocrText: string,
        nif: string,
        supplierName: string,
        tenantId: number,
        existingTemplate: any | null
    ): Promise<void> {
        try {
            // Find or create supplier
            const fornecedor = await this.matcher.findOrCreateSupplier(tenantId, nif, supplierName);

            // If template exists, don't recreate (it will improve over time with stats)
            if (existingTemplate) {
                console.log(`[IntelligentRouter] Template exists, relying on statistics to improve it`);
                return;
            }

            // Create new template from Gemini result
            console.log(`[IntelligentRouter] Creating new template for supplier ${fornecedor.nome}`);

            // Generate basic template config from Gemini result
            const headerConfig = this.generateHeaderConfig(geminiResult);
            const tableConfig = this.generateTableConfig(geminiResult);

            await prisma.invoiceTemplate.create({
                data: {
                    fornecedor_id: fornecedor.id,
                    template_name: `${fornecedor.nome} - Auto-generated`,
                    template_version: 1,
                    header_config: headerConfig,
                    table_config: tableConfig,
                    is_active: true,
                    confidence_score: 60, // Start with moderate confidence
                    created_from_ai: true,
                    created_by_tenant: tenantId
                }
            });

            console.log(`[IntelligentRouter] Template created successfully`);
        } catch (error) {
            console.error(`[IntelligentRouter] Error learning from Gemini:`, error);
        }
    }

    /**
     * Generate header config from Gemini result
     */
    private generateHeaderConfig(result: ParsedInvoice): any {
        return {
            nif_pattern: "NIF[:\\s]+(\\d{9})",
            nome_pattern: "^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ\\s&.,]+)$",
            numero_fatura_pattern: "FT[TV]?[:\\s]+([A-Z0-9\\/\\-]+)",
            data_pattern: "Data[:\\s]+(\\d{2}[-\\/]\\d{2}[-\\/]\\d{4})",
            total_pattern: "Total[:\\s]+EUR?[:\\s]+([\\d.,]+)"
        };
    }

    /**
     * Generate table config from Gemini result
     */
    private generateTableConfig(result: ParsedInvoice): any {
        return {
            start_marker: "PRODUTO|DESCRI[ÇC][ÃA]O|ARTIGO",
            end_marker: "RESUMO|TOTAL|OBSERVA[ÇC]",
            columns: [
                { name: "descricao", index: 0, type: "string" },
                { name: "quantidade", index: 1, type: "number" },
                { name: "unidade", index: 2, type: "string" },
                { name: "precoUnitario", index: 3, type: "number" },
                { name: "precoTotal", index: 4, type: "number" }
            ],
            row_pattern: "^(.+?)\\s+([\\d.,]+)\\s+(\\w+)\\s+([\\d.,]+)\\s+([\\d.,]+)$"
        };
    }
}
