import { PrismaClient, InvoiceTemplate } from '@prisma/client';
import { TemplateMatcherService } from './template-matcher.service';
import { TemplateParserService } from './template-parser.service';
import { GeminiInvoiceParserService, ParsedInvoice } from './gemini-parser.service';
import { VisionParserService } from './vision-parser.service';
import { OCRService } from './ocr.service';
import { TesseractOCRService } from './tesseract-ocr.service';
import { TemplateFingerprintService, FingerprintMatchResult } from './template-fingerprinter.service';
import { InvoiceValidationService, ValidationResult } from './invoice-validation.service';

const prisma = new PrismaClient();

/**
 * Intelligent Parse Router - NEW 3-TIER SYSTEM
 * 
 * Decision logic based on fingerprint matching:
 * - ≥90%: HIGH confidence → Use template directly
 * - 50-89%: MEDIUM confidence → Use Gemini + Refine template
 * - <50%: LOW confidence → Use Gemini + Create new template variant
 * 
 * Fallback: Vision API if Gemini fails
 */
export class IntelligentParserRouter {
    private matcher: TemplateMatcherService;
    private templateParser: TemplateParserService;
    private geminiParser: GeminiInvoiceParserService;
    private visionParser: VisionParserService;
    private ocrService: OCRService;
    private tesseractOCR: TesseractOCRService;
    private fingerprinter: TemplateFingerprintService;
    private validationService: InvoiceValidationService;

    // 3-Tier thresholds
    // NOTE: Lowered to 95% with strict validation to balance quality and independence
    private readonly HIGH_CONFIDENCE = 95;   // ≥95% → Use template directly (with validation)
    private readonly MED_CONFIDENCE = 50;    // 50-94% → Gemini + refine template
    // <50% → Gemini + new variant

    // Feature flag: Enable strict validation
    // Set to false to revert to old behavior if issues arise
    private readonly ENABLE_STRICT_VALIDATION = process.env.ENABLE_STRICT_VALIDATION !== 'false';

    constructor() {
        this.matcher = new TemplateMatcherService();
        this.templateParser = new TemplateParserService();
        this.geminiParser = new GeminiInvoiceParserService();
        this.visionParser = new VisionParserService();
        this.ocrService = new OCRService();
        this.tesseractOCR = new TesseractOCRService();
        this.fingerprinter = new TemplateFingerprintService();
        this.validationService = new InvoiceValidationService();
    }

