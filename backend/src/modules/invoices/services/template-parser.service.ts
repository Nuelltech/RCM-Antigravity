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

        // Extract NIF
        if (headerConfig.nif_pattern) {
            const nifMatch = ocrText.match(new RegExp(headerConfig.nif_pattern));
            if (nifMatch) header.fornecedorNif = nifMatch[1];
        }

        // Extract supplier name
        if (headerConfig.nome_pattern) {
            const nomeMatch = ocrText.match(new RegExp(headerConfig.nome_pattern, 'm'));
            if (nomeMatch) header.fornecedorNome = nomeMatch[1].trim();
        }

        // Extract invoice number
        if (headerConfig.numero_fatura_pattern) {
            const numeroMatch = ocrText.match(new RegExp(headerConfig.numero_fatura_pattern));
            if (numeroMatch) header.numeroFatura = numeroMatch[1];
        }

        // Extract date
        if (headerConfig.data_pattern) {
            const dataMatch = ocrText.match(new RegExp(headerConfig.data_pattern));
            if (dataMatch) {
                header.dataFatura = this.parseDate(dataMatch[1]);
            }
        }

        // Extract totals
        if (headerConfig.total_pattern) {
            const totalMatch = ocrText.match(new RegExp(headerConfig.total_pattern));
            if (totalMatch) {
                header.totalComIva = this.parseNumber(totalMatch[1]);
            }
        }

        return header;
    }

    /**
     * Parse table/line items using template structure
     */
    private parseTable(ocrText: string, tableConfig: any): InvoiceLineItem[] {
        const lines: InvoiceLineItem[] = [];

        // Find table boundaries
        const startMarker = new RegExp(tableConfig.start_marker, 'i');
        const endMarker = tableConfig.end_marker ? new RegExp(tableConfig.end_marker, 'i') : null;

        const ocrLines = ocrText.split('\n');
        let inTable = false;
        let lineNumber = 0;

        for (const line of ocrLines) {
            // Start of table
            if (startMarker.test(line)) {
                inTable = true;
                continue;
            }

            // End of table
            if (endMarker && endMarker.test(line)) {
                inTable = false;
                break;
            }

            // Parse line if in table
            if (inTable && line.trim().length > 0) {
                const item = this.parseLine(line, tableConfig.row_pattern, tableConfig.columns, ++lineNumber);
                if (item) {
                    lines.push(item);
                }
            }
        }

        return lines;
    }

    /**
     * Parse a single line using row pattern and column configuration
     */
    private parseLine(line: string, rowPattern: string, columns: any[], lineNumber: number): InvoiceLineItem | null {
        const pattern = new RegExp(rowPattern);
        const match = line.match(pattern);

        if (!match) {
            return null;
        }

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

        // Validate item has at least description
        if (!item.descricaoOriginal || item.descricaoOriginal.length === 0) {
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
