import { ParsedSalesReport, SalesLineItem, SalesReportHeader } from './gemini-sales-parser.service';

/**
 * Regex-based parser for Sales Reports (Fallback)
 * Used when Gemini AI is unavailable or fails.
 * Extracts basic information (Date, Totals) from raw OCR text.
 */
export class RegexSalesParserService {

    /**
     * Parse raw text to extract sales data
     */
    parse(text: string): ParsedSalesReport {
        console.log('[REGEX-PARSER] Starting regex parsing on text length:', text.length);

        const header = this.extractHeader(text);

        // Note: Extracting line items via regex is notoriously unreliable for varied formats.
        // We will return an empty list or basic items if found, relying on manual review.
        const lineItems: SalesLineItem[] = [];

        return {
            header,
            lineItems,
            rawText: text
        };
    }

    private extractHeader(text: string): SalesReportHeader {
        return {
            dataVenda: this.extractDate(text),
            totalBruto: this.extractTotal(text, ['Total Bruto', 'Total Geral', 'Grande Total', 'Importe']),
            totalLiquido: this.extractTotal(text, ['Total Liquido', 'Total Líquido', 'Base Imponivel']),
            iva: undefined, // Too complex for reliable regex without template
            pagamentos: undefined
        };
    }

    private extractDate(text: string): Date | undefined {
        // Match DD/MM/YYYY or YYYY-MM-DD
        const dateRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})|(\d{4})[\/\-](\d{2})[\/\-](\d{2})/;
        const match = text.match(dateRegex);

        if (match) {
            try {
                if (match[1]) {
                    // DD/MM/YYYY
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]) - 1;
                    const year = parseInt(match[3]);
                    return new Date(year, month, day);
                } else {
                    // YYYY-MM-DD
                    const year = parseInt(match[4]);
                    const month = parseInt(match[5]) - 1;
                    const day = parseInt(match[6]);
                    return new Date(year, month, day);
                }
            } catch (e) {
                console.warn('[REGEX-PARSER] Failed to parse date:', match[0]);
            }
        }
        return undefined;
    }

    private extractTotal(text: string, keywords: string[]): number | undefined {
        // Look for Keyword followed by currency-like number
        // Example: "Total Bruto: 123,45" or "Total Bruto 123.45"

        const lines = text.split('\n');

        for (const keyword of keywords) {
            // Regex to find keyword (case insensitive) and capture number
            // \s*[:.]?\s* -> optional separator
            // (\d+[.,]\d{2}) -> capture number
            const regex = new RegExp(`${keyword}.*?(\\d+[.,]\\d{2})`, 'i');

            for (const line of lines) {
                const match = line.match(regex);
                if (match) {
                    const valueStr = match[1].replace(',', '.'); // Normalize decimal
                    const val = parseFloat(valueStr);
                    if (!isNaN(val)) {
                        console.log(`[REGEX-PARSER] Found ${keyword}: ${val}`);
                        return val;
                    }
                }
            }
        }

        // Backup: Look for largest number at the end of text? Too risky.
        return undefined;
    }
}
