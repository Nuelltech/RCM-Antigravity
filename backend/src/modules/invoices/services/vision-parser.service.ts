import { ImageAnnotatorClient } from '@google-cloud/vision';
import { ParsedInvoice, InvoiceLineItem, InvoiceHeader } from './gemini-parser.service';

/**
 * Vision API Parser Service
 * 
 * Fallback parser when Gemini API fails.
 * Uses Google Cloud Vision API Document Text Detection for invoice parsing.
 */
export class VisionParserService {
    private client: ImageAnnotatorClient;

    constructor() {
        // Initialize Vision API client
        this.client = new ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_VISION_API_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
    }

    /**
     * Parse invoice using Google Vision API
     */
    async parseInvoice(filepath: string): Promise<ParsedInvoice> {
        console.log('[VisionParser] Starting Vision API parsing...');

        try {
            // Perform document text detection
            const [result] = await this.client.documentTextDetection(filepath);

            if (!result.fullTextAnnotation || !result.fullTextAnnotation.text) {
                throw new Error('No text detected by Vision API');
            }

            const fullText = result.fullTextAnnotation.text;
            console.log(`[VisionParser] Extracted ${fullText.length} characters`);

            // Parse the text into structured data
            const parsed = this.parseStructuredData(fullText);

            return parsed;

        } catch (error: any) {
            console.error('[VisionParser] Error:', error);
            throw new Error(`Vision API parsing failed: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Parse extracted text into structured invoice data
     */
    private parseStructuredData(ocrText: string): ParsedInvoice {
        // Extract header information
        const header: InvoiceHeader = {
            fornecedorNome: this.extractSupplierName(ocrText) || undefined,
            fornecedorNif: this.extractNIF(ocrText) || undefined,
            numeroFatura: this.extractInvoiceNumber(ocrText) || undefined,
            dataFatura: this.extractInvoiceDate(ocrText) || undefined,
            totalSemIva: undefined,
            totalIva: undefined,
            totalComIva: this.extractTotal(ocrText) || undefined
        };

        // Extract line items
        const lineItems = this.extractLineItems(ocrText);

        return {
            header,
            lineItems,
            rawText: ocrText
        };
    }

    /**
     * Extract supplier name from OCR text
     */
    private extractSupplierName(ocrText: string): string | null {
        const topSection = ocrText.substring(0, 500);
        const lines = topSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Find first substantial line (likely company name)
        const excludeKeywords = ['FATURA', 'INVOICE', 'NOTA', 'TALÃO', 'ORIGINAL', 'DUPLICADO', 'CÓPIA'];

        for (const line of lines) {
            if (line.length > 3 &&
                line.length < 100 &&
                !excludeKeywords.some(kw => line.toUpperCase().includes(kw)) &&
                /[A-Za-z]{3,}/.test(line)) {
                return line;
            }
        }

        return null;
    }

    /**
     * Extract NIF from OCR text
     */
    private extractNIF(ocrText: string): string | null {
        const patterns = [
            /NIF[:\s]*(\d{9})/i,
            /NIPC[:\s]*(\d{9})/i,
            /Contribuinte[:\s]*(\d{9})/i,
            /N\.I\.F\.?[:\s]*(\d{9})/i
        ];

        for (const pattern of patterns) {
            const match = ocrText.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // Fallback: first 9-digit number
        const fallback = ocrText.match(/\d{9}/);
        return fallback ? fallback[0] : null;
    }

    /**
     * Extract invoice number
     */
    private extractInvoiceNumber(ocrText: string): string | null {
        const patterns = [
            /(?:Fatura|Invoice|Doc)[:\s#]*([A-Z0-9\-\/]+)/i,
            /N[º°][:\s]*([A-Z0-9\-\/]+)/i,
            /FT[:\s]*([A-Z0-9\-\/]+)/i
        ];

        for (const pattern of patterns) {
            const match = ocrText.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return null;
    }

    /**
     * Extract invoice date
     */
    private extractInvoiceDate(ocrText: string): Date | null {
        const patterns = [
            /Data[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
            /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/
        ];

        for (const pattern of patterns) {
            const match = ocrText.match(pattern);
            if (match && match[1]) {
                return this.parseDate(match[1]);
            }
        }

        return null;
    }

    /**
     * Extract total amount
     */
    private extractTotal(ocrText: string): number | null {
        const patterns = [
            /Total[:\s]*€?\s*([\d,\.]+)/i,
            /Total\s+com\s+IVA[:\s]*€?\s*([\d,\.]+)/i,
            /Total\s+Geral[:\s]*€?\s*([\d,\.]+)/i
        ];

        for (const pattern of patterns) {
            const match = ocrText.match(pattern);
            if (match && match[1]) {
                return this.parseAmount(match[1]);
            }
        }

        return null;
    }

    /**
     * Extract line items from invoice
     */
    private extractLineItems(ocrText: string): InvoiceLineItem[] {
        const items: InvoiceLineItem[] = [];

        // Find table section (after "Descrição" or similar header)
        const tableMarkers = ['DESCRIÇÃO', 'ARTIGO', 'PRODUTO', 'DESCRIPTION'];
        let tableStart = -1;

        for (const marker of tableMarkers) {
            const index = ocrText.toUpperCase().indexOf(marker);
            if (index !== -1) {
                tableStart = index;
                break;
            }
        }

        if (tableStart === -1) {
            console.warn('[VisionParser] No table header found');
            return items;
        }

        // Extract table section (until "Total" or end markers)
        const endMarkers = ['TOTAL', 'SUB-TOTAL', 'OBSERVAÇÕES', 'NOTAS'];
        let tableEnd = ocrText.length;

        for (const marker of endMarkers) {
            const index = ocrText.toUpperCase().indexOf(marker, tableStart);
            if (index !== -1 && index < tableEnd) {
                tableEnd = index;
            }
        }

        const tableSection = ocrText.substring(tableStart, tableEnd);
        const lines = tableSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            // Try to parse line as invoice item
            const item = this.parseLineItem(line);
            if (item && item.descricaoOriginal) {
                items.push(item);
            }
        }

        console.log(`[VisionParser] Extracted ${items.length} line items`);
        return items;
    }

    /**
     * Parse single line item
     */
    private parseLineItem(line: string): InvoiceLineItem | null {
        // Simple heuristic: line should have description + numbers
        // Pattern: [Description] [Qty] [Unit] [Price]

        // Extract all numbers from line
        const numbers = [...line.matchAll(/([\d,\.]+)/g)].map(m => this.parseAmount(m[1]));

        if (numbers.length < 2) {
            return null; // Not enough data
        }

        // Description is likely everything before first number
        const firstNumberIndex = line.search(/([\d,\.]+)/);
        if (firstNumberIndex === -1) return null;

        const descricao = line.substring(0, firstNumberIndex).trim();

        if (descricao.length < 2) {
            return null; // Description too short
        }

        return {
            linhaNumero: 0,  // Will be set when adding to array
            descricaoOriginal: descricao,
            quantidade: numbers[0] || undefined,
            unidade: undefined,  // Difficult to reliably extract
            precoUnitario: numbers[1] || undefined,
            precoTotal: numbers[numbers.length - 1] || undefined,
            ivaPercentual: undefined,
            ivaValor: undefined
        };
    }

    /**
     * Parse date string (DD/MM/YYYY or DD-MM-YYYY)
     */
    private parseDate(dateStr: string): Date | null {
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        return new Date(year, month, day);
    }

    /**
     * Parse amount string (handles European format: 1.234,56)
     */
    private parseAmount(amountStr: string): number | null {
        if (!amountStr) return null;

        // Remove spaces
        let cleaned = amountStr.replace(/\s/g, '');

        // European format: 1.234,56 → 1234.56
        if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        }

        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    }
}
