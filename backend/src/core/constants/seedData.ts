export const DEFAULT_FAMILIES = [
    { codigo: 'CAR', nome: 'Carnes' },
    { codigo: 'PEI', nome: 'Peixes e Mariscos' },
    { codigo: 'LEG', nome: 'Legumes e Verduras' },
    { codigo: 'FRU', nome: 'Frutas' },
    { codigo: 'MER', nome: 'Mercearia Seca' },
    { codigo: 'TEM', nome: 'Temperos e Condimentos' },
    { codigo: 'LAT', nome: 'Laticínios e Ovos' },
    { codigo: 'OLE', nome: 'Óleos e Gorduras' },
    { codigo: 'ENL', nome: 'Enlatados e Conservas' },
    { codigo: 'PAD', nome: 'Padaria e Pastelaria' },
    { codigo: 'PRE', nome: 'Pré-preparados de Cozinha' },
    { codigo: 'DIV', nome: 'Diversos' },
];

export const DEFAULT_SUBFAMILIES = [
    // CAR
    { codigo: 'POR', nome: 'Porco', familia_codigo: 'CAR' },
    { codigo: 'VIT', nome: 'Vitela', familia_codigo: 'CAR' },
    { codigo: 'AVE', nome: 'Aves e Outras Carnes', familia_codigo: 'CAR' },
    { codigo: 'CHA', nome: 'Enchidos e Charcutaria', familia_codigo: 'CAR' },
    // PEI
    { codigo: 'PEI', nome: 'Peixes', familia_codigo: 'PEI' },
    { codigo: 'BAC', nome: 'Bacalhau', familia_codigo: 'PEI' },
    { codigo: 'MAR', nome: 'Mariscos e Moluscos', familia_codigo: 'PEI' },
    // LEG
    { codigo: 'VER', nome: 'Frescos', familia_codigo: 'LEG' },
    { codigo: 'CON', nome: 'Congelados', familia_codigo: 'LEG' },
    // FRU
    { codigo: 'FRF', nome: 'Frutas Frescas', familia_codigo: 'FRU' },
    { codigo: 'FRE', nome: 'Frutas Enlatadas', familia_codigo: 'FRU' },
    // MER
    { codigo: 'ARZ', nome: 'Arroz', familia_codigo: 'MER' },
    { codigo: 'MAS', nome: 'Massas', familia_codigo: 'MER' },
    { codigo: 'FAR', nome: 'Farinhas e Amidos', familia_codigo: 'MER' },
    { codigo: 'LEG', nome: 'Leguminosas e Grãos', familia_codigo: 'MER' },
    { codigo: 'DOC', nome: 'Açúcares e Doces Secos', familia_codigo: 'MER' },
    // TEM
    { codigo: 'TSE', nome: 'Temperos Secos', familia_codigo: 'TEM' },
    { codigo: 'MOL', nome: 'Molhos e Caldos Industriais', familia_codigo: 'TEM' },
    // LAT
    { codigo: 'LEI', nome: 'Leites e Natas', familia_codigo: 'LAT' },
    { codigo: 'QUE', nome: 'Queijos e Derivados', familia_codigo: 'LAT' },
    { codigo: 'MAN', nome: 'Manteigas e Gorduras Animais', familia_codigo: 'LAT' },
    { codigo: 'OVO', nome: 'Ovos', familia_codigo: 'LAT' },
    // OLE
    { codigo: 'AZE', nome: 'Azeites', familia_codigo: 'OLE' },
    { codigo: 'OLI', nome: 'Óleos Vegetais', familia_codigo: 'OLE' },
    // ENL
    { codigo: 'PAT', nome: 'Peixes e Patés', familia_codigo: 'ENL' },
    { codigo: 'ENC', nome: 'Legumes e Outros Enlatados', familia_codigo: 'ENL' },
    // PAD
    { codigo: 'PAN', nome: 'Pães e Derivados', familia_codigo: 'PAD' },
    { codigo: 'SOB', nome: 'Sobremesas e Bolos', familia_codigo: 'PAD' },
    // PRE
    { codigo: 'PMO', nome: 'Molhos e Reduções', familia_codigo: 'PRE' },
    { codigo: 'PCA', nome: 'Caldos e Fundos', familia_codigo: 'PRE' },
    { codigo: 'PMA', nome: 'Marinadas e Temperos Prontos', familia_codigo: 'PRE' },
    { codigo: 'PCR', nome: 'Cremes, Purés e Sopas Base', familia_codigo: 'PRE' },
    { codigo: 'PSE', nome: 'Semi-acabados (bases, recheios, etc.)', familia_codigo: 'PRE' },
    { codigo: 'PSO', nome: 'Sobremesas Base', familia_codigo: 'PRE' },
    // DIV
    { codigo: 'OUT', nome: 'Diversos', familia_codigo: 'DIV' },
];

