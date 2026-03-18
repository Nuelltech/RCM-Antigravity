import { z } from 'zod';

export const GlobalCatalogSearchQuery = z.object({
    q: z.string().min(2, "Mínimo 2 caracteres para pesquisa"),
    limit: z.number().int().min(1).max(50).optional().default(10)
});

export const GlobalCatalogInternalQuery = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export const GlobalCatalogStatusUpdateBody = z.object({
    status: z.enum(['APPROVED', 'REJECTED'])
});
