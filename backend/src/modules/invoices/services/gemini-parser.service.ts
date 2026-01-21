import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

export interface InvoiceHeader {
    fornecedorNome?: string;
    fornecedorNif?: string;
    numeroFatura?: string;
    dataFatura?: Date;
    subtotalBeforeDiscount?: number;  // Sum of lines BEFORE any global discount
    globalDiscount?: number;           // Global discount value (can be % or fixed amount)
    globalDiscountType?: 'percentage' | 'fixed';  // Type of global discount
    taras?: number;                    // Container/packaging adjustment ("Tara", "Taras", "Outras Taras")
    totalSemIva?: number;              // Total AFTER discount AND taras, before VAT
    totalIva?: number;
    totalComIva?: number;
}

export interface InvoiceLineItem {
    linhaNumero: number;
    descricaoOriginal: string;
    descricaoLimpa?: string;  // Product name without package info
    quantidade?: number;
    unidade?: string;
    precoUnitarioOriginal?: number;  // Price before discount
    descontoPercentual?: number;      // Discount percentage (e.g., 14.50 for 14.50%)
    precoUnitario?: number;           // Final price after discount
    precoTotal?: number;
    ivaPercentual?: number;
    ivaValor?: number;
    embalagem?: {             // Package information
        tipo: string;         // caixa, saco, embalagem, etc.
        quantidade: number;   // 4, 800, 20, etc.
        unidade: string;      // kg, g, L, ml, un
    };
    precosCalculados?: {      // Calculated base prices
        porKg?: number;
        porLitro?: number;
        porUnidade?: number;
    };
}

export interface ParsedInvoice {
    header: InvoiceHeader;
    lineItems: InvoiceLineItem[];
    rawText: string;
}

/**
 * AI-powered invoice parser using Google Gemini
 */
