import { z } from 'zod';
import { internalUserResponseSchema } from '../internal-auth/internal-auth.schema';

// Helper for pagination
const paginationSchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('20').transform(Number),
    search: z.string().optional(),
    role: z.string().optional(),
    active: z.enum(['true', 'false']).optional(),
});

// Create User
export const createInternalUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.string(), // Validated against enum in service
    password: z.string().min(8),
    active: z.boolean().optional().default(true),
});

// Update User
export const updateInternalUserSchema = z.object({
    name: z.string().min(2).optional(),
    role: z.string().optional(),
    active: z.boolean().optional(),
    email: z.string().email().optional(), // Be careful with email updates
});

// Reset Password (Admin force)
export const adminResetPasswordSchema = z.object({
    password: z.string().min(8),
});

// Routes Inputs
export const listUsersQuerySchema = paginationSchema;
export const userIdParamSchema = z.object({
    id: z.string().transform(Number),
});

// Responses
export const internalUserListResponseSchema = z.object({
    data: z.array(internalUserResponseSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        pages: z.number(),
    }),
});

export type CreateInternalUserInput = z.infer<typeof createInternalUserSchema>;
export type UpdateInternalUserInput = z.infer<typeof updateInternalUserSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
