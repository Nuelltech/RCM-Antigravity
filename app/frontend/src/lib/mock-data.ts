// Mock data for dashboard

export const mockKPIs = {
    cmvTeorico: {
        value: 41,
        change: 8,
        trend: 'up' as const,
        label: 'CMV Teórico'
    },
    vendas: {
        value: 7552.80,
        change: 5.8,
        trend: 'up' as const,
        label: 'Vendas do Mês'
    },
    custoMercadoria: {
        value: 7552.80,
        change: -5.2,
        trend: 'down' as const,
        label: 'Custo Mercadoria'
    },
    custoEstrutura: {
        value: 3200.00,
        change: 2.1,
        trend: 'up' as const,
        label: 'Custo Estrutura'
    }
};

export const mockSalesData = {
    '7d': [
        { date: '14 Nov', sales: 920 },
        { date: '15 Nov', sales: 1150 },
        { date: '16 Nov', sales: 980 },
        { date: '17 Nov', sales: 1340 },
        { date: '18 Nov', sales: 1100 },
        { date: '19 Nov', sales: 1420 },
        { date: '20 Nov', sales: 1520 }
    ],
    '30d': [
        { date: '21 Out', sales: 850 },
        { date: '24 Out', sales: 920 },
        { date: '27 Out', sales: 1100 },
        { date: '30 Out', sales: 980 },
        { date: '02 Nov', sales: 1050 },
        { date: '05 Nov', sales: 1200 },
        { date: '08 Nov', sales: 1150 },
        { date: '11 Nov', sales: 1300 },
        { date: '14 Nov', sales: 920 },
        { date: '17 Nov', sales: 1340 },
        { date: '20 Nov', sales: 1520 }
    ],
    '3m': [
        { date: 'Ago', sales: 18500 },
        { date: 'Set', sales: 22000 },
        { date: 'Out', sales: 24500 },
        { date: 'Nov', sales: 27000 }
    ],
    '12m': [
        { date: 'Jan', sales: 15000 },
        { date: 'Fev', sales: 14500 },
        { date: 'Mar', sales: 16800 },
        { date: 'Abr', sales: 17200 },
        { date: 'Mai', sales: 18900 },
        { date: 'Jun', sales: 19500 },
        { date: 'Jul', sales: 17800 },
        { date: 'Ago', sales: 18500 },
        { date: 'Set', sales: 22000 },
        { date: 'Out', sales: 24500 },
        { date: 'Nov', sales: 27000 },
        { date: 'Dez', sales: 0 }
    ]
};

export interface Alert {
    id: number;
    type: 'price_increase' | 'low_margin' | 'no_sales' | 'no_purchases';
    severity: 'high' | 'warning' | 'info';
    item: string;
    message: string;
    date: string;
}

export const mockAlerts: Alert[] = [
    {
        id: 1,
        type: 'price_increase',
        severity: 'high',
        item: 'Batata Rena',
        message: 'Preço unitário 15% acima da média das últimas 3 compras',
        date: '2025-11-20T10:30:00'
    },
    {
        id: 2,
        type: 'low_margin',
        severity: 'warning',
        item: 'Pure de batata',
        message: 'Margem inferior a 40% (atual: 35%)',
        date: '2025-11-20T09:15:00'
    },
    {
        id: 3,
        type: 'price_increase',
        severity: 'high',
        item: 'Tomate Cherry',
        message: 'Preço unitário 22% acima da média',
        date: '2025-11-20T08:45:00'
    },
    {
        id: 4,
        type: 'no_sales',
        severity: 'warning',
        item: 'Sistema',
        message: 'Sem registo de vendas há 7 dias',
        date: '2025-11-19T15:00:00'
    },
    {
        id: 5,
        type: 'low_margin',
        severity: 'warning',
        item: 'Sopa do Dia',
        message: 'Margem de apenas 28%',
        date: '2025-11-19T12:30:00'
    },
    {
        id: 6,
        type: 'no_purchases',
        severity: 'info',
        item: 'Sistema',
        message: 'Sem registo de compras há 6 dias',
        date: '2025-11-18T10:00:00'
    }
];

export interface TopRecipe {
    id: number;
    nome: string;
    imagem_url: string;
    vendas: number;
    faturacao: number;
    tipo: string;
}

export const mockTopRecipes: TopRecipe[] = [
    {
        id: 2,
        nome: 'Pure de batata',
        imagem_url: 'https://assets.tmecosys.com/image/upload/t_web_rdp_recipe_584x480/img/recipe/ras/Assets/391ECECB-6CB0-4813-A7FA-28910DDEC0AE/Derivates/AE7EA31D-B070-4AE3-8F33-13D4D7F8E403.jpg',
        vendas: 145,
        faturacao: 1234.50,
        tipo: 'Pre-preparo'
    },
    {
        id: 3,
        nome: 'Bacalhau à Brás',
        imagem_url: 'https://www.receitasdecomida.com.br/wp-content/uploads/2021/03/bacalhau-a-bras.jpg',
        vendas: 132,
        faturacao: 2376.00,
        tipo: 'Final'
    },
    {
        id: 4,
        nome: 'Francesinha',
        imagem_url: 'https://www.receitasdecomida.com.br/wp-content/uploads/2020/05/francesinha.jpg',
        vendas: 98,
        faturacao: 1470.00,
        tipo: 'Final'
    },
    {
        id: 5,
        nome: 'Cozido à Portuguesa',
        imagem_url: 'https://www.teleculinaria.pt/wp-content/uploads/2018/01/Cozido-a-portuguesa-CHPS-6.jpg',
        vendas: 87,
        faturacao: 1218.00,
        tipo: 'Final'
    },
    {
        id: 6,
        nome: 'Arroz de Marisco',
        imagem_url: 'https://www.receitasdecomida.com.br/wp-content/uploads/2019/11/arroz-de-marisco.jpg',
        vendas: 76,
        faturacao: 1596.00,
        tipo: 'Final'
    }
];
