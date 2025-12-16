import { OCRResult } from './ocr.service';

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
    quantidade?: number;
    unidade?: string;
    precoUnitario?: number;
    precoTotal?: number;
    ivaPercentual?: number;
    ivaValor?: number;
}

export interface ParsedInvoice {
    header: InvoiceHeader;
    lineItems: InvoiceLineItem[];
    rawText: string;
}

export class InvoiceParserService {
    /**
     * Parse OCR result into structured invoice data
     */
    async parseInvoice(ocrResult: OCRResult): Promise<ParsedInvoice> {
        const text = ocrResult.fullText;

        // Extract header information
        const header = this.extractHeader(text);

        // Extract line items
        const lineItems = this.extractLineItems(text);

        return {
            header,
            lineItems,
            rawText: text
        };
    }

    /**
     * Extract invoice header information
     */
    private extractHeader(text: string): InvoiceHeader {
        const header: InvoiceHeader = {};

        // Extract supplier name (usually at top of invoice)
        const supplierPatterns = [
            /^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ\s&.,\-]+)$/m,
            /Fornecedor[:\s]+([^\n]+)/i,
            /Supplier[:\s]+([^\n]+)/i
        ];

        for (const pattern of supplierPatterns) {
            const match = text.match(pattern);
            if (match && match[1].trim().length > 3) {
                header.fornecedorNome = match[1].trim();
                break;
            }
        }

        // Extract NIF
        const nifPatterns = [
            /NIF[:\s]+(\d{9})/i,
            /NIPC[:\s]+(\d{9})/i,
            /Contribuinte[:\s]+(\d{9})/i
        ];

        for (const pattern of nifPatterns) {
            const match = text.match(pattern);
            if (match) {
                header.fornecedorNif = match[1];
                break;
            }
        }

        // Extract invoice number
        const invoicePatterns = [
            /Fatura[:\s]+([A-Z0-9\/\-]+)/i,
            /Invoice[:\s]+([A-Z0-9\/\-]+)/i,
            /N[º°\.]?\s*([A-Z0-9\/\-]+)/i
        ];

        for (const pattern of invoicePatterns) {
            const match = text.match(pattern);
            if (match) {
                header.numeroFatura = match[1].trim();
                break;
            }
        }

        // Extract date
        const datePatterns = [
            /Data[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
            /Date[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
            /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                header.dataFatura = this.parseDate(match[1]);
                break;
            }
        }

        // Extract totals
        const totalPatterns = [
            /Total\s+s\/\s*IVA[:\s]+([\d.,]+)/i,
            /Total\s+sem\s+IVA[:\s]+([\d.,]+)/i,
            /Subtotal[:\s]+([\d.,]+)/i
        ];

        for (const pattern of totalPatterns) {
            const match = text.match(pattern);
            if (match) {
                header.totalSemIva = this.parseNumber(match[1]);
                break;
            }
        }

        const ivaPatterns = [
            /Total\s+IVA[:\s]+([\d.,]+)/i,
            /IVA[:\s]+([\d.,]+)/i
        ];

        for (const pattern of ivaPatterns) {
            const match = text.match(pattern);
            if (match) {
                header.totalIva = this.parseNumber(match[1]);
                break;
            }
        }

        const totalComIvaPatterns = [
            /Total\s+c\/\s*IVA[:\s]+([\d.,]+)/i,
            /Total\s+com\s+IVA[:\s]+([\d.,]+)/i,
            /Total\s+Geral[:\s]+([\d.,]+)/i,
            /Total[:\s]+([\d.,]+)€/i
        ];

        for (const pattern of totalComIvaPatterns) {
            const match = text.match(pattern);
            if (match) {
                header.totalComIva = this.parseNumber(match[1]);
                break;
            }
        }

        return header;
    }

    /**
     * Extract line items from invoice
     */
    private extractLineItems(text: string): InvoiceLineItem[] {
        const lineItems: InvoiceLineItem[] = [];
        const lines = text.split('\n');

        let lineNumber = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines and headers
            if (!line || this.isHeaderLine(line)) {
                continue;
            }

            // Try to parse as line item
            const item = this.parseLineItem(line, lineNumber + 1);
            if (item) {
                lineItems.push(item);
                lineNumber++;
            }
        }

        return lineItems;
    }

    /**
     * Check if line is a header/footer or non-product line
     */
    private isHeaderLine(line: string): boolean {
        const lowerLine = line.toLowerCase();

        // Skip header keywords
        const headerKeywords = [
            'descrição', 'description',
            'quantidade', 'quantity',
            'preço', 'price', 'total', 'iva', 'vat',
            'artigo', 'produto', 'product',
            'página', 'page', 'lote', 'unid', 'desc', 'valor'
        ];

        if (headerKeywords.some(keyword => lowerLine.includes(keyword))) {
            return true;
        }

        // Skip contact information
        const contactPatterns = [
            /tel[.:]/i, /fax[.:]/i, /email[.:]/i, /e-mail/i,
            /@/, /www\./i, /http/i,
            /sede[.:]/i, /morada/i, /endereço/i, /address/i,
            /nipc/i, /nif[.:]/i, /iban/i,
            /zona\s+industrial/i, /\/\//,  // paths like //
        ];

        if (contactPatterns.some(pattern => pattern.test(line))) {
            return true;
        }

        // Skip dates and administrative info
        if (/^\d{4}-\d{2}-\d{2}/.test(line) || /^\d{2}[-\/]\d{2}[-\/]\d{4}/.test(line)) {
            return true;
        }

        // Skip lines that are too short (likely not products)
        if (line.length < 5) {
            return true;
        }

        // Skip lines that are ALL CAPS short words (likely labels)
        if (/^[A-Z]{2,10}$/.test(line)) {
            return true;
        }

        return false;
    }

    /**
     * Parse a single line item
     */
    private parseLineItem(line: string, lineNumber: number): InvoiceLineItem | null {
        // Extract numbers from line
        const numbers = line.match(/[\d.,]+/g) || [];

        // Product lines must have at least one number (quantity, price, or total)
        if (numbers.length === 0) {
            return null;
        }

        // Extract description (first text part before numbers)
        // Look for product name patterns - typically start with letters
        const descMatch = line.match(/^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ][A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ\s\-.,()/0-9]+?)(?=\s+[\d])/i);

        if (!descMatch) {
            // Fallback: take first 30% of line as description
            const firstPart = line.substring(0, Math.floor(line.length * 0.3)).trim();
            if (firstPart.length < 3) {
                return null;
            }

            const descricaoOriginal = firstPart;

            return {
                linhaNumero: lineNumber,
                descricaoOriginal,
                quantidade: numbers[0] ? this.parseNumber(numbers[0]) : undefined,
                unidade: this.extractUnit(line),
                precoUnitario: numbers[1] ? this.parseNumber(numbers[1]) : undefined,
                precoTotal: numbers[2] ? this.parseNumber(numbers[2]) : (numbers[0] ? this.parseNumber(numbers[0]) : undefined)
            };
        }

        const descricaoOriginal = descMatch[1].trim();

        // Filter out obviously wrong descriptions
        if (this.isInvalidDescription(descricaoOriginal)) {
            return null;
        }

        // Parse quantities, prices
        let quantidade: number | undefined;
        let precoUnitario: number | undefined;
        let precoTotal: number | undefined;

        // Usually: Description Quantity Unit Price Total
        if (numbers.length >= 3) {
            quantidade = this.parseNumber(numbers[0]!);
            precoUnitario = this.parseNumber(numbers[1]!);
            precoTotal = this.parseNumber(numbers[2]!);
        } else if (numbers.length === 2) {
            quantidade = this.parseNumber(numbers[0]!);
            precoTotal = this.parseNumber(numbers[1]!);
        } else if (numbers.length === 1) {
            precoTotal = this.parseNumber(numbers[0]!);
        }

        return {
            linhaNumero: lineNumber,
            descricaoOriginal,
            quantidade,
            unidade: this.extractUnit(line),
            precoUnitario,
            precoTotal
        };
    }

    /**
     * Check if description is invalid (contact info, addresses, etc)
     */
    private isInvalidDescription(desc: string): boolean {
        const invalidPatterns = [
            /^tel/i, /^fax/i, /^email/i, /^sede/i, /^nipc/i, /^nif/i,
            /^iban/i, /^\d{9}$/, // Just a number
            /@/, /www\./i
        ];

        return invalidPatterns.some(pattern => pattern.test(desc));
    }

    /**
     * Extract unit from line
     */
    private extractUnit(line: string): string | undefined {
        const unitMatch = line.match(/\b(kg|kgs|un|cx|l|ml|g|uni|emb|gfo|bil|tb|em|lt|litro|litros)\b/i);
        return unitMatch ? unitMatch[1].toUpperCase() : undefined;
    }

    /**
     * Parse date string to Date object
     */
    private parseDate(dateStr: string): Date {
        // Handle formats: DD/MM/YYYY, DD-MM-YYYY, etc.
        const parts = dateStr.split(/[-\/]/);

        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
            const year = parseInt(parts[2], 10);

            // Handle 2-digit years
            const fullYear = year < 100 ? 2000 + year : year;

            return new Date(fullYear, month, day);
        }

        return new Date(dateStr);
    }

    /**
     * Parse number string to number
     */
    private parseNumber(numStr: string): number {
        // Handle European format: 1.234,56 -> 1234.56
        // Handle US format: 1,234.56 -> 1234.56

        const cleaned = numStr.trim();

        // Check if last separator is comma (European) or dot (US)
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');

        if (lastComma > lastDot) {
            // European format
            return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        } else {
            // US format
            return parseFloat(cleaned.replace(/,/g, ''));
        }
    }
}
