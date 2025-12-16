import { GoogleGenerativeAI } from '@google/generative-ai';

export interface InvoiceHeader {
    fornecedorNome?: string;
    fornecedorNif?: string;
    numeroFatura?: string;
    dataFatura?: Date;
    totalSemIva?: number;
    totalIva?: number;
    totalComIva?: number;
}

export interface InvoiceLineItem {
    linhaNumero: number;
    descricaoOriginal: string;
    descricaoLimpa?: string;  // Product name without package info
    quantidade?: number;
    unidade?: string;
    precoUnitario?: number;
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
            throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required');
        }

        this.ai = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Parse invoice text using Gemini AI
     */
    async parseInvoice(ocrText: string): Promise<ParsedInvoice> {
        const prompt = this.buildPrompt(ocrText);

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const text = response.text;

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
- totalSemIva: Total without VAT/IVA (as number)
- totalIva: Total VAT/IVA amount (as number)
- totalComIva: Total with VAT/IVA (as number)

**Line Items (products/services):**
For each product line, extract:

1. **Basic Info:**
   - linhaNumero: Line number (sequential, starting from 1)
   - descricaoOriginal: Full product description as it appears
   - descricaoLimpa: Product name WITHOUT package info (e.g., "BIFE FRANGO PANADO" from "BIFE FRANGO PANADO cx 4kg")
   - quantidade: Quantity purchased
   - unidade: Unit of purchase from "Un:" column (KG, UN, L, etc.)
   - precoUnitario: Price per unit (per the "Un:" column)
   - precoTotal: Line total

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
7. When calculating prices, consider that quantity purchased may be in different units than package size

**Invoice Text:**
${ocrText}

Return ONLY a JSON object with this structure:
{
  "header": {
    "fornecedorNome": "string",
    "fornecedorNif": "string",
    "numeroFatura": "string",
    "dataFatura": "YYYY-MM-DD",
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
            totalSemIva: geminiData.header?.totalSemIva,
            totalIva: geminiData.header?.totalIva,
            totalComIva: geminiData.header?.totalComIva
        };

        const lineItems: InvoiceLineItem[] = (geminiData.lineItems || []).map((item: any, index: number) => ({
            linhaNumero: item.linhaNumero || index + 1,
            descricaoOriginal: item.descricaoOriginal || '',
            descricaoLimpa: item.descricaoLimpa,
            quantidade: item.quantidade,
            unidade: item.unidade,
            precoUnitario: item.precoUnitario,
            precoTotal: item.precoTotal,
            ivaPercentual: item.ivaPercentual,
            ivaValor: item.ivaValor,
            embalagem: item.embalagem,
            precosCalculados: item.precosCalculados
        }));

        return {
            header,
            lineItems,
            rawText
        };
    }
}
