import { InvoiceHeader, InvoiceLineItem, ParsedInvoice } from './gemini-parser.service';

/**
 * Parse invoices using predefined templates
 */
export class TemplateParserService {
    /**
     * Apply template to OCR text and extract structured data
     */
    async parseWithTemplate(ocrText: string, template: any): Promise<ParsedInvoice> {
        const header = this.parseHeader(ocrText, template.header_config);
        const lineItems = this.parseTable(ocrText, template.table_config);

        return {
            header,
            lineItems,
            rawText: ocrText
        };
    }

    /**
     * Parse header information using template patterns
     */
    private parseHeader(ocrText: string, headerConfig: any): InvoiceHeader {
        const header: InvoiceHeader = {};

        // Helper to get last capture group (the actual value, not the label)
        const getLastGroup = (match: RegExpMatchArray): string | undefined => {
            for (let i = match.length - 1; i >= 1; i--) {
                if (match[i]) return match[i];
            }
            return undefined;
        };

        // Extract NIF - pattern: (NIPC?|NIF)[^\d]*(\d{9}) → we want group 2 (the digits)
        if (headerConfig.nif_pattern) {
            const nifMatch = ocrText.match(new RegExp(headerConfig.nif_pattern));
            if (nifMatch) {
                const value = getLastGroup(nifMatch);
                if (value) header.fornecedorNif = value;
            }
        }

        // Extract supplier name
        if (headerConfig.nome_pattern) {
            const nomeMatch = ocrText.match(new RegExp(headerConfig.nome_pattern, 'm'));
            if (nomeMatch) {
                const value = getLastGroup(nomeMatch);
                if (value) header.fornecedorNome = value.trim();
            }
        }

        // Extract invoice number - pattern: (FT|F|VD|NC)[\s\/]*(\d+) → we want group 2
        if (headerConfig.numero_fatura_pattern) {
            const numeroMatch = ocrText.match(new RegExp(headerConfig.numero_fatura_pattern));
            if (numeroMatch) {
                const value = getLastGroup(numeroMatch);
                if (value) header.numeroFatura = value;
            }
        }

        // Extract date
        if (headerConfig.data_pattern) {
            const dataMatch = ocrText.match(new RegExp(headerConfig.data_pattern));
            if (dataMatch) {
                const value = getLastGroup(dataMatch);
                if (value) header.dataFatura = this.parseDate(value);
            }
        }

        // Extract totals
        if (headerConfig.total_pattern) {
            const totalMatch = ocrText.match(new RegExp(headerConfig.total_pattern));
            if (totalMatch) {
                const value = getLastGroup(totalMatch);
                if (value) header.totalComIva = this.parseNumber(value);
            }
        }

        return header;
    }

    /**
     * Parse table/line items using template structure
     */
    private parseTable(ocrText: string, tableConfig: any): InvoiceLineItem[] {
        const lines: InvoiceLineItem[] = [];

        console.log(`[TemplateParser] parseTable config:`, {
            start_marker: tableConfig.start_marker,
            end_marker: tableConfig.end_marker,
            row_pattern: tableConfig.row_pattern,
            columns: tableConfig.columns?.length || 0
        });

        // Find table boundaries
        const startMarker = new RegExp(tableConfig.start_marker, 'i');
        const endMarker = tableConfig.end_marker ? new RegExp(tableConfig.end_marker, 'i') : null;

        const ocrLines = ocrText.split('\n');
        let inTable = false;
        let lineNumber = 0;
        let linesChecked = 0;

        for (const line of ocrLines) {
            // Start of table
            if (!inTable && startMarker.test(line)) {
                inTable = true;
                console.log(`[TemplateParser] Found table start at: "${line.substring(0, 50)}..."`);
                continue;
            }

            // End of table
            if (inTable && endMarker && endMarker.test(line)) {
                console.log(`[TemplateParser] Found table end at: "${line.substring(0, 50)}..."`);
                inTable = false;
                break;
            }

            // Parse line if in table
            if (inTable && line.trim().length > 0) {
                linesChecked++;
                const item = this.parseLine(line, tableConfig.row_pattern, tableConfig.columns, ++lineNumber);
                if (item) {
                    lines.push(item);
                }
            }
        }

        console.log(`[TemplateParser] parseTable result: ${lines.length} items (checked ${linesChecked} lines, inTable=${inTable})`);

        return lines;
    }

    /**
     * Parse a single line using row pattern and column configuration
     */
    private parseLine(line: string, rowPattern: string, columns: any[], lineNumber: number): InvoiceLineItem | null {
        // Try strict pattern first
        if (rowPattern) {
            const pattern = new RegExp(rowPattern);
            const match = line.match(pattern);

            if (match) {
                return this.parseLineWithMatch(match, columns, lineNumber);
            }
        }

        // Fallback: heuristic parsing
        // Look for lines that have numbers (likely product lines)
        return this.parseLineHeuristic(line, lineNumber);
    }

