// Invoice Import Types

export interface OCRResult {
    text: string;
    confidence: number;
    metadata?: any;
}

export interface InvoiceHeader {
    fornecedor_nome?: string;
    fornecedor_nif?: string;
    numero_fatura?: string;
    data_fatura?: Date;
    total_sem_iva?: number;
    total_iva?: number;
    total_com_iva?: number;
}

export interface InvoiceLineItem {
    linha_numero: number;
    descricao_original: string;
    descricao_limpa?: string;     // NEW: Clean product name
    quantidade?: number;
    unidade?: string;
    preco_unitario?: number;
    preco_total?: number;
    iva_percentual?: number;
    iva_valor?: number;
    // NEW: Package information
    embalagem?: {
        tipo: string;              // caixa, saco, etc.
        quantidade: number;        // 4, 800, 20
        unidade: string;           // kg, g, L, un
    };
    // NEW: Calculated prices
    precos_calculados?: {
        porKg?: number;
        porLitro?: number;
        porUnidade?: number;
    };
}

export interface ParsedInvoice {
    header: InvoiceHeader;
    lines: InvoiceLineItem[];
}

export interface ProductMatch {
    produto_id: number;
    produto_nome: string;
    variacao_id?: number;
    confidence: number;
}

export interface MatchResult {
    produto?: ProductMatch;
    suggestions?: ProductMatch[];
    confidence: number;
    needsReview: boolean;
    isNew?: boolean;
    suggestedFamily?: {
        familia_id: number;
        subfamilia_id: number;
    };
}

export type InvoiceStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'error';
export type LineStatus = 'pending' | 'matched' | 'manual_review' | 'new_product' | 'approved';
