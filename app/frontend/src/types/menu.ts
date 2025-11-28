// Menu Types

export interface MenuItem {
    id: number;
    tenant_id: number;
    uuid: string;
    receita_id?: number;
    combo_id?: number;
    formato_venda_id?: number;
    nome_comercial: string;
    pvp: number;
    margem_bruta: number | null;
    margem_percentual: number | null;
    cmv_percentual: number;
    categoria_menu: string | null;
    descricao_menu: string | null;
    alergenos: string | null;
    calorias: number | null;
    tempo_servico: number | null;
    posicao_menu: number;
    destacado: boolean;
    ativo: boolean;
    imagem_url: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface MenuItemWithRecipe extends MenuItem {
    receita?: {
        id: number;
        nome: string;
        tipo: string;
        custo_por_porcao: number;
        custo_total: number;
        numero_porcoes: number;
        imagem_url: string | null;
        descricao: string | null;
        categoria: string | null;
    };
    combo?: {
        id: number;
        nome: string;
        tipo: string;
        custo_total: number;
        imagem_url: string | null;
        descricao: string | null;
    };
    formatoVenda?: {
        id: number;
        nome: string;
        custo_unitario: number;
        unidade_medida: string;
        quantidade_vendida: number;
        produto: {
            imagem_url: string | null;
            nome: string;
        };
    };
}

export interface CreateMenuItemDTO {
    receita_id?: number;
    combo_id?: number;
    formato_venda_id?: number;
    nome_comercial: string;
    pvp: number;
    categoria_menu?: string;
    descricao_menu?: string;
    alergenos?: string;
    calorias?: number;
    tempo_servico?: number;
    posicao_menu?: number;
    destacado?: boolean;
}

export interface UpdateMenuItemDTO {
    nome_comercial?: string;
    pvp?: number;
    categoria_menu?: string;
    descricao_menu?: string;
    alergenos?: string;
    calorias?: number;
    tempo_servico?: number;
    posicao_menu?: number;
    destacado?: boolean;
}

export interface AvailableRecipe {
    id: number;
    nome: string;
    custo_por_porcao: number;
    imagem_url: string | null;
    categoria: string | null;
}

export interface AvailableProduct {
    id: number;
    nome: string;
    custo_unitario: number;
    unidade_medida: string;
    quantidade_vendida: number;
    imagem_url: string | null;
}