export const DEFAULT_PRODUCTS = [
    // Carnes -> Porco (POR)
    { nome: 'Lombo de Porco', subfamilia_codigo: 'POR', unidade: 'KG' as const, preco_compra: 5.50 },
    { nome: 'Costeletas de Porco', subfamilia_codigo: 'POR', unidade: 'KG' as const, preco_compra: 4.80 },
    { nome: 'Entremeada', subfamilia_codigo: 'POR', unidade: 'KG' as const, preco_compra: 3.90 },
    { nome: 'Perna de Porco', subfamilia_codigo: 'POR', unidade: 'KG' as const, preco_compra: 3.50 },
    { nome: 'Bacon Fatiado', subfamilia_codigo: 'CHA', unidade: 'KG' as const, preco_compra: 8.90 },
    { nome: 'Fiambre da Perna', subfamilia_codigo: 'CHA', unidade: 'KG' as const, preco_compra: 7.50 },
    { nome: 'Chouriço de Carne', subfamilia_codigo: 'CHA', unidade: 'KG' as const, preco_compra: 9.20 },
    { nome: 'Presunto Fatiado', subfamilia_codigo: 'CHA', unidade: 'KG' as const, preco_compra: 14.50 },

    // Carnes -> Vitela (VIT)
    { nome: 'Vazia de Novilho', subfamilia_codigo: 'VIT', unidade: 'KG' as const, preco_compra: 16.50 },
    { nome: 'Lombo de Novilho', subfamilia_codigo: 'VIT', unidade: 'KG' as const, preco_compra: 22.00 },
    { nome: 'Carne Picada', subfamilia_codigo: 'VIT', unidade: 'KG' as const, preco_compra: 6.50 },
    { nome: 'Hambúrguer Novilho 180g', subfamilia_codigo: 'VIT', unidade: 'Unidade' as const, preco_compra: 1.20 },
    { nome: 'Bife da Vazia', subfamilia_codigo: 'VIT', unidade: 'KG' as const, preco_compra: 17.00 },

    // Carnes -> Aves (AVE)
    { nome: 'Peito de Frango', subfamilia_codigo: 'AVE', unidade: 'KG' as const, preco_compra: 5.90 },
    { nome: 'Perna de Frango', subfamilia_codigo: 'AVE', unidade: 'KG' as const, preco_compra: 2.50 },
    { nome: 'Frango Inteiro', subfamilia_codigo: 'AVE', unidade: 'KG' as const, preco_compra: 2.20 },
    { nome: 'Pato Inteiro', subfamilia_codigo: 'AVE', unidade: 'KG' as const, preco_compra: 4.50 },
    { nome: 'Peito de Pato (Magret)', subfamilia_codigo: 'AVE', unidade: 'KG' as const, preco_compra: 12.50 },

    // Peixes -> Peixes (PEI)
    { nome: 'Salmão Fresco', subfamilia_codigo: 'PEI', unidade: 'KG' as const, preco_compra: 11.50 },
    { nome: 'Dourada 400-600g', subfamilia_codigo: 'PEI', unidade: 'KG' as const, preco_compra: 7.90 },
    { nome: 'Robalo 400-600g', subfamilia_codigo: 'PEI', unidade: 'KG' as const, preco_compra: 8.50 },
    { nome: 'Lombo de Bacalhau', subfamilia_codigo: 'BAC', unidade: 'KG' as const, preco_compra: 14.90 },
    { nome: 'Bacalhau Desfiado', subfamilia_codigo: 'BAC', unidade: 'KG' as const, preco_compra: 9.50 },
    { nome: 'Atum Fresco', subfamilia_codigo: 'PEI', unidade: 'KG' as const, preco_compra: 18.00 },

    // Peixes -> Mariscos (MAR)
    { nome: 'Miolo de Camarão 80/100', subfamilia_codigo: 'MAR', unidade: 'KG' as const, preco_compra: 12.50 },
    { nome: 'Camarão Tigre 20/30', subfamilia_codigo: 'MAR', unidade: 'KG' as const, preco_compra: 24.00 },
    { nome: 'Amêijoa Vietnamita', subfamilia_codigo: 'MAR', unidade: 'KG' as const, preco_compra: 4.50 },
    { nome: 'Polvo Limpo 2-3kg', subfamilia_codigo: 'MAR', unidade: 'KG' as const, preco_compra: 13.50 },
    { nome: 'Lula Limpa', subfamilia_codigo: 'MAR', unidade: 'KG' as const, preco_compra: 8.90 },

    // Legumes -> Frescos (VER)
    { nome: 'Batata Conserva', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 0.80 },
    { nome: 'Batata Doce', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.20 },
    { nome: 'Batata Fritar', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 0.70 },
    { nome: 'Cebola', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 0.60 },
    { nome: 'Cebola Roxa', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.10 },
    { nome: 'Alho Seco', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 3.50 },
    { nome: 'Tomate Rama', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.40 },
    { nome: 'Tomate Cherry', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 2.50 },
    { nome: 'Alface Iceberg', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.10 },
    { nome: 'Rúcula Selvagem', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 6.50 },
    { nome: 'Cenoura', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 0.70 },
    { nome: 'Courgette', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.30 },
    { nome: 'Beringela', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.40 },
    { nome: 'Pimento Vermelho', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 2.20 },
    { nome: 'Pimento Verde', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.90 },
    { nome: 'Cogumelos Paris', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 3.20 },
    { nome: 'Espinafres Frescos', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 4.50 },
    { nome: 'Brócolos', subfamilia_codigo: 'VER', unidade: 'KG' as const, preco_compra: 1.80 },

    // Legumes -> Congelados (CON)
    { nome: 'Batata Pré-Frita', subfamilia_codigo: 'CON', unidade: 'KG' as const, preco_compra: 1.50 },
    { nome: 'Ervilhas Congeladas', subfamilia_codigo: 'CON', unidade: 'KG' as const, preco_compra: 1.80 },
    { nome: 'Feijão Verde Congelado', subfamilia_codigo: 'CON', unidade: 'KG' as const, preco_compra: 1.60 },

    // Frutas -> Frescas (FRF)
    { nome: 'Limão', subfamilia_codigo: 'FRF', unidade: 'KG' as const, preco_compra: 1.20 },
    { nome: 'Laranja', subfamilia_codigo: 'FRF', unidade: 'KG' as const, preco_compra: 0.90 },
    { nome: 'Lima', subfamilia_codigo: 'FRF', unidade: 'KG' as const, preco_compra: 2.50 },
    { nome: 'Morangos', subfamilia_codigo: 'FRF', unidade: 'KG' as const, preco_compra: 4.50 },
    { nome: 'Ananás', subfamilia_codigo: 'FRF', unidade: 'KG' as const, preco_compra: 1.50 },
    { nome: 'Melão', subfamilia_codigo: 'FRF', unidade: 'KG' as const, preco_compra: 0.95 },
    { nome: 'Maçã Golden', subfamilia_codigo: 'FRF', unidade: 'KG' as const, preco_compra: 1.10 },

    // Mercearia -> Arroz/Massas/Farinhas (MER)
    { nome: 'Arroz Agulha', subfamilia_codigo: 'ARZ', unidade: 'KG' as const, preco_compra: 0.95 },
    { nome: 'Arroz Carolino', subfamilia_codigo: 'ARZ', unidade: 'KG' as const, preco_compra: 1.05 },
    { nome: 'Arroz Basmati', subfamilia_codigo: 'ARZ', unidade: 'KG' as const, preco_compra: 1.80 },
    { nome: 'Arroz de Risotto (Arborio)', subfamilia_codigo: 'ARZ', unidade: 'KG' as const, preco_compra: 2.20 },
    { nome: 'Esparguete', subfamilia_codigo: 'MAS', unidade: 'KG' as const, preco_compra: 1.10 },
    { nome: 'Massa Fusilli', subfamilia_codigo: 'MAS', unidade: 'KG' as const, preco_compra: 1.10 },
    { nome: 'Massa Penne', subfamilia_codigo: 'MAS', unidade: 'KG' as const, preco_compra: 1.10 },
    { nome: 'Massa Tagliatelle', subfamilia_codigo: 'MAS', unidade: 'KG' as const, preco_compra: 1.50 },
    { nome: 'Farinha Trigo T55', subfamilia_codigo: 'FAR', unidade: 'KG' as const, preco_compra: 0.65 },
    { nome: 'Farinha Trigo T65', subfamilia_codigo: 'FAR', unidade: 'KG' as const, preco_compra: 0.75 },
    { nome: 'Amido de Milho (Maizena)', subfamilia_codigo: 'FAR', unidade: 'KG' as const, preco_compra: 2.50 },
    { nome: 'Feijão Preto Seco', subfamilia_codigo: 'LEG', unidade: 'KG' as const, preco_compra: 1.80 },
    { nome: 'Grão de Bico Seco', subfamilia_codigo: 'LEG', unidade: 'KG' as const, preco_compra: 1.90 },
    { nome: 'Açúcar Branco', subfamilia_codigo: 'DOC', unidade: 'KG' as const, preco_compra: 0.95 },
    { nome: 'Açúcar Mascavado', subfamilia_codigo: 'DOC', unidade: 'KG' as const, preco_compra: 1.50 },
    { nome: 'Chocolate Culinária 70%', subfamilia_codigo: 'DOC', unidade: 'KG' as const, preco_compra: 8.50 },

    // Temperos -> Secos/Molhos (TEM)
    { nome: 'Sal Fino', subfamilia_codigo: 'TSE', unidade: 'KG' as const, preco_compra: 0.25 },
    { nome: 'Sal Grosso', subfamilia_codigo: 'TSE', unidade: 'KG' as const, preco_compra: 0.20 },
    { nome: 'Flor de Sal', subfamilia_codigo: 'TSE', unidade: 'KG' as const, preco_compra: 12.00 },
    { nome: 'Pimenta Preta Grão', subfamilia_codigo: 'TSE', unidade: 'KG' as const, preco_compra: 15.00 },
    { nome: 'Pimentão Doce', subfamilia_codigo: 'TSE', unidade: 'KG' as const, preco_compra: 8.00 },
    { nome: 'Orégãos Secos', subfamilia_codigo: 'TSE', unidade: 'KG' as const, preco_compra: 12.00 },
    { nome: 'Louro Folha', subfamilia_codigo: 'TSE', unidade: 'KG' as const, preco_compra: 18.00 },
    { nome: 'Maionese Balde', subfamilia_codigo: 'MOL', unidade: 'L' as const, preco_compra: 2.50 },
    { nome: 'Ketchup', subfamilia_codigo: 'MOL', unidade: 'L' as const, preco_compra: 2.20 },
    { nome: 'Mostarda Dijon', subfamilia_codigo: 'MOL', unidade: 'KG' as const, preco_compra: 4.50 },
    { nome: 'Vinagre Vinho Branco', subfamilia_codigo: 'MOL', unidade: 'L' as const, preco_compra: 0.80 },
    { nome: 'Vinagre Balsâmico', subfamilia_codigo: 'MOL', unidade: 'L' as const, preco_compra: 3.50 },
    { nome: 'Polpa de Tomate', subfamilia_codigo: 'MOL', unidade: 'KG' as const, preco_compra: 1.20 },

    // Laticinios (LAT)
    { nome: 'Leite Meio Gordo', subfamilia_codigo: 'LEI', unidade: 'L' as const, preco_compra: 0.75 },
    { nome: 'Natas Culinária', subfamilia_codigo: 'LEI', unidade: 'L' as const, preco_compra: 2.20 },
    { nome: 'Natas para Bater', subfamilia_codigo: 'LEI', unidade: 'L' as const, preco_compra: 3.50 },
    { nome: 'Manteiga com Sal', subfamilia_codigo: 'MAN', unidade: 'KG' as const, preco_compra: 6.50 },
    { nome: 'Manteiga sem Sal', subfamilia_codigo: 'MAN', unidade: 'KG' as const, preco_compra: 7.00 },
    { nome: 'Queijo Flamengo Fatiado', subfamilia_codigo: 'QUE', unidade: 'KG' as const, preco_compra: 6.90 },
    { nome: 'Queijo Mozzarella Ralado', subfamilia_codigo: 'QUE', unidade: 'KG' as const, preco_compra: 5.90 },
    { nome: 'Queijo Parmesão', subfamilia_codigo: 'QUE', unidade: 'KG' as const, preco_compra: 14.00 },
    { nome: 'Ovos M', subfamilia_codigo: 'OVO', unidade: 'Unidade' as const, preco_compra: 0.15 },
    { nome: 'Ovos L', subfamilia_codigo: 'OVO', unidade: 'Unidade' as const, preco_compra: 0.18 },

    // Óleos e Gorduras (OLE)
    { nome: 'Azeite Virgem Extra', subfamilia_codigo: 'AZE', unidade: 'L' as const, preco_compra: 7.50 },
    { nome: 'Azeite Refinado', subfamilia_codigo: 'AZE', unidade: 'L' as const, preco_compra: 6.00 },
    { nome: 'Óleo Alimentar (Girassol)', subfamilia_codigo: 'OLI', unidade: 'L' as const, preco_compra: 1.50 },
    { nome: 'Óleo de Fritura', subfamilia_codigo: 'OLI', unidade: 'L' as const, preco_compra: 1.80 },

    // Enlatados (ENL)
    { nome: 'Atum em Conserva 1kg', subfamilia_codigo: 'PAT', unidade: 'KG' as const, preco_compra: 9.50 },
    { nome: 'Cogumelos Laminados Lata', subfamilia_codigo: 'ENC', unidade: 'KG' as const, preco_compra: 2.50 },
    { nome: 'Milho Doce Lata', subfamilia_codigo: 'ENC', unidade: 'KG' as const, preco_compra: 1.80 },
    { nome: 'Grão de Bico Lata', subfamilia_codigo: 'ENC', unidade: 'KG' as const, preco_compra: 1.50 },
    { nome: 'Feijão Manteiga Lata', subfamilia_codigo: 'ENC', unidade: 'KG' as const, preco_compra: 1.50 },

    // Padaria (PAD)
    { nome: 'Pão de Hambúrguer', subfamilia_codigo: 'PAN', unidade: 'Unidade' as const, preco_compra: 0.15 },
    { nome: 'Pão Ralado', subfamilia_codigo: 'PAN', unidade: 'KG' as const, preco_compra: 1.80 },

    // Diversos (OUT)
    { nome: 'Café Grão', subfamilia_codigo: 'OUT', unidade: 'KG' as const, preco_compra: 12.00 },
    { nome: 'Água Luso 1.5L', subfamilia_codigo: 'OUT', unidade: 'Unidade' as const, preco_compra: 0.45 },
    { nome: 'Água das Pedras 25cl', subfamilia_codigo: 'OUT', unidade: 'Unidade' as const, preco_compra: 0.55 },
    { nome: 'Sumo Laranja Natural', subfamilia_codigo: 'OUT', unidade: 'L' as const, preco_compra: 3.50 },
];
