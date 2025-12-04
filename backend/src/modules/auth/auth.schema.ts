import z from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const registerSchema = z.object({
    nome_restaurante: z.string().min(3),
    nif: z.string().min(9), // Assuming PT NIF
    morada: z.string().min(5),
    nome_usuario: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    slug: z.string().optional(),
});

export const verifyEmailSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
    newPassword: z.string().min(6),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
