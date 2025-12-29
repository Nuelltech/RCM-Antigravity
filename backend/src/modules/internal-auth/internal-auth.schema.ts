import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Password deve ter no mínimo 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Response schemas
export const internalUserResponseSchema = z.object({
    id: z.number(),
    uuid: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    active: z.boolean(),
    email_verified: z.boolean(),
    last_login_at: z.string().nullable(),
    createdAt: z.string(),
});

export type InternalUserResponse = z.infer<typeof internalUserResponseSchema>;
