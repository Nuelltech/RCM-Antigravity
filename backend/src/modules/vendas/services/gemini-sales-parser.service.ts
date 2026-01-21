import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

export interface SalesReportHeader {
    dataVenda?: Date;
    totalBruto?: number;
    totalLiquido?: number;
    iva?: {
        iva6?: { base: number; valor: number };
        iva13?: { base: number; valor: number };
        iva23?: { base: number; valor: number };
    };
    pagamentos?: {
        dinheiro?: number;
        cartao?: number;
        outros?: number;
    };
}

export interface SalesLineItem {
    linhaNumero: number;
    descricaoOriginal: string;
    descricaoLimpa?: string;
    quantidade?: number;
    precoUnitario?: number;
    precoTotal: number;
}

export interface ParsedSalesReport {
    header: SalesReportHeader;
    lineItems: SalesLineItem[];
    rawText: string;
}

/**
 * AI-powered sales report parser using Google Gemini
 * Similar to GeminiInvoiceParserService but adapted for Z-Reports/POS exports
 */
export class GeminiSalesParserService {
    private ai: any;

    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn('[GEMINI-SALES] No API key found. Gemini sales parsing will not be available.');
            console.warn('[GEMINI-SALES] Set GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable.');
            return;
        }

        this.ai = new GoogleGenerativeAI(apiKey);
        console.log('[GEMINI-SALES] Sales parser initialized successfully.');
    }

    /**
     * Parse sales report using multimodal (PDF/Image → Gemini)
     */
    async parseSalesMultimodal(filepath: string, modelName: string = 'gemini-2.5-flash'): Promise<ParsedSalesReport> {
        if (!this.ai) {
            throw new Error('Gemini not initialized');
        }

        console.log(`[GEMINI-SALES] 🖼️ Multimodal parsing: ${path.basename(filepath)}`);

        try {
            // Read file and convert to base64
            const fileBuffer = fs.readFileSync(filepath);
            const base64Data = fileBuffer.toString('base64');
            const mimeType = this.getMimeType(filepath);

            console.log(`[GEMINI-SALES] File type: ${mimeType}, size: ${(fileBuffer.length / 1024).toFixed(1)}KB`);

            // Get model
            const model = this.ai.getGenerativeModel({ model: modelName });

            // Build prompt
            const prompt = this.buildSalesPrompt();

            // Generate content
            const result = await model.generateContent([
                {
                    inlineData: {
                        data: base64Data,
                        mimeType
                    }
                },
                prompt
            ]);

            const response = await result.response;
            const text = response.text();

            console.log(`[GEMINI-SALES] Raw response length: ${text.length} chars`);

            // Parse JSON response
            const parsed = this.parseGeminiResponse(text);

            console.log(`[GEMINI-SALES] ✅ Multimodal success: ${parsed.lineItems.length} items extracted`);

            return parsed;

        } catch (error: any) {
            console.error('[GEMINI-SALES] Multimodal error:', error.message);
            throw error;
        }
    }

    /**
     * Build prompt for sales report parsing
     */
    private buildSalesPrompt(): string {
        return `
Você é um extrator de dados de relatórios de vendas (Z-Reports, relatórios de POS, fechamentos de caixa).

TAREFA:
Extraia TODOS os dados do relatório e retorne em JSON puro (sem markdown, sem \`\`\`json).

ESTRUTURA JSON (OBRIGATÓRIA):
{
  "data_venda": "YYYY-MM-DD",
  "total_bruto": number,
  "total_liquido": number,
  "iva": {
    "iva6": { "base": number, "valor": number },
    "iva13": { "base": number, "valor": number },
    "iva23": { "base": number, "valor": number }
  },
  "pagamentos": {
    "dinheiro": number,
    "cartao": number,
    "outros": number
  },
  "itens": [
    {
      "descricao": "Nome do item vendido",
      "quantidade": number,
      "preco_unitario": number,
      "preco_total": number
    }
  ]
}

REGRAS:
1. **Data:** Procure por "Data", "Date", cabeçalho
2. **Totais:** Pode haver "Total Bruto", "Total Líquido", "Total Geral"
3. **IVA:** Taxas 6%, 13%, 23% (base + valor IVA)
4. **Pagamentos:** Dinheiro, Cartão, MB Way, etc
5. **Itens:** Lista de produtos vendidos (se disponível)
6. Se um campo não existir, omita-o do JSON
7. Retorne APENAS JSON puro, sem texto adicional

IMPORTANTE: Se não houver lista de itens (apenas totais), retorne array vazio em "itens": []
`.trim();
    }

    /**
     * Parse Gemini response and extract JSON
     */
    private parseGeminiResponse(text: string): ParsedSalesReport {
        // Remove markdown code blocks if present
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        let data: any;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            console.error('[GEMINI-SALES] JSON parse error:', e);
            console.error('[GEMINI-SALES] Raw text:', text);
            throw new Error('Failed to parse Gemini response as JSON');
        }

        // Map to internal structure
        const header: SalesReportHeader = {
            dataVenda: data.data_venda ? new Date(data.data_venda) : undefined,
            totalBruto: data.total_bruto,
            totalLiquido: data.total_liquido,
            iva: data.iva ? {
                iva6: data.iva.iva6,
                iva13: data.iva.iva13,
                iva23: data.iva.iva23
            } : undefined,
            pagamentos: data.pagamentos
        };

        const lineItems: SalesLineItem[] = (data.itens || []).map((item: any, index: number) => ({
            linhaNumero: index + 1,
            descricaoOriginal: item.descricao || '',
            descricaoLimpa: item.descricao || '',
            quantidade: item.quantidade,
            precoUnitario: item.preco_unitario,
            precoTotal: item.preco_total || 0
        }));

        return {
            header,
            lineItems,
            rawText: text
        };
    }

    /**
     * Get MIME type based on file extension
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
}
