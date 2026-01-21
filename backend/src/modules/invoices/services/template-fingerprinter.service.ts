/**
 * Template Fingerprinting Service
 * 
 * Matches invoice OCR text against template fingerprints to determine
 * which template to use WITHOUT calling Gemini API.
 * 
 * 3-Tier Scoring System:
 * - ≥90%: High confidence → Use template directly
 * - 50-89%: Medium confidence → Use Gemini + Refine template
 * - <50%: Low confidence → Use Gemini + Create new template variant
 */

export interface TemplateFingerprintConfig {
    // Keywords únicos deste formato (peso: 40%)
    required_keywords: string[];      // ["ARMAZÉM LISBOA", "v2.0", "Tel: 21-XXXX"]
    optional_keywords?: string[];     // Keywords que aumentam confiança mas não são obrigatórios

    // Estrutura esperada (peso: 35%)
    structure_markers: {
        header_pattern: string;       // Regex para cabeçalho
        table_start_marker: string;   // "DESCRIÇÃO|QTD|PREÇO"
        table_columns: number;        // 5 colunas esperadas
        column_order: string[];       // ["desc", "qty", "unit", "price_unit", "price_total"]
    };

    // Layout hints (peso: 25%)
    layout_hints: {
        multipage: boolean;           // Fatura multi-página?
        has_logo: boolean;            // Tem logo empresa?
        footer_pattern?: string;      // "Processado por SAP"
        nif_position: 'header' | 'footer';
        date_format: string;          // "DD/MM/YYYY" vs "DD-MM-YYYY"
    };
}

export interface FingerprintMatchResult {
    score: number;  // 0-100
    breakdown: {
        keywords: number;    // 0-40
        structure: number;   // 0-35
        layout: number;      // 0-25
    };
    confidence: 'high' | 'medium' | 'low';
}

export class TemplateFingerprintService {
    // Thresholds
    private readonly HIGH_CONFIDENCE = 90;    // Usa template
    private readonly MED_CONFIDENCE = 50;     // Gemini + refina
    // < 50 = novo template

    /**
     * Calculate fingerprint match score
     * Returns 0-100 (%) + detailed breakdown
     */
    calculateFingerprintMatch(
        ocrText: string,
        fingerprint: TemplateFingerprintConfig
    ): FingerprintMatchResult {
        let keywordsScore = 0;
        let structureScore = 0;
        let layoutScore = 0;

        // Normalize OCR text for matching
        const normalizedText = ocrText.toUpperCase();

        // 1. Required Keywords (30 pontos base)
        const requiredMatches = fingerprint.required_keywords.filter(kw =>
            normalizedText.includes(kw.toUpperCase())
        ).length;
        keywordsScore = (requiredMatches / fingerprint.required_keywords.length) * 30;

        // Optional keywords (bonus 10 pontos)
        if (fingerprint.optional_keywords && fingerprint.optional_keywords.length > 0) {
            const optionalMatches = fingerprint.optional_keywords.filter(kw =>
                normalizedText.includes(kw.toUpperCase())
            ).length;
            keywordsScore += Math.min((optionalMatches / fingerprint.optional_keywords.length) * 10, 10);
        }

        // 2. Structure markers (35 pontos)
        // Table start marker (20 pontos)
        if (normalizedText.includes(fingerprint.structure_markers.table_start_marker.toUpperCase())) {
            structureScore += 20;
        }

        // Column order validation (15 pontos)
        const columnOrderScore = this.validateColumnOrder(
            normalizedText,
            fingerprint.structure_markers.column_order
        );
        structureScore += columnOrderScore;

        // 3. Layout hints (25 pontos)
        layoutScore = this.checkLayoutHints(ocrText, fingerprint.layout_hints);

        const totalScore = Math.min(keywordsScore + structureScore + layoutScore, 100);

        return {
            score: totalScore,
            breakdown: {
                keywords: Math.round(keywordsScore * 10) / 10,
                structure: Math.round(structureScore * 10) / 10,
                layout: Math.round(layoutScore * 10) / 10
            },
            confidence: totalScore >= this.HIGH_CONFIDENCE ? 'high' :
                totalScore >= this.MED_CONFIDENCE ? 'medium' : 'low'
        };
    }