export class GeminiInvoiceParserService {
    private ai: any;

    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn('[GEMINI] No API key found. Gemini invoice parsing will not be available.');
            console.warn('[GEMINI] Set GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable to enable this feature.');
            return;
        }

        this.ai = new GoogleGenerativeAI(apiKey);
        console.log('[GEMINI] Invoice parser initialized successfully.');
    }

    /**
     * Parse invoice using multimodal (send file directly to Gemini)
     * Supports PDF and images - no OCR step needed!
     */
    async parseInvoiceMultimodal(filepath: string, modelName: string = 'gemini-2.5-flash'): Promise<ParsedInvoice> {
        if (!this.ai) {
            throw new Error('Gemini not initialized');
        }

        console.log(`[GEMINI] 🖼️ Multimodal parsing: ${path.basename(filepath)}`);

        try {
            // Read file and convert to base64
            const fileBuffer = fs.readFileSync(filepath);
            const base64Data = fileBuffer.toString('base64');
            const mimeType = this.getMimeType(filepath);

            console.log(`[GEMINI] File type: ${mimeType}, size: ${(fileBuffer.length / 1024).toFixed(1)}KB`);

            // Get model (must be multimodal-capable)
            const model = this.ai.getGenerativeModel({ model: modelName });

            // Detect if multi-page (PDF) to adjust prompt
            let isMultiPage = false;

            // Heuristic or pdf-lib check
            if (filepath.toLowerCase().endsWith('.pdf')) {
                try {
                    const fileBuffer = fs.readFileSync(filepath);
                    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
                    if (pdfDoc.getPageCount() > 1) {
                        isMultiPage = true;
                        console.log(`[GEMINI] 📚 Detected multi-page PDF (${pdfDoc.getPageCount()} pages). Enabling deduplication prompt.`);
                    }
                } catch (e) {
                    console.warn('[GEMINI] Could not check page count:', e);
                }
            }

            // Build prompt for vision/PDF
            const prompt = this.buildMultimodalPrompt(isMultiPage);

            // Generate with file inline
            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType,
                        data: base64Data
                    }
                },
                { text: prompt }
            ]);

            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('Failed to extract JSON from Gemini multimodal response');
            }

            const jsonText = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonText);

            console.log(`[GEMINI] ✅ Multimodal success: ${parsed.lineItems?.length || 0} items extracted`);

            return this.transformGeminiResponse(parsed, '');

        } catch (error: any) {
            console.error('[GEMINI] Multimodal error:', error?.message);
            throw error; // Re-throw to allow fallback
        }
    }

    /**
     * Get MIME type from file path
     */
    private getMimeType(filepath: string): string {
        const ext = path.extname(filepath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Build prompt for multimodal (no OCR text, Gemini reads file directly)
     */
    /**
     * Build prompt for multimodal (no OCR text, Gemini reads file directly)
     */
    private buildMultimodalPrompt(isMultiPage: boolean = false): string {
        const dedupInstruction = isMultiPage ? `
**MULTI-PAGE HANDLING - IMPORTANT:**
This document consists of multiple pages/photos of the SAME invoice.
- **MERGE** content from all pages into a single list.
- **HANDLE OVERLAPS**: If the same product line appears at the bottom of one page and the top of the next, only list it ONCE.
- **IGNORE** duplicate headers/footers repeated on each page.
` : '';

        return `You are an AI assistant specialized in parsing Portuguese supplier invoices.
${dedupInstruction}
Analyze this invoice image/PDF and extract the following information as JSON:

**Header Information:**
- fornecedorNome: Supplier name
- fornecedorNif: Supplier Tax ID (NIF/NIPC) - 9 digits
- numeroFatura: Invoice number
- dataFatura: Invoice date (YYYY-MM-DD)
- totalSemIva: Total without VAT
- totalIva: VAT amount
- totalComIva: Total with VAT

**Line Items (products):**
For each product, extract:
- linhaNumero: Line number
- descricaoOriginal: Full product description
- quantidade: Quantity
- unidade: Unit (KG, UN, L, etc.)
- precoUnitario: Unit price
- precoTotal: Line total
- ivaPercentual: VAT percentage

**Rules:**
- Only extract product lines from the table
- Convert monetary values to numbers
- Parse dates to YYYY-MM-DD
- Omit fields that are not found

Return ONLY a JSON object:
{
  "header": { ... },
  "lineItems": [ ... ]
}`;
    }

    /**
     * Parse invoice text using Gemini AI
     */
    async parseInvoice(ocrText: string, modelName: string = 'gemini-2.5-flash'): Promise<ParsedInvoice> {
        // If Gemini is not initialized, return empty structure
        if (!this.ai) {
            console.warn('[GEMINI] Parser not initialized. Returning empty structure.');
            return {
                header: {},
                lineItems: [],
                rawText: ocrText
            };
        }

        const prompt = this.buildPrompt(ocrText);

        try {
            // Get the model
            const model = this.ai.getGenerativeModel({ model: modelName });

            // Generate content
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response (may be wrapped in markdown code blocks)
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('Failed to extract JSON from Gemini response');
            }

            const jsonText = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonText);

            return this.transformGeminiResponse(parsed, ocrText);
        } catch (error) {
            console.error('Gemini parsing error:', error);

            // Fallback to empty structure
            return {
                header: {},
                lineItems: [],
                rawText: ocrText
            };
        }
    }

    /**
     * Build prompt for Gemini
    /**
     * Build prompt for Gemini
     */
    private buildPrompt(ocrText: string): string {
        return `You are an AI assistant specialized in parsing Portuguese supplier invoices.

Extract the following information from this invoice text and return it as a JSON object:

**Header Information:**
- fornecedorNome: Supplier/vendor name
- fornecedorNif: Supplier Tax ID (NIF/NIPC) - 9 digits
- numeroFatura: Invoice number
- dataFatura: Invoice date (format: YYYY-MM-DD)
- subtotalBeforeDiscount: Sum of all line items BEFORE any global discount
- globalDiscount: Global discount value (if present at bottom of invoice)
- globalDiscountType: "percentage" if discount is % (e.g., 13%), "fixed" if discount is fixed value (e.g., 5€, 10€, 35€)
- taras: Container/packaging adjustment. Look for "Tara", "Taras", "Outras Taras", "Outras Tara", "Valor Taras" in footer. Extract NUMBER (can be positive or negative)
- totalSemIva: Total WITHOUT VAT/IVA (AFTER discounts AND taras)
- totalIva: Total VAT/IVA amount (as number)
- totalComIva: Total WITH VAT/IVA (as number)

**Line Items (products/services):**
For each product line, extract:

1. **Basic Info:**
   - linhaNumero: Line number (sequential, starting from 1)
   - descricaoOriginal: Full product description as it appears
   - descricaoLimpa: Product name WITHOUT package info (e.g., "BIFE FRANGO PANADO" from "BIFE FRANGO PANADO cx 4kg")
   - quantidade: EXACT quantity as shown in Qtd/Qd column (DO NOT ADJUST THIS!)
   - unidade: Unit of purchase from "Un:" column (KG, UN, L, etc.)
   - precoUnitarioOriginal: Original unit price BEFORE discount (from P. Unit. column)
   - descontoPercentual: Discount percentage if shown in Desc./Desc% column (e.g., 14.50 for 14.50%)
   - precoUnitario: FINAL unit price after discount (calculate: precoTotal ÷ quantidade)
   - precoTotal: Final line total (from Total column)

2. **VAT/IVA:**
   - ivaPercentual: VAT percentage (6, 13, 23, etc.)
   - ivaValor: VAT amount in euros

3. **Package Analysis:**
   Look in the description for package information patterns:
   - "cx 4kg" → Caixa (box) of 4 kilograms
   - "saco 800g" → Saco (bag) of 800 grams
   - "emb 20un" → Embalagem (package) of 20 units
   - "garrafa 1L" → Garrafa (bottle) of 1 liter
   - "pct 500g" → Pacote (pack) of 500 grams
   
   If package info exists, extract:
   - embalagem.tipo: Package type ("caixa", "saco", "embalagem", "garrafa", "pacote")
   - embalagem.quantidade: Amount per package (4, 800, 20, etc.)
   - embalagem.unidade: Unit of the package content ("kg", "g", "L", "ml", "un")

4. **Price Calculations:**
   IMPORTANT: The "Un:" column tells you what was purchased:
   - If Un: KG → quantidade is in kilograms
   - If Un: UN → quantidade is in units/bags/boxes
   - If Un: L → quantidade is in liters
   
   Calculate base prices:
   - If Un:KG and no package info → precoPorKg = precoUnitario
   - If Un:UN and package has weight (e.g., "saco 800g") → precoPorKg = precoUnitario / (weight in kg)
   - If Un:UN and package has units (e.g., "20un") → precoPorUnidade = precoUnitario / units

**Important rules:**
1. Skip header rows, addresses, contact information, and footer text
2. Only extract actual product/service lines from the products table
3. Convert all monetary values to numbers (remove €, EUR symbols, commas)
4. Parse dates to YYYY-MM-DD format
5. If a field is not found, omit it (don't use null or empty strings)
6. For package detection, look for patterns like "cx Xkg", "saco Xg", "emb Xun"
7. **CRITICAL FOR DISCOUNTS - TWO TYPES:**
   
   A) **LINE-LEVEL DISCOUNTS** (Desc/Desc%/Desconto column in table):
      - Extract EXACT quantity from Qtd column (never adjust!)
      - Extract original price from P. Unit column → precoUnitarioOriginal
      - Extract discount % from Desc column → descontoPercentual
      - Extract final line total from Total column → precoTotal
      - Calculate: precoUnitario = precoTotal ÷ quantidade
   
   B) **GLOBAL DISCOUNTS** (at bottom, after subtotal):
      - Look for "Desconto", "Discount", "Vale" in footer area
      - Can be PERCENTAGE (e.g., "Desconto: 13%") → globalDiscountType = "percentage", globalDiscount = 13
      - Can be FIXED VALUE (e.g., "Vale: 5€", "Desconto: 10€") → globalDiscountType = "fixed", globalDiscount = 10
      - Extract subtotal BEFORE discount → subtotalBeforeDiscount
      - totalSemIva should be AFTER discount applied

**Invoice Text:**
${ocrText}

Return ONLY a JSON object with this structure:
{
  "header": {
    "fornecedorNome": "string",
    "fornecedorNif": "string",
    "numeroFatura": "string",
    "dataFatura": "YYYY-MM-DD",
    "subtotalBeforeDiscount": number,
    "globalDiscount": number,
    "globalDiscountType": "percentage" | "fixed",
    "taras": number,
    "totalSemIva": number,
    "totalIva": number,
    "totalComIva": number
  },
  "lineItems": [
    {
      "linhaNumero": number,
      "descricaoOriginal": "string",
      "descricaoLimpa": "string",
      "quantidade": number,
      "unidade": "string",
      "precoUnitarioOriginal": number,
      "descontoPercentual": number,
      "precoUnitario": number,
      "precoTotal": number,
      "ivaPercentual": number,
      "ivaValor": number,
      "embalagem": {
        "tipo": "string",
        "quantidade": number,
        "unidade": "string"
      },
      "precosCalculados": {
        "porKg": number,
        "porLitro": number,
        "porUnidade": number
      }
    }
  ]
}`;
    }

    /**
     * Transform Gemini response to our internal format
     */
    private transformGeminiResponse(geminiData: any, rawText: string): ParsedInvoice {
        const header: InvoiceHeader = {
            fornecedorNome: geminiData.header?.fornecedorNome,
            fornecedorNif: geminiData.header?.fornecedorNif,
            numeroFatura: geminiData.header?.numeroFatura,
            dataFatura: geminiData.header?.dataFatura ? new Date(geminiData.header.dataFatura) : undefined,
            subtotalBeforeDiscount: geminiData.header?.subtotalBeforeDiscount,
            globalDiscount: geminiData.header?.globalDiscount,
            globalDiscountType: geminiData.header?.globalDiscountType,
            taras: geminiData.header?.taras,
            totalSemIva: geminiData.header?.totalSemIva,
            totalIva: geminiData.header?.totalIva,
            totalComIva: geminiData.header?.totalComIva
        };

        let lineItems: InvoiceLineItem[] = (geminiData.lineItems || []).map((item: any, index: number) => ({
            linhaNumero: item.linhaNumero || index + 1,
            descricaoOriginal: item.descricaoOriginal || '',
            descricaoLimpa: item.descricaoLimpa,
            quantidade: item.quantidade,
            unidade: item.unidade,
            precoUnitarioOriginal: item.precoUnitarioOriginal,
            descontoPercentual: item.descontoPercentual,
            precoUnitario: item.precoUnitario,
            precoTotal: item.precoTotal,
            ivaPercentual: item.ivaPercentual,
            ivaValor: item.ivaValor,
            embalagem: item.embalagem,
            precosCalculados: item.precosCalculados
        }));

        // POST-PROCESSING: Recalculate unit price when discount detected
        // Gemini extracts original price from "P. Unit" column, but we need
        // the FINAL price (after discount) for accurate inventory costing
        lineItems = lineItems.map(item => {
            if (item.precoTotal !== undefined && item.quantidade && item.precoUnitario) {
                const calculatedTotal = item.precoUnitario * item.quantidade;
                const diff = Math.abs(calculatedTotal - item.precoTotal);

                // If difference > 1€, assume discount is present
                if (diff > 1.00) {
                    const discountPct = ((calculatedTotal - item.precoTotal) / calculatedTotal * 100);
                    const finalPrice = item.precoTotal / item.quantidade;

                    console.log(
                        `[Parser] Line ${item.linhaNumero}: Discount detected (~${discountPct.toFixed(1)}%) - ` +
                        `Recalculating price: ${item.precoUnitario.toFixed(2)}€ → ${finalPrice.toFixed(2)}€`
                    );

                    // Store original price and discount if not already set
                    return {
                        ...item,
                        precoUnitarioOriginal: item.precoUnitarioOriginal || item.precoUnitario,
                        descontoPercentual: item.descontoPercentual || parseFloat(discountPct.toFixed(2)),
                        precoUnitario: parseFloat(finalPrice.toFixed(4))
                    };
                }
            }
            return item;
        });

        // HYBRID DISCOUNT LOGIC: Detect global discount vs line-level discount
        // Check if all lines match perfectly (no line-level discounts)
        const allLinesPerfect = lineItems.every(item => {
            if (!item.precoTotal || !item.quantidade || !item.precoUnitario) return true;
            const calculated = item.precoUnitario * item.quantidade;
            return Math.abs(calculated - item.precoTotal) < 0.02;
        });

        // If lines are perfect but header shows discount, distribute proportionally
        if (allLinesPerfect && header.globalDiscount && header.totalSemIva) {
            const sumLines = lineItems.reduce((sum, item) => sum + (item.precoTotal || 0), 0);

            console.log(`[Parser] Global discount detected: ${header.globalDiscount}€`);
            console.log(`[Parser] Sum of lines: ${sumLines.toFixed(2)}€, Total after discount: ${header.totalSemIva.toFixed(2)}€`);

            // Verify discount makes sense
            const expectedTotal = header.globalDiscountType === 'percentage'
                ? sumLines * (1 - header.globalDiscount / 100)
                : sumLines - header.globalDiscount;

            const discountDiff = Math.abs(expectedTotal - header.totalSemIva);

            if (discountDiff < 1.00) {
                // Distribute discount proportionally across all lines
                console.log(`[Parser] Distributing global discount proportionally across ${lineItems.length} lines`);

                lineItems = lineItems.map(item => {
                    if (!item.precoTotal || !item.quantidade) return item;

                    // Calculate line's share of total discount
                    const lineRatio = item.precoTotal / sumLines;
                    const lineDiscount = header.globalDiscountType === 'percentage'
                        ? item.precoTotal * (header.globalDiscount! / 100)
                        : header.globalDiscount! * lineRatio;

                    const newTotal = item.precoTotal - lineDiscount;
                    const newPrice = newTotal / item.quantidade;

                    console.log(
                        `[Parser]   Line ${item.linhaNumero}: ${item.precoTotal.toFixed(2)}€ - ${lineDiscount.toFixed(2)}€ = ${newTotal.toFixed(2)}€ ` +
                        `(${item.precoUnitario?.toFixed(2) || 'N/A'}€/un → ${newPrice.toFixed(2)}€/un)`
                    );

                    return {
                        ...item,
                        precoUnitarioOriginal: item.precoUnitario,
                        precoTotal: parseFloat(newTotal.toFixed(2)),
                        precoUnitario: parseFloat(newPrice.toFixed(4))
                    };
                });
            }
        }

        return {
            header,
            lineItems,
            rawText
        };
    }
}
