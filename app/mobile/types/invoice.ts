// Invoice Types
export type InvoiceStatus = 'pending' | 'processing' | 'reviewing' | 'approved' | 'approved_partial' | 'error' | 'rejected';
export type LineStatus = 'pending' | 'matched' | 'manual_review';

export interface Invoice {
    id: number;
    ficheiro_nome: string;
    ficheiro_url: string;
    ficheiro_tipo: string;
    status: InvoiceStatus;
    // Backend can return fornecedor_nome directly or a relation
    fornecedor_nome?: string;
    fornecedor?: {
        nome: string;
        nif?: string;
    };
    fornecedor_nif?: string;
    numero_fatura?: string;
    data_fatura?: string;
    total_sem_iva?: number;
    total_iva?: number;
    total_com_iva?: number;
    erro_mensagem?: string;
    linhas?: InvoiceLine[];
    createdAt: string;
    updatedAt: string;
}

export interface InvoiceLine {
    id: number;
    linha_numero: number;
    descricao_original: string;
    descricao_limpa?: string;
    quantidade?: number;
    unidade?: string;
    preco_unitario?: number;
    preco_total?: number;
    iva_percentual?: number;
    iva_valor?: number;
    produto_id?: number;
    variacao_id?: number;
    confianca_match?: number;
    status: LineStatus;
    produto?: {
        id: number;
        nome: string;
        unidade_medida: string;
    };
    variacao?: {
        id: number;
        tipo_unidade_compra: string;
        unidades_por_compra: number;
        preco_compra: number;
    };
}

export interface MatchSuggestion {
    produtoId: number;
    produtoNome: string;
    confianca: number;
    matchReason: string;
    unidadeMedida: string;
    variations: {
        id: number;
        tipo_unidade_compra: string;
        unidades_por_compra: number;
        preco_compra: number;
        preco_unitario: number;
        template?: {
            nome: string;
        };
    }[];
}

export interface InvoiceListResponse {
    invoices: Invoice[];
    total: number;
    page: number;
    limit: number;
}