    /**
     * Parse line using regex match result
     */
    private parseLineWithMatch(match: RegExpMatchArray, columns: any[], lineNumber: number): InvoiceLineItem {
        const item: InvoiceLineItem = {
            linhaNumero: lineNumber,
            descricaoOriginal: ''
        };

        // Map columns
        columns.forEach(col => {
            const value = match[col.index + 1]; // +1 because match[0] is full match

            if (!value) return;

            switch (col.name) {
                case 'descricao':
                    item.descricaoOriginal = value.trim();
                    break;
                case 'quantidade':
                    item.quantidade = this.parseNumber(value);
                    break;
                case 'unidade':
                    item.unidade = value.toUpperCase();
                    break;
                case 'preco':
                case 'precoUnitario':
                    item.precoUnitario = this.parseNumber(value);
                    break;
                case 'valor':
                case 'precoTotal':
                    item.precoTotal = this.parseNumber(value);
                    break;
                case 'iva':
                case 'ivaPercentual':
                    item.ivaPercentual = this.parseNumber(value);
                    break;
            }
        });

        return item;
    }

    /**
     * Heuristic parsing: extract description and numbers from line
     */
    private parseLineHeuristic(line: string, lineNumber: number): InvoiceLineItem | null {
        // Must have at least one number to be a product line
        const rawNumbers = line.match(/[\d]+[,.]?\d*/g);
        if (!rawNumbers || rawNumbers.length < 2) {
            return null; // Not enough numbers to be a product line
        }

        // Filter out barcodes (numbers with 10+ consecutive digits are EAN/GTIN codes)
        const numbers: string[] = rawNumbers.filter(n => {
            const digitsOnly = n.replace(/[,.]/g, '');
            return digitsOnly.length < 10; // Keep only short numbers (prices, quantities)
        });

        if (numbers.length < 2) {
            return null; // After filtering barcodes, not enough numbers left
        }

        // Skip header-like lines
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('descrição') || lowerLine.includes('designação') ||
            lowerLine.includes('quantidade') || lowerLine.includes('preço')) {
            return null;
        }

        // Extract description (text before first number pattern)
        const descMatch = line.match(/^(.+?)\s+[\d]/);
        const description = descMatch ? descMatch[1].trim() : line.substring(0, 30);

        // Skip if description is too short or looks like a total
        if (description.length < 3 || /^(total|subtotal|iva|s\.\s*taxa)/i.test(description)) {
            return null;
        }

        // Parse numbers from end of line (usually: qty unit price total)
        const item: InvoiceLineItem = {
            linhaNumero: lineNumber,
            descricaoOriginal: description
        };

        // Last number is usually total
        if (numbers.length >= 1) {
            item.precoTotal = this.parseNumber(numbers[numbers.length - 1]);
        }
        // Second to last is usually unit price
        if (numbers.length >= 2) {
            item.precoUnitario = this.parseNumber(numbers[numbers.length - 2]);
        }
        // Third from end is usually quantity
        if (numbers.length >= 3) {
            item.quantidade = this.parseNumber(numbers[numbers.length - 3]);
        }

        // VALIDATION: Skip items with unreasonable values (likely extraction errors)
        const MAX_PRICE = 99999.99;
        const MAX_QTY = 9999;

        if ((item.precoTotal && item.precoTotal > MAX_PRICE) ||
            (item.precoUnitario && item.precoUnitario > MAX_PRICE) ||
            (item.quantidade && item.quantidade > MAX_QTY)) {
            console.log(`[TemplateParser] Skipping line ${lineNumber} - values out of range: qty=${item.quantidade}, unit=${item.precoUnitario}, total=${item.precoTotal}`);
            return null;
        }

        return item;
    }

    /**
     * Parse Portuguese number format (1.234,56 → 1234.56)
     */
    private parseNumber(value: string): number | undefined {
        if (!value) return undefined;

        // Remove spaces and EUR symbols
        let cleaned = value.replace(/\s/g, '').replace(/€|EUR/gi, '');

        // Check if using Portuguese format (. as thousand separator, , as decimal)
        if (cleaned.includes('.') && cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (cleaned.includes(',')) {
            // Only comma, assume decimal separator
            cleaned = cleaned.replace(',', '.');
        }

        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
    }

    /**
     * Parse date string to Date object
     */
    private parseDate(dateStr: string): Date | undefined {
        // Try common Portuguese formats: DD/MM/YYYY, DD-MM-YYYY
        const formats = [
            /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/,  // DD/MM/YYYY
            /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/   // YYYY-MM-DD
        ];

        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                if (match[1].length === 4) {
                    // YYYY-MM-DD
                    return new Date(`${match[1]}-${match[2]}-${match[3]}`);
                } else {
                    // DD-MM-YYYY
                    return new Date(`${match[3]}-${match[2]}-${match[1]}`);
                }
            }
        }

        return undefined;
    }
}
