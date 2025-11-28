// TypeScript interfaces for Combo module

// Complex Combo (existing - all items included)
export interface ComboItem {
    id?: number;
    combo_id?: number;
    receita_id?: number | null;
    produto_id?: number | null;
    quantidade: number;
    custo_unitario: number;
    custo_total: number;
    ordem?: number;
    observacoes?: string | null;

    // Populated data for display
    receita?: {
        id: number;
        nome: string;
        tipo: 'Final' | 'Pre-preparo';
        custo_por_porcao: number;
    } | null;
    produto?: {
        id: number;
        nome: string;
        unidade_medida: string;
    } | null;
}

// Simple Combo (NEW - category-based)
export interface ComboCategoriaOpcao {
    id?: number;
    categoria_id?: number;
    receita_id?: number | null;
    formato_venda_id?: number | null;
    custo_unitario: number;
    ordem?: number;

    // Populated data for display
    receita?: {
        id: number;
        nome: string;
        custo_por_porcao: number;
    } | null;
    formatoVenda?: {
        id: number;
        nome: string;
        custo_unitario: number;
    } | null;
}

export interface ComboCategoria {
    id?: number;
    combo_id?: number;
    categoria: string; // "Sopa", "Prato Principal", "Sobremesa", "Bebida"
    ordem: number;
    obrigatoria: boolean;
    custo_max_calculado: number;
    opcoes: ComboCategoriaOpcao[];
}

// Main Combo interface
export interface Combo {
    id: number;
    tenant_id: number;
    nome: string;
    tipo: 'Simples' | 'Complexo';
    descricao?: string | null;
    imagem_url?: string | null;
    custo_total: number;
    ativo: boolean;
    createdAt: string;
    updatedAt: string;

    // Relations
    itens?: ComboItem[]; // For Complexo type
    categorias?: ComboCategoria[]; // For Simples type
    _count?: {
        itens: number;
        categorias: number;
        menuItems: number;
    };
}

// DTOs
export interface CreateComboDto {
    nome: string;
    tipo: 'Simples' | 'Complexo';
    descricao?: string;
    imagem_url?: string;

    // For Complex type
    itens?: {
        receita_id?: number;
        produto_id?: number;
        quantidade: number;
        observacoes?: string;
    }[];

    // For Simple type
    categorias?: {
        categoria: string;
        ordem: number;
        obrigatoria?: boolean;
        opcoes: {
            receita_id?: number;
            formato_venda_id?: number;
        }[];
    }[];
}

export interface UpdateComboDto {
    nome?: string;
    tipo?: 'Simples' | 'Complexo';
    descricao?: string;
    imagem_url?: string;
    ativo?: boolean;

    // For Complex type
    itens?: {
        receita_id?: number;
        produto_id?: number;
        quantidade: number;
        observacoes?: string;
    }[];

    // For Simple type
    categorias?: {
        categoria: string;
        ordem: number;
        obrigatoria?: boolean;
        opcoes: {
            receita_id?: number;
            formato_venda_id?: number;
        }[];
    }[];
}

// Helper types for UI
export interface RecipeOption {
    id: number;
    nome: string;
    custo_por_porcao: number;
}

export interface FormatoVendaOption {
    id: number;
    nome: string;
    custo_unitario: number;
}

export interface CategoryFormData {
    categoria: string;
    ordem: number;
    obrigatoria: boolean;
    opcoes: Array<{
        tipo: 'receita' | 'formato_venda';
        id: number;
        nome: string;
        custo: number;
    }>;
}
