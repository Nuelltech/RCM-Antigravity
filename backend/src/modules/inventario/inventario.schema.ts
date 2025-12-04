import { z } from 'zod';

export const createSessionSchema = z.object({
    tipo: z.enum(['Total', 'Calculadora', 'Personalizado']),
    nome: z.string().optional(),
    filtros: z.object({
        familia_id: z.number().optional(),
        subfamilia_id: z.number().optional(),
        localizacao_id: z.number().optional(),
        lista_calculadora_id: z.number().optional(),
    }).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateItemSchema = z.object({
    quantidade: z.number(),
    localizacao_id: z.number().optional(),
    variacao_id: z.number().optional(),
    observacoes: z.string().optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const createLocationSchema = z.object({
    nome: z.string().min(1),
    descricao: z.string().optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const saveCalculatorListSchema = z.object({
    nome: z.string().min(1),
    itens: z.array(z.object({
        tipo: z.enum(['receita', 'combo', 'produto']), // Calculator usually has recipes/combos, but inventory counts products. 
        // Wait, calculator output is ingredients (products). 
        // If the user saves the "Shopping List" (ingredients needed), that's products.
        // If they save the "Simulation" (dishes to make), that's recipes.
        // The requirement says: "Calculadora, vai carregar as listas de produtos geradas pela calculadora"
        // So it's the resulting list of ingredients (products).
        id: z.number(), // Product ID
        quantidade: z.number(),
    })),
});

export type SaveCalculatorListInput = z.infer<typeof saveCalculatorListSchema>;