    /**
     * Validate column order in table
     */
    private validateColumnOrder(ocrText: string, expectedOrder: string[]): number {
        if (!expectedOrder || expectedOrder.length === 0) {
            return 0;
        }

        // Alias mapping (same as detectColumnOrder)
        const columnAliases: Record<string, string[]> = {
            'descricao': ['DESCRIÇÃO', 'DESIGNAÇÃO', 'ARTIGO', 'PRODUTO'],
            'qtd': ['QTD', 'QUANTIDADE', 'QT', 'QTDE'],
            'unidade': ['UND', 'UNIDADE', 'UN'],
            'preco_unit': ['PREÇO', 'P.UNIT', 'P.UNITÁRIO', 'PRECO UNIT'],
            'total': ['VALOR', 'TOTAL', 'P.TOTAL', 'PRECO TOTAL'],
            'iva': ['IVA', 'TAXA'],
            'ref': ['REF', 'REFERÊNCIA', 'COD', 'CÓDIGO']
        };

        // Check if columns appear in expected order
        let lastIndex = -1;
        let correctOrder = 0;
        const upperText = ocrText.toUpperCase();

        for (const column of expectedOrder) {
            const aliases = columnAliases[column] || [column.toUpperCase()];

            for (const alias of aliases) {
                const index = upperText.indexOf(alias);
                if (index > lastIndex) {
                    correctOrder++;
                    lastIndex = index;
                    break;
                }
            }
        }

        // Calculate score based on how many columns are in correct order
        return (correctOrder / expectedOrder.length) * 15;
    }

    /**
     * Check layout hints
     */
    private checkLayoutHints(ocrText: string, hints: TemplateFingerprintConfig['layout_hints']): number {
        let score = 0;

        // Footer pattern (10 pontos)
        if (hints.footer_pattern && ocrText.toUpperCase().includes(hints.footer_pattern.toUpperCase())) {
            score += 10;
        }

        // NIF position (5 pontos)
        if (hints.nif_position === 'header') {
            // Check if NIF appears in first 20% of text
            const nifPattern = /\d{9}/;
            const match = ocrText.match(nifPattern);
            if (match && match.index! < ocrText.length * 0.2) {
                score += 5;
            }
        } else if (hints.nif_position === 'footer') {
            // Check if NIF appears in last 20% of text
            const nifPattern = /\d{9}/;
            const matches = [...ocrText.matchAll(/\d{9}/g)];
            if (matches.length > 0 && matches[matches.length - 1].index! > ocrText.length * 0.8) {
                score += 5;
            }
        }

        // Date format (5 pontos)
        if (hints.date_format) {
            const dateRegex = hints.date_format === 'DD/MM/YYYY'
                ? /\d{2}\/\d{2}\/\d{4}/
                : /\d{2}-\d{2}-\d{4}/;
            if (dateRegex.test(ocrText)) {
                score += 5;
            }
        }

        // Multipage detection (5 pontos)
        // Simple heuristic: if text is very long, likely multipage
        if (hints.multipage && ocrText.length > 5000) {
            score += 5;
        } else if (!hints.multipage && ocrText.length <= 5000) {
            score += 5;
        }

        return score;
    }

    /**
     * Generate fingerprint from parsed invoice data (for template creation)
     */
    generateFingerprint(
        ocrText: string,
        parsedInvoice: any
    ): TemplateFingerprintConfig {
        // Extract keywords from supplier name and invoice structure
        const required_keywords: string[] = [];
        const optional_keywords: string[] = [];

        // 1. SUPPLIER NAME (always required)
        if (parsedInvoice.header?.fornecedorNome) {
            // Add full name as single keyword (important!)
            required_keywords.push(parsedInvoice.header.fornecedorNome);

            // Add significant parts of supplier name
            const nameParts = parsedInvoice.header.fornecedorNome
                .split(/[\s,]+/)  // Split by space OR comma
                .filter((part: string) => part.length > 2); // Only words > 2 chars
            required_keywords.push(...nameParts.slice(0, 3)); // Take first 3 significant words
        }

        // 2. NIF (CRITICAL - most unique identifier!)
        // Support both cases: fornecedorNIF and fornecedorNif (Gemini uses lowercase)
        const nif = parsedInvoice.header?.fornecedorNIF || parsedInvoice.header?.fornecedorNif;
        if (nif) {
            required_keywords.push(nif);
        } else {
            // Try to extract NIF from OCR if not in header
            const nifMatch = ocrText.match(/NIF[:\s]*(\d{9})/i);
            if (nifMatch) {
                required_keywords.push(nifMatch[1]);
            }
        }

        // 3. DOCUMENT TYPE patterns (helps distinguish invoice formats)
        const docTypePatterns = [
            /FATURA\s+(FT|F|VD|NC)/i,
            /FATURA\s+SIMPLIFICADA/i,
            /NOTA\s+DE\s+CRÉDITO/i,
            /RECIBO/i
        ];
        for (const pattern of docTypePatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                optional_keywords.push(match[0].toUpperCase());
                break; // Only add one document type
            }
        }