    /**
     * Main parsing entry point with 3-tier decision logic
     */
    async parse(
        ocrText: string,
        tenantId: number,
        filepath?: string  // For Vision API fallback
    ): Promise<ParsedInvoice & { method: string; template_id?: number; template_score?: number }> {
        const startTime = Date.now();

        // ========================================
        // 🚀 MULTIMODAL FIRST (Best Quality) with RETRY
        // ========================================
        if (filepath) {
            const maxAttempts = 1;
            let lastError: any;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    if (attempt > 1) {
                        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff: 2s, 4s
                        console.log(`[Router] ⏳ Waiting ${delay}ms before retry ${attempt}/${maxAttempts}...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }

                    console.log(`[Router] 🖼️ Trying Gemini Multimodal (attempt ${attempt}/${maxAttempts})...`);
                    const result = await this.geminiParser.parseInvoiceMultimodal(filepath);

                    if (this.validateParsedData(result)) {
                        console.log(`[Router] ✅ Multimodal success in ${Date.now() - startTime}ms (attempt ${attempt})`);

                        // 🧠 LEARN: Update/Create Template from this success
                        try {
                            let textForLearning = ocrText;

                            if (!textForLearning || textForLearning.trim().length < 50) {
                                console.log('[Router] 🧠 Multimodal success, but missing OCR text. Running On-Demand OCR for template learning...');
                                try {
                                    const ocrRes = await this.ocrService.extractText(filepath);
                                    textForLearning = ocrRes.fullText;
                                } catch (e) {
                                    console.warn('[Router] ⚠️ Could not extract text for learning:', e);
                                }
                            }

                            if (textForLearning && textForLearning.trim().length > 50) {
                                const nif = result.header.fornecedorNif || null;
                                const supplierName = result.header.fornecedorNome || null;
                                await this.learnFromGemini(result, textForLearning, nif, supplierName, tenantId);
                            }
                        } catch (learningError) {
                            console.error('[Router] ⚠️ Template learning failed (non-fatal):', learningError);
                        }

                        return { ...result, method: 'gemini-multimodal' };
                    }

                    console.warn(`[Router] ⚠️ Multimodal attempt ${attempt} returned invalid data`);
                    lastError = new Error('Validation failed');

                } catch (error: any) {
                    lastError = error;
                    console.warn(`[Router] ❌ Multimodal attempt ${attempt} failed: ${error?.message}`);

                    // Don't retry on certain errors
                    if (error?.message?.includes('file not found') || error?.message?.includes('invalid file')) {
                        console.error('[Router] 🔴 Fatal error - file issue, not retrying');
                        break;
                    }
                }
            }

            console.error(`[Router] 🔴 Multimodal failed after ${maxAttempts} attempts, falling back to OCR flow...`);
            console.error('[Router] Last error:', lastError?.message);
        }

        // ========================================
        // FALLBACK: OCR-based flow
        // ========================================

        // Guard: If we are here, Multimodal failed. We NEED OCR text to proceed.
        let usedTesseract = false;

        if (!ocrText || ocrText.trim().length < 10) {
            console.log('[Router] ⚠️ Multimodal failed and no OCR text provided via queue.');

            if (filepath) {
                // FALLBACK PRIORITY 1: Google Vision OCR (Fast & Accurate)
                try {
                    console.log('[Router] 🔍 Trying Google Vision OCR...');
                    const visionStart = Date.now();
                    const visionResult = await this.ocrService.extractText(filepath);
                    ocrText = visionResult.fullText;
                    console.log(`[Router] ✅ Vision OCR success: ${ocrText.length} chars in ${Date.now() - visionStart}ms`);
                } catch (visionError: any) {
                    console.warn('[Router] ⚠️ Google Vision OCR failed:', visionError.message);

                    // FALLBACK PRIORITY 2: Tesseract OCR (Free but Slow/Less Accurate)
                    console.log('[Router] 🔄 Trying Tesseract OCR as last resort...');
                    console.warn('[Router] ⚠️ TESSERACT OCR USED - Invoice should be manually verified!');
                    usedTesseract = true;

                    try {
                        const tesseractResult = await this.tesseractOCR.extractText(filepath);
                        ocrText = tesseractResult.fullText;
                        console.log(`[Router] ✅ Tesseract OCR success: ${ocrText.length} chars (confidence: ${tesseractResult.confidence.toFixed(1)}%)`);
                    } catch (tesseractError: any) {
                        console.error('[Router] ❌ Tesseract OCR failed:', tesseractError);
                    }
                }
            }

            // Final check
            if (!ocrText || ocrText.trim().length < 10) {
                throw new Error(`Invoice processing failed: Multimodal failed and no usable OCR text available (${ocrText?.length || 0} chars).`);
            }
        }

        // Step 1: Identify supplier
        const nif = this.matcher.extractNIF(ocrText);
        const supplierName = this.matcher.extractSupplierName(ocrText);

        console.log(`[Router] Supplier: ${supplierName} (NIF: ${nif})`);

        // Step 2: Find ALL templates for this supplier
        const templates = await this.matcher.findTemplatesBySupplier(nif, supplierName);

        if (templates.length === 0) {
            console.log('[Router] No templates found → Gemini (first invoice)');
            return await this.parseWithGemini(ocrText, tenantId, nif, supplierName, null, filepath);
        }

        // Step 3: FINGERPRINT MATCHING - Find best template
        const bestMatch = this.findBestTemplateMatch(ocrText, templates);

        if (!bestMatch) {
            console.log('[Router] No fingerprint match → Gemini + create variant');
            return await this.parseWithGemini(ocrText, tenantId, nif, supplierName, null, filepath);
        }

        console.log(`[Router] Best fingerprint match: ${bestMatch.score.toFixed(1)}% (template #${bestMatch.template.id})`);
        console.log(`[Router] Breakdown - Keywords: ${bestMatch.result.breakdown.keywords}, Structure: ${bestMatch.result.breakdown.structure}, Layout: ${bestMatch.result.breakdown.layout}`);

        // ========================================
        // 🎯 3-TIER DECISION SYSTEM
        // ========================================

        // TIER 1: HIGH CONFIDENCE (≥90%) → Use Template
        if (bestMatch.score >= this.HIGH_CONFIDENCE) {
            console.log(`[Router] ✅ HIGH confidence (${bestMatch.score.toFixed(1)}%) → Using template #${bestMatch.template.id}`);

            try {
                const result = await this.templateParser.parseWithTemplate(ocrText, bestMatch.template);

                if (this.validateParsedData(result)) {
                    await this.updateTemplateStats(bestMatch.template.id, true);
                    return { ...result, method: 'template', template_id: bestMatch.template.id, template_score: bestMatch.score };
                } else {
                    console.warn('[Router] Template parsing validation failed despite high fingerprint');
                    await this.updateTemplateStats(bestMatch.template.id, false);
                    // Fall through to Gemini
                }
            } catch (error) {
                console.error('[Router] Template parsing error:', error);
                await this.updateTemplateStats(bestMatch.template.id, false);
                // Fall through to Gemini
            }
        }

        // TIER 2: MEDIUM CONFIDENCE (50-89%) → Gemini + Refine Template
        if (bestMatch.score >= this.MED_CONFIDENCE && bestMatch.score < this.HIGH_CONFIDENCE) {
            console.log(`[Router] ⚠️  MEDIUM confidence (${bestMatch.score.toFixed(1)}%) → Gemini + will refine template #${bestMatch.template.id}`);

            const geminiResult = await this.retryGemini(ocrText, filepath);

            if (geminiResult) {
                // Compare Gemini result with template
                try {
                    const templateResult = await this.templateParser.parseWithTemplate(ocrText, bestMatch.template);
                    const similarity = this.compareResults(templateResult, geminiResult);

                    console.log(`[Router] Template vs Gemini similarity: ${(similarity * 100).toFixed(1)}%`);

                    if (similarity >= 0.7) {
                        // Template is decent but needs refinement
                        console.log(`[Router] 🔧 Refining template #${bestMatch.template.id} based on Gemini result`);
                        await this.refineTemplate(bestMatch.template, geminiResult, ocrText);
                        await this.updateTemplateStats(bestMatch.template.id, true);
                    } else if (similarity >= 0.3) {
                        // Template somewhat works but has issues
                        console.warn(`[Router] Template moderately different from Gemini (${(similarity * 100).toFixed(1)}%)`);
                        await this.updateTemplateStats(bestMatch.template.id, false);
                    } else {
                        // Template completely broken - create variant!
                        console.warn(`[Router] ⚠️  Template SEVERELY different from Gemini (${(similarity * 100).toFixed(1)}%)`);
                        console.log(`[Router] Creating template variant for better accuracy`);
                        await this.updateTemplateStats(bestMatch.template.id, false);
                        await this.createTemplateVariant(geminiResult, ocrText, nif, supplierName, tenantId);
                    }
                } catch (error) {
                    console.warn('[Router] Could not compare with template:', error);
                    await this.updateTemplateStats(bestMatch.template.id, false);
                }

                return { ...geminiResult, method: 'gemini', template_id: bestMatch.template.id, template_score: bestMatch.score };
            }
        }

        // TIER 3: LOW CONFIDENCE (<50%) → Gemini + Create New Template
        console.log(`[Router] ❌ LOW confidence (${bestMatch.score.toFixed(1)}%) → Gemini + will create new template variant`);

        const geminiResult = await this.retryGemini(ocrText, filepath);

        if (geminiResult) {
            // Check if result is similar to ANY existing template
            const matchingTemplate = await this.validateAgainstTemplates(geminiResult, templates);

            if (matchingTemplate) {
                // Actually matches an existing template (fingerprint was wrong)
                console.log(`[Router] ✅ Gemini result matches template #${matchingTemplate.id} → Updating stats`);
                await this.updateTemplateStats(matchingTemplate.id, true);
            } else {
                // Truly different format → Create new variant
                console.log(`[Router] 🆕 Creating new template variant (format different from ${templates.length} existing)`);
                await this.createTemplateVariant(geminiResult, ocrText, nif, supplierName, tenantId);
            }

            return { ...geminiResult, method: 'gemini', template_id: bestMatch?.template.id, template_score: bestMatch?.score };
        }

        // ALL FAILED → No more fallbacks
        throw new Error('GEMINI_UNAVAILABLE: All parsing attempts exhausted (Gemini API unavailable)');
    }

    /**
     * Find best matching template using fingerprinting
     */
    private findBestTemplateMatch(
        ocrText: string,
        templates: InvoiceTemplate[]
    ): { template: InvoiceTemplate; result: FingerprintMatchResult; score: number } | null {
        let bestMatch: { template: InvoiceTemplate; result: FingerprintMatchResult; score: number } | null = null;

        console.log(`[Router] 🔍 Checking ${templates.length} templates for best match:`);

        for (const template of templates) {
            if (!template.fingerprint_config) {
                console.log(`[Router]   Template #${template.id} (${template.template_format_id || 'no-format'}) - NO fingerprint, skipping`);
                continue;
            }

            const result = this.fingerprinter.calculateFingerprintMatch(
                ocrText,
                template.fingerprint_config as any
            );

            // Penalize templates with empty configs (they can't parse properly!)
            let adjustedScore = result.score;
            const hasEmptyHeaderConfig = !template.header_config || Object.keys(template.header_config as object).length === 0;
            const hasEmptyTableConfig = !template.table_config || Object.keys(template.table_config as object).length === 0;

            if (hasEmptyHeaderConfig || hasEmptyTableConfig) {
                adjustedScore = result.score * 0.5; // 50% penalty for empty configs
                console.log(`[Router]   Template #${template.id} (${template.template_format_id || 'no-format'}) → ${result.score.toFixed(1)}% → ${adjustedScore.toFixed(1)}% (PENALIZED: empty configs) [K:${result.breakdown.keywords} S:${result.breakdown.structure} L:${result.breakdown.layout}]`);
            } else {
                console.log(`[Router]   Template #${template.id} (${template.template_format_id || 'no-format'}) → ${result.score.toFixed(1)}% [K:${result.breakdown.keywords} S:${result.breakdown.structure} L:${result.breakdown.layout}]`);
            }

            if (!bestMatch || adjustedScore > bestMatch.score) {
                bestMatch = {
                    template,
                    result,
                    score: adjustedScore
                };
            }
        }

        return bestMatch;
    }

    /**
     * Retry Gemini with fallback to Vision API
     */
    private async retryGemini(
        ocrText: string,
        filepath?: string
    ): Promise<ParsedInvoice | null> {
        const attempts = [
            { model: 'gemini-2.5-flash', delayBefore: 0 },
            { model: 'gemini-2.0-flash', delayBefore: 2000 }
        ];

        for (let i = 0; i < attempts.length; i++) {
            const { model, delayBefore } = attempts[i];

            if (delayBefore > 0) {
                console.log(`[Router] Waiting ${delayBefore}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delayBefore));
            }

            try {
                console.log(`[Router] Gemini attempt ${i + 1}/${attempts.length} using model: ${model}`);
                const result = await this.geminiParser.parseInvoice(ocrText, model);

                if (this.validateParsedData(result)) {
                    console.log(`[Router] ✅ Gemini succeeded on attempt ${i + 1}`);
                    return result;
                } else {
                    console.log(`[Router] Gemini returned invalid data on attempt ${i + 1}`);
                }
            } catch (error: any) {
                const is503 = error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded');
                console.warn(`[Router] Gemini attempt ${i + 1} failed: ${is503 ? '503 Service Unavailable' : error.message}`);
            }
        }

        // ========================================
        // FALLBACK: Tesseract OCR (Alternative OCR source)
        // ========================================
        if (filepath) {
            console.log('[Router] 🔄 Trying Tesseract OCR as alternative...');
            try {
                const tesseractResult = await this.tesseractOCR.extractText(filepath);

                if (tesseractResult.fullText.length > 100) {
                    console.log(`[Router] ✅ Tesseract extracted ${tesseractResult.fullText.length} chars (confidence: ${tesseractResult.confidence.toFixed(1)}%)`);
                    console.log('[Router] Retrying Gemini with Tesseract text...');

                    // Retry Gemini with Tesseract text (2 attempts)
                    const tesseractAttempts = [
                        { model: 'gemini-2.5-flash', delayBefore: 0 },
                        { model: 'gemini-2.0-flash', delayBefore: 2000 }
                    ];

                    for (let i = 0; i < tesseractAttempts.length; i++) {
                        const { model, delayBefore } = tesseractAttempts[i];

                        if (delayBefore > 0) {
                            await new Promise(resolve => setTimeout(resolve, delayBefore));
                        }

                        try {
                            console.log(`[Router] Gemini attempt ${i + 1}/${tesseractAttempts.length} with Tesseract text using model: ${model}`);
                            const result = await this.geminiParser.parseInvoice(tesseractResult.fullText, model);

                            if (this.validateParsedData(result)) {
                                console.log(`[Router] ✅ Gemini succeeded with Tesseract text!`);
                                return result;
                            }
                        } catch (error: any) {
                            console.warn(`[Router] Gemini attempt ${i + 1} failed with Tesseract text:`, error.message);
                        }
                    }
                } else {
                    console.warn('[Router] Tesseract extraction also poor');
                }
            } catch (error: any) {
                console.warn('[Router] Tesseract OCR failed:', error.message);
            }
        }

        // ========================================
        // ALL FAILED - Return null (worker will handle error status)
        // ========================================
        console.error('[Router] ❌ ALL parsing attempts failed (Gemini unavailable)');
        console.error('[Router] Attempted: Multimodal → Google Vision OCR → Gemini Text (4x) → Tesseract OCR → Gemini Text (2x)');
        return null;
    }

    /**
     * Parse with Gemini (for first invoice or new supplier)
     */
    private async parseWithGemini(
        ocrText: string,
        tenantId: number,
        nif: string | null,
        supplierName: string | null,
        existingTemplate: InvoiceTemplate | null,
        filepath?: string
    ): Promise<ParsedInvoice & { method: string }> {
        const geminiResult = await this.retryGemini(ocrText, filepath);

        if (!geminiResult) {
            throw new Error('Failed to parse invoice: Both Gemini and Vision API failed');
        }

        // Learn from this invoice (create template if first time)
        await this.learnFromGemini(geminiResult, ocrText, nif, supplierName, tenantId);

        return { ...geminiResult, method: 'gemini' };
    }

    /**
     * Learn from Gemini result (create first template)
     */
    private async learnFromGemini(
        geminiResult: ParsedInvoice,
        ocrText: string,
        nif: string | null,
        supplierName: string | null,
        tenantId: number
    ): Promise<void> {
        try {
            const fornecedor = await this.matcher.findOrCreateSupplier(tenantId, nif, supplierName);

            // Check if template already exists for this supplier
            const existingTemplates = await prisma.invoiceTemplate.findMany({
                where: { fornecedor_id: fornecedor.id }
            });

            // If template exists but has NO fingerprint, populate it!
            if (existingTemplates.length > 0) {
                const templateWithoutFingerprint = existingTemplates.find((t: any) => !t.fingerprint_config);

                if (templateWithoutFingerprint) {
                    console.log(`[Router] Template #${templateWithoutFingerprint.id} missing fingerprint - adding it now`);

                    const fingerprint = this.fingerprinter.generateFingerprint(ocrText, geminiResult);

                    await prisma.invoiceTemplate.update({
                        where: { id: templateWithoutFingerprint.id },
                        data: {
                            fingerprint_config: fingerprint as any,
                            updatedAt: new Date()
                        }
                    });

                    console.log(`[Router] ✅ Fingerprint added to template #${templateWithoutFingerprint.id}`);
                } else {
                    console.log(`[Router] Supplier already has ${existingTemplates.length} template(s) with fingerprints`);
                }

                return;
            }

            // Create first template from Gemini result
            console.log(`[Router] Creating first template for supplier ${fornecedor.nome}`);

            const fingerprint = this.fingerprinter.generateFingerprint(ocrText, geminiResult);

            await prisma.invoiceTemplate.create({
                data: {
                    fornecedor_id: fornecedor.id,
                    template_name: `${fornecedor.nome} - Format 1`,
                    template_format_id: 'format_1',
                    template_version: 1,
                    header_config: this.generateHeaderConfig(geminiResult, ocrText),
                    table_config: this.generateTableConfig(geminiResult, ocrText),
                    fingerprint_config: fingerprint as any,
                    is_active: true,
                    confidence_score: 50,  // Initial confidence
                    created_from_ai: true,
                    created_by_tenant: tenantId
                }
            });

            console.log(`[Router] ✅ First template created for ${fornecedor.nome}`);
        } catch (error) {
            console.error('[Router] Error in learnFromGemini:', error);
        }
    }

    /**
     * Refine existing template based on Gemini result
     */
    private async refineTemplate(
        template: InvoiceTemplate,
        geminiResult: ParsedInvoice,
        ocrText: string
    ): Promise<void> {
        try {
            const updates: any = { updatedAt: new Date() };

            // 1. Merge fingerprints
            const newFingerprint = this.fingerprinter.generateFingerprint(ocrText, geminiResult);
            const existingFingerprint = template.fingerprint_config as any;

            if (existingFingerprint) {
                updates.fingerprint_config = this.mergeFingerprints(existingFingerprint, newFingerprint);
            } else {
                updates.fingerprint_config = newFingerprint;
            }

            // 2. Fill header_config if empty
            if (!template.header_config || Object.keys(template.header_config as object).length === 0) {
                updates.header_config = this.generateHeaderConfig(geminiResult, ocrText);
            }

            // 3. Fill table_config if empty
            if (!template.table_config || Object.keys(template.table_config as object).length === 0) {
                updates.table_config = this.generateTableConfig(geminiResult, ocrText);
            }

            // 4. Increase confidence on successful refinement
            updates.confidence_score = Math.min((template.confidence_score || 50) + 5, 95);

            await prisma.invoiceTemplate.update({
                where: { id: template.id },
                data: updates
            });

            console.log(`[Router] ✅ Template #${template.id} refined (confidence: ${updates.confidence_score})`);
        } catch (error) {
            console.error(`[Router] Failed to refine template:`, error);
        }
    }

    /**
     * Merge two fingerprints intelligently
     */
    private mergeFingerprints(existing: any, newFp: any): any {
        const existingKeywords = new Set(existing.required_keywords || []);
        const commonKeywords = (newFp.required_keywords || []).filter((kw: string) =>
            existingKeywords.has(kw)
        );

        const allRequired = [...new Set([
            ...commonKeywords,
            ...(newFp.required_keywords || [])
        ])];

        return {
            required_keywords: allRequired.slice(0, 8),
            optional_keywords: [...new Set([
                ...(existing.optional_keywords || []),
                ...(newFp.optional_keywords || [])
            ])].slice(0, 10),
            structure_markers: newFp.structure_markers || existing.structure_markers,
            layout_hints: { ...existing.layout_hints, ...newFp.layout_hints }
        };
    }

    /**
     * Create new template variant for different format
     */
    private async createTemplateVariant(
        geminiResult: ParsedInvoice,
        ocrText: string,
        nif: string | null,
        supplierName: string | null,
        tenantId: number
    ): Promise<void> {
        try {
            const fornecedor = await this.matcher.findOrCreateSupplier(tenantId, nif, supplierName);

            // Count existing templates to generate format_id
            const existingCount = await prisma.invoiceTemplate.count({
                where: { fornecedor_id: fornecedor.id }
            });

            const formatId = `format_${existingCount + 1}_${Date.now()}`;

            // Generate fingerprint from Gemini result
            const fingerprint = this.fingerprinter.generateFingerprint(ocrText, geminiResult);

            await prisma.invoiceTemplate.create({
                data: {
                    fornecedor_id: fornecedor.id,
                    template_name: `${fornecedor.nome} - Format ${existingCount + 1}`,
                    template_format_id: formatId,
                    template_version: 1,
                    header_config: this.generateHeaderConfig(geminiResult, ocrText),
                    table_config: this.generateTableConfig(geminiResult, ocrText),
                    fingerprint_config: fingerprint as any,
                    is_active: true,
                    confidence_score: 50,
                    created_from_ai: true,
                    created_by_tenant: tenantId
                }
            });

            console.log(`[Router] ✅ New template variant created: ${formatId}`);
        } catch (error) {
            console.error('[Router] Failed to create template variant:', error);
        }
    }

    /**
     * Validate if Gemini result matches any existing template
     */
    private async validateAgainstTemplates(
        geminiResult: ParsedInvoice,
        templates: InvoiceTemplate[]
    ): Promise<InvoiceTemplate | null> {
        // Simple heuristic: check if supplier name and total match
        for (const template of templates) {
            // TODO: More sophisticated matching
            // For now, return null (assume it's different)
        }
        return null;
    }

    /**
     * Compare two parsed results for similarity
     */
    private compareResults(result1: ParsedInvoice, result2: ParsedInvoice): number {
        let matches = 0;
        let total = 0;

        console.log('\n[Router] 🔍 DETAILED COMPARISON:');
        console.log('  Template Result:', {
            nif: result1.header.fornecedorNif,
            invoice: result1.header.numeroFatura,
            total: result1.header.totalComIva,
            lineItems: result1.lineItems.length
        });
        console.log('  Gemini Result:', {
            nif: result2.header.fornecedorNif,
            invoice: result2.header.numeroFatura,
            total: result2.header.totalComIva,
            lineItems: result2.lineItems.length
        });

        // Compare header fields
        if (result1.header.fornecedorNif && result2.header.fornecedorNif) {
            total++;
            const match = result1.header.fornecedorNif === result2.header.fornecedorNif;
            if (match) matches++;
            console.log(`  NIF: ${match ? '✅' : '❌'} (${result1.header.fornecedorNif} vs ${result2.header.fornecedorNif})`);
        }

        if (result1.header.numeroFatura && result2.header.numeroFatura) {
            total++;
            const match = result1.header.numeroFatura === result2.header.numeroFatura;
            if (match) matches++;
            console.log(`  Invoice#: ${match ? '✅' : '❌'} (${result1.header.numeroFatura} vs ${result2.header.numeroFatura})`);
        }

        if (result1.header.totalComIva && result2.header.totalComIva) {
            total++;
            const diff = Math.abs(result1.header.totalComIva - result2.header.totalComIva);
            const match = diff < 0.01;
            if (match) matches++;
            console.log(`  Total: ${match ? '✅' : '❌'} (${result1.header.totalComIva} vs ${result2.header.totalComIva}, diff: ${diff})`);
        }

        // Compare line items count
        total++;
        const itemDiff = Math.abs(result1.lineItems.length - result2.lineItems.length);
        const itemMatch = itemDiff <= 2;
        if (itemMatch) matches++;
        console.log(`  Line Items: ${itemMatch ? '✅' : '❌'} (${result1.lineItems.length} vs ${result2.lineItems.length}, diff: ${itemDiff})`);

        const similarity = total > 0 ? matches / total : 0;
        console.log(`  FINAL SIMILARITY: ${(similarity * 100).toFixed(1)}% (${matches}/${total} matches)\n`);

        return similarity;
    }

    /**
     * Validate parsed data has minimum required fields and correct values
     * 
     * NEW: Multi-layer validation:
     * 1. Basic check (backward compatible)
     * 2. Format validation (if ENABLE_STRICT_VALIDATION)
     * 3. Mathematical validation (if ENABLE_STRICT_VALIDATION)
     */
    private validateParsedData(result: ParsedInvoice): boolean {
        // LAYER 1: Basic validation (always runs - backward compatible)
        if (!result.lineItems || result.lineItems.length === 0) {
            console.error('[Router] ❌ Validation failed: No line items');
            return false;
        }

        // LAYER 2-3: Strict validation (feature flag controlled)
        if (this.ENABLE_STRICT_VALIDATION) {
            const validation = this.validationService.validate(result);

            // Log warnings always
            if (validation.warnings.length > 0) {
                console.warn('[Router] ⚠️  Validation warnings:', validation.warnings);
            }

            // Handle errors
            if (!validation.valid) {
                console.error('[Router] ❌ Strict validation failed:', validation.errors);

                // 🔴 STRICT MODE: Reject invalid data
                return false;
            }

            console.log('[Router] ✅ Strict validation passed');
        }

        return true;
    }

    /**
     * Update template usage statistics
     */
    private async updateTemplateStats(templateId: number, success: boolean): Promise<void> {
        try {
            const template = await prisma.invoiceTemplate.findUnique({
                where: { id: templateId }
            });

            if (!template) return;

            const times_used = template.times_used + 1;
            const times_successful = template.times_successful + (success ? 1 : 0);
            const confidence_score = (times_successful / times_used) * 100;

            await prisma.invoiceTemplate.update({
                where: { id: templateId },
                data: {
                    times_used,
                    times_successful,
                    confidence_score,
                    updatedAt: new Date()
                }
            });

            console.log(`[Router] Template #${templateId} stats updated: ${times_successful}/${times_used} (${confidence_score.toFixed(1)}%)`);
        } catch (error) {
            console.error('[Router] Failed to update template stats:', error);
        }
    }

    /**
     * Generate header config from Gemini parsed result
     */
    private generateHeaderConfig(geminiResult: ParsedInvoice, ocrText: string): Record<string, any> {
        const config: Record<string, any> = {};

        // Extract NIF pattern (Gemini uses fornecedorNif)
        const nif = (geminiResult.header as any)?.fornecedorNIF || geminiResult.header?.fornecedorNif;
        if (nif) {
            config.nif_pattern = `(NIPC?|NIF)[^\\d]*(\\d{9})`;
        }

        // Extract supplier name pattern
        if (geminiResult.header?.fornecedorNome) {
            config.nome_pattern = `^(${this.escapeRegex(geminiResult.header.fornecedorNome)})`;
        }

        // Extract invoice number pattern
        if (geminiResult.header?.numeroFatura) {
            config.numero_fatura_pattern = `(FT|F|VD|NC)[\\s\\/]*(\\d+)`;
        }

        // Extract date pattern
        config.data_pattern = `(\\d{2}[\\/\\-]\\d{2}[\\/\\-]\\d{4})`;

        // Extract total pattern
        config.total_pattern = `Total[^\\d]*([\\d.,]+)`;

        return config;
    }

    /**
     * Generate table config from Gemini parsed result
     */
    private generateTableConfig(geminiResult: ParsedInvoice, ocrText: string): Record<string, any> {
        const config: Record<string, any> = {};

        // Detect table start marker
        const tableMarkers = ['DESCRIÇÃO', 'DESIGNAÇÃO', 'ARTIGO', 'PRODUTO', 'REFERÊNCIA'];
        for (const marker of tableMarkers) {
            if (ocrText.toUpperCase().includes(marker)) {
                config.start_marker = marker;
                break;
            }
        }
        config.start_marker = config.start_marker || 'DESCRIÇÃO';

        // Detect table end marker
        const endMarkers = ['TOTAL', 'SUBTOTAL', 'IVA'];
        for (const marker of endMarkers) {
            if (ocrText.toUpperCase().includes(marker)) {
                config.end_marker = marker;
                break;
            }
        }

        // Column configuration based on first line item
        if (geminiResult.lineItems?.length > 0) {
            const columns = [];
            const item = geminiResult.lineItems[0];

            if (item.descricaoOriginal) columns.push({ name: 'descricao', index: 0 });
            if (item.quantidade !== undefined) columns.push({ name: 'quantidade', index: 1 });
            if (item.unidade) columns.push({ name: 'unidade', index: 2 });
            if (item.precoUnitario !== undefined) columns.push({ name: 'precoUnitario', index: 3 });
            if (item.precoTotal !== undefined) columns.push({ name: 'precoTotal', index: 4 });

            config.columns = columns;
        }

        // Generic row pattern
        config.row_pattern = `(.+?)\\s+(\\d+[,.]?\\d*)\\s+(\\w+)\\s+([\\d.,]+)\\s+([\\d.,]+)`;

        return config;
    }

    /**
     * Escape regex special characters in a string
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
