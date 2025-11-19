import z from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const registerSchema = z.object({
    nome_restaurante: z.string().min(3),
    nome_usuario: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    slug: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
