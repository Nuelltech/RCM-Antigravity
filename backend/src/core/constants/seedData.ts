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