        // 4. UNIQUE TEXT SNIPPETS from supplier (address, city, unique identifiers)
        // Extract specific location markers
        const locationMatch = ocrText.match(/(\d{4}-\d{3})\s+([A-ZÇÃÕ\s]{3,})/); // Postal code + city
        if (locationMatch) {
            optional_keywords.push(locationMatch[2].trim()); // Add city name
        }

        // 5. TABLE HEADERS (very distinctive per supplier)
        const tableHeaders = ['Designação', 'Descrição', 'Artigo', 'Referência', 'Código'];
        for (const header of tableHeaders) {
            if (ocrText.toUpperCase().includes(header.toUpperCase())) {
                optional_keywords.push(header);
            }
        }

        // Try to identify table start marker
        const tableStartMarker = this.detectTableStartMarker(ocrText);

        // Detect column order
        const columnOrder = this.detectColumnOrder(ocrText);

        // Detect NIF position
        const nifPosition = this.detectNIFPosition(ocrText);

        // Detect date format
        const dateFormat = this.detectDateFormat(ocrText);

        console.log(`[Fingerprinter] Generated fingerprint with ${required_keywords.length} required + ${optional_keywords.length} optional keywords`);

        return {
            required_keywords,
            optional_keywords,
            structure_markers: {
                header_pattern: '',  // TODO: Could be improved with regex extraction
                table_start_marker: tableStartMarker,
                table_columns: parsedInvoice.lineItems?.[0] ? Object.keys(parsedInvoice.lineItems[0]).length : 5,
                column_order: columnOrder
            },
            layout_hints: {
                multipage: ocrText.length > 5000,
                has_logo: true,  // Assume most invoices have logos
                footer_pattern: undefined,
                nif_position: nifPosition,
                date_format: dateFormat
            }
        };
    }

    private detectTableStartMarker(ocrText: string): string {
        // Common table headers in Portuguese invoices
        const commonHeaders = [
            'DESCRIÇÃO',
            'QUANTIDADE',
            'PREÇO',
            'ARTIGO',
            'PRODUTO',
            'QTD',
            'VALOR'
        ];

        for (const header of commonHeaders) {
            if (ocrText.toUpperCase().includes(header)) {
                return header;
            }
        }

        return 'DESCRIÇÃO'; // Default
    }

    private detectColumnOrder(ocrText: string): string[] {
        // Smart column detection using aliases
        const columnDefinitions = [
            { aliases: ['DESCRIÇÃO', 'DESIGNAÇÃO', 'ARTIGO', 'PRODUTO'], key: 'descricao' },
            { aliases: ['QTD', 'QUANTIDADE', 'QT', 'QTDE'], key: 'qtd' },
            { aliases: ['UND', 'UNIDADE', 'UN'], key: 'unidade' },
            { aliases: ['PREÇO', 'P.UNIT', 'P.UNITÁRIO', 'PRECO UNIT'], key: 'preco_unit' },
            { aliases: ['VALOR', 'TOTAL', 'P.TOTAL', 'PRECO TOTAL'], key: 'total' },
            { aliases: ['IVA', 'TAXA'], key: 'iva' },
            { aliases: ['REF', 'REFERÊNCIA', 'COD', 'CÓDIGO'], key: 'ref' }
        ];

        const detected: { key: string; position: number }[] = [];
        const upperText = ocrText.toUpperCase();

        for (const col of columnDefinitions) {
            for (const alias of col.aliases) {
                const pos = upperText.indexOf(alias);
                if (pos !== -1) {
                    detected.push({ key: col.key, position: pos });
                    break;
                }
            }
        }

        // Sort by position (left to right in document)
        if (detected.length > 0) {
            return detected.sort((a, b) => a.position - b.position).map(c => c.key);
        }

        // Fallback to common order if nothing detected
        return ['descricao', 'qtd', 'preco_unit'];
    }

    private detectNIFPosition(ocrText: string): 'header' | 'footer' {
        const nifPattern = /\d{9}/;
        const match = ocrText.match(nifPattern);

        if (!match) return 'header';

        const position = match.index! / ocrText.length;
        return position < 0.5 ? 'header' : 'footer';
    }

    private detectDateFormat(ocrText: string): string {
        if (/\d{2}\/\d{2}\/\d{4}/.test(ocrText)) {
            return 'DD/MM/YYYY';
        } else if (/\d{2}-\d{2}-\d{4}/.test(ocrText)) {
            return 'DD-MM-YYYY';
        }
        return 'DD/MM/YYYY'; // Default
    }
}
