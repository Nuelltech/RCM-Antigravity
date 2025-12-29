import { z } from 'zod';

export const createLeadSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
    email: z.string().email('Email inválido'),
    business_type: z.enum(['restaurante_independente', 'restaurante_fine_dining', 'hotel', 'grupo_cadeia']),
    source_page: z.string().optional().default('landing'),
    source_cta: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
});

export const createDemoRequestSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
    email: z.string().email('Email inválido'),
    restaurant: z.string().min(2, 'Nome do restaurante é obrigatório').max(200),
    locations: z.enum(['1', '2-5', '+5']),
    challenge: z.enum(['margens', 'compras', 'precos', 'falta_controlo']),
    lead_id: z.number().optional(), // Link to original lead if exists
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type CreateDemoRequestDto = z.infer<typeof createDemoRequestSchema>;

// ========================================================================
// INTERNAL TEAM SCHEMAS (Phase 3)
// ========================================================================

export const leadFiltersSchema = z.object({
    status: z.string().optional(),
    source: z.enum(['landing', 'demo']).optional(),
    dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
    dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
    search: z.string().optional(),
    assignedTo: z.coerce.number().optional(),
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const updateLeadStatusSchema = z.object({
    status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'demo_scheduled', 'won', 'lost', 'rejected']),
    notes: z.string().optional(),
});

export const assignLeadSchema = z.object({
    userId: z.number(),
});

export const leadStatsQuerySchema = z.object({
    dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
    dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export type LeadFiltersDto = z.infer<typeof leadFiltersSchema>;
export type UpdateLeadStatusDto = z.infer<typeof updateLeadStatusSchema>;
export type AssignLeadDto = z.infer<typeof assignLeadSchema>;
export type LeadStatsQueryDto = z.infer<typeof leadStatsQuerySchema>;
