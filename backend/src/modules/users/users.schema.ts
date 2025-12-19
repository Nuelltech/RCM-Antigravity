import z from 'zod';
import { ROLES } from '../../core/permissions';

/**
 * List users query parameters
 */
export const listUsersSchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.enum([ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR]).optional(),
    ativo: z.string().optional(),
});

/**
 * Invite user
 */
export const inviteUserSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    role: z.enum([ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR], {
        errorMap: () => ({ message: 'Role inválido' })
    }),
});

/**
 * Update user role
 */
export const updateRoleSchema = z.object({
    role: z.enum([ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR], {
        errorMap: () => ({ message: 'Role inválido' })
    }),
});

/**
 * Update user profile
 */
export const updateProfileSchema = z.object({
    nome: z.string().min(3).optional(),
    email: z.string().email().optional(),
});

/**
 * Change password
 */
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6, 'Password atual obrigatória'),
    newPassword: z.string().min(6, 'Nova password deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(6),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'As passwords não coincidem',
    path: ['confirmPassword'],
});

/**
 * Accept invite
 */
export const acceptInviteSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
});

// Type exports
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
