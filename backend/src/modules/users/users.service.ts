import bcrypt from 'bcryptjs';
import { prisma } from '../../core/database';
import crypto from 'crypto';
import type {
    InviteUserInput,
    UpdateRoleInput,
    UpdateProfileInput,
    ChangePasswordInput,
    AcceptInviteInput,
} from './users.schema';

export class UsersService {
    constructor(private tenantId: number) { }

    /**
     * List all users in the tenant via UserTenant relationships
     */
    async list(params: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        ativo?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 50;
        const skip = (page - 1) * limit;

        // Build where clause for UserTenant
        const where: any = {
            tenant_id: this.tenantId,
        };

        if (params.role) {
            where.role = params.role;
        }

        if (params.ativo !== undefined) {
            where.ativo = params.ativo === 'true';
        }

        // Add search filter on user data
        if (params.search) {
            where.user = {
                OR: [
                    { nome: { contains: params.search } },
                    { email: { contains: params.search } },
                ]
                ,
            };
        }

        const [total, userTenants] = await Promise.all([
            prisma.userTenant.count({ where }),
            prisma.userTenant.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            nome: true,
                            email: true,
                            email_verificado: true,
                            ultimo_login: true,
                            verification_code: true,
                            verification_code_expires_at: true,
                            createdAt: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // Transform to match frontend expectations
        const users = userTenants.map((ut) => ({
            id: ut.user.id,
            nome: ut.user.nome,
            email: ut.user.email,
            role: ut.role, // Role from UserTenant (tenant-specific)
            active: ut.ativo, // ✅ FIXED: Map ativo → active
            email_verified: ut.user.email_verificado, // ✅ FIXED: Map email_verificado → email_verified
            invite_token: ut.user.verification_code, // ✅ FIXED: Add invite_token
            invite_expires: ut.user.verification_code_expires_at, // ✅ FIXED: Add invite_expires
            last_login: ut.user.ultimo_login, // ✅ FIXED: Map ultimo_login → last_login
            created_at: ut.user.createdAt, // ✅ FIXED: Map createdAt → created_at
        }));

        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get user by ID (checks UserTenant relationship)
     */
    async getById(userId: number) {
        // First check if user exists and has UserTenant relationship with this tenant
        const userTenant = await prisma.userTenant.findUnique({
            where: {
                user_id_tenant_id: {
                    user_id: userId,
                    tenant_id: this.tenantId,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        email_verificado: true,
                        two_factor_enabled: true,
                        ultimo_login: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });

        if (!userTenant) {
            throw new Error('Utilizador não encontrado');
        }

        return {
            ...userTenant.user,
            role: userTenant.role,
            ativo: userTenant.ativo,
        };
    }

    /**
     * Invite a user (new or existing) to this tenant
     * - If email doesn't exist globally: create new user + UserTenant relation
     * - If email exists globally: just create UserTenant relation
     */
    async inviteUser(input: InviteUserInput, invitedBy: number) {
        // Check if user already exists globally (by email)
        let user = await prisma.user.findFirst({
            where: {
                email: input.email,
            },
        });

        // Check if user is already associated with this tenant
        if (user) {
            const existingRelation = await prisma.userTenant.findUnique({
                where: {
                    user_id_tenant_id: {
                        user_id: user.id,
                        tenant_id: this.tenantId,
                    },
                },
            });

            if (existingRelation) {
                throw new Error('Este utilizador já está associado a este restaurante');
            }
        }

        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // If user doesn't exist globally, create it
        if (!user) {
            user = await prisma.user.create({
                data: {
                    nome: input.nome,
                    email: input.email,
                    email_verificado: false,
                    verification_code: inviteToken,
                    verification_code_expires_at: tokenExpiry,
                },
            });
        } else {
            // User exists, update their verification token for this invitation
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    verification_code: inviteToken,
                    verification_code_expires_at: tokenExpiry,
                },
            });
        }

        // Create UserTenant relationship (inactive until user accepts)
        await prisma.userTenant.create({
            data: {
                user_id: user.id,
                tenant_id: this.tenantId,
                role: input.role,
                ativo: false, // Inactive until user accepts invite
                invited_by: invitedBy,
                invited_at: new Date(),
            },
        });

        // Send invite email
        try {
            const { sendUserInvite } = await import('../../core/email.service');
            const tenant = await prisma.tenant.findUnique({
                where: { id: this.tenantId },
            });

            if (tenant) {
                await sendUserInvite(
                    {
                        email: user.email,
                        name: user.nome,
                    },
                    tenant.nome_restaurante,
                    inviteToken
                );
            }
        } catch (error) {
            console.error('[EMAIL ERROR] Failed to send invite:', error);
            // Don't throw - relation was created, they can request a new invite
        }

        return {
            id: user.id,
            nome: user.nome,
            email: user.email,
            role: input.role,
            message: 'Convite enviado com sucesso',
        };
    }

    /**
     * Validate invite token and return user info
     */
    async validateInviteToken(token: string) {
        const user = await prisma.user.findFirst({
            where: {
                verification_code: token,
            },
        });

        if (!user) {
            throw new Error('Convite inválido ou expirado');
        }

        if (user.verification_code_expires_at && user.verification_code_expires_at < new Date()) {
            throw new Error('O convite expirou. Solicite um novo convite');
        }

        // Check if UserTenant relation exists for this tenant
        const userTenant = await prisma.userTenant.findUnique({
            where: {
                user_id_tenant_id: {
                    user_id: user.id,
                    tenant_id: this.tenantId,
                },
            },
            include: {
                tenant: {
                    select: {
                        nome_restaurante: true,
                        slug: true,
                    },
                },
            },
        });

        if (!userTenant) {
            throw new Error('Convite inválido para este restaurante');
        }

        // Check if user already has a password (existing user)
        const hasPassword = !!user.password_hash;

        return {
            valid: true,
            hasPassword, // true = existing user, false = new user
            userInfo: {
                nome: user.nome,
                email: user.email,
            },
            tenantInfo: {
                nome_restaurante: userTenant.tenant.nome_restaurante,
                slug: userTenant.tenant.slug,
                role: userTenant.role,
            },
        };
    }

    /**
     * Accept invite and activate UserTenant relationship
     */
    async acceptInvite(input: AcceptInviteInput) {
        const user = await prisma.user.findFirst({
            where: {
                verification_code: input.token,
            },
        });

        if (!user) {
            throw new Error('Convite inválido ou expirado');
        }

        if (user.verification_code_expires_at && user.verification_code_expires_at < new Date()) {
            throw new Error('O convite expirou. Solicite um novo convite');
        }

        // Check if UserTenant relation exists for this tenant
        const userTenant = await prisma.userTenant.findUnique({
            where: {
                user_id_tenant_id: {
                    user_id: user.id,
                    tenant_id: this.tenantId,
                },
            },
        });

        if (!userTenant) {
            throw new Error('Convite inválido para este restaurante');
        }

        // Prepare user update data
        const userUpdateData: any = {
            email_verificado: true,
            verification_code: null,
            verification_code_expires_at: null,
        };

        // Only update password if provided (for new users or if user wants to change)
        if (input.password) {
            const hashedPassword = await bcrypt.hash(input.password, 10);
            userUpdateData.password_hash = hashedPassword;
        } else if (!user.password_hash) {
            throw new Error('Deve definir uma password para ativar a sua conta');
        }

        // Update user and activate UserTenant relationship
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: userUpdateData,
            }),
            prisma.userTenant.update({
                where: {
                    user_id_tenant_id: {
                        user_id: user.id,
                        tenant_id: this.tenantId,
                    },
                },
                data: {
                    ativo: true,
                    activated_at: new Date(),
                },
            }),
        ]);

        return {
            message: 'Conta ativada com sucesso. Pode fazer login agora.',
        };
    }

    /**
     * Update user role (Admin only)
     */
    async updateRole(userId: number, input: UpdateRoleInput) {
        // Update role in UserTenant, not in User
        await prisma.userTenant.update({
            where: {
                user_id_tenant_id: {
                    user_id: userId,
                    tenant_id: this.tenantId,
                },
            },
            data: { role: input.role },
        });

        return {
            message: 'Role atualizada com sucesso',
        };
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: number, input: UpdateProfileInput) {
        const user = await this.getById(userId);

        // If email is being changed, check if it's already in use
        if (input.email && input.email !== user.email) {
            const existing = await prisma.user.findFirst({
                where: {
                    email: input.email,
                    id: { not: userId },
                },
            });

            if (existing) {
                throw new Error('Este email já está em uso');
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(input.nome && { nome: input.nome }),
                ...(input.email && { email: input.email, email_verificado: false }),
            },
            select: {
                id: true,
                nome: true,
                email: true,
                email_verificado: true,
            },
        });

        return updated;
    }

    /**
     * Change password
     */
    async changePassword(userId: number, input: ChangePasswordInput) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('Utilizador não encontrado');
        }

        if (!user.password_hash) {
            throw new Error('Utilizador não tem password definida');
        }

        // Verify current password
        const valid = await bcrypt.compare(input.currentPassword, user.password_hash!);
        if (!valid) {
            throw new Error('Password atual incorreta');
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password_hash: hashedPassword },
        });

        return {
            message: 'Password alterada com sucesso',
        };
    }

    /**
     * Deactivate user (soft delete)
     */
    async deactivate(userId: number, deactivatedBy: number) {
        // Prevent user from deactivating themselves
        if (userId === deactivatedBy) {
            throw new Error('Não pode desativar a sua própria conta');
        }

        // Check if this is the last active user in the tenant
        const activeUsers = await prisma.userTenant.count({
            where: {
                tenant_id: this.tenantId,
                ativo: true,
            },
        });

        if (activeUsers === 1) {
            const lastUser = await prisma.userTenant.findFirst({
                where: {
                    tenant_id: this.tenantId,
                    ativo: true,
                },
            });
            if (lastUser && lastUser.user_id === userId) {
                throw new Error('Não pode remover o último utilizador ativo do restaurante');
            }
        }

        await prisma.userTenant.update({
            where: {
                user_id_tenant_id: {
                    user_id: userId,
                    tenant_id: this.tenantId,
                },
            },
            data: { ativo: false },
        });

        return {
            message: 'Utilizador desativado com sucesso',
        };
    }

    /**
     * Reactivate user
     */
    async reactivateUser(userId: number) {
        await prisma.userTenant.update({
            where: {
                user_id_tenant_id: {
                    user_id: userId,
                    tenant_id: this.tenantId,
                },
            },
            data: { ativo: true },
        });

        return {
            message: 'Utilizador reativado com sucesso',
        };
    }

    /**
     * Permanently delete user (hard delete)
     * WARNING: This action cannot be undone
     */
    async permanentDeleteUser(userId: number, deletedBy: number) {
        // Prevent user from deleting themselves
        if (userId === deletedBy) {
            throw new Error('Não pode remover a sua própria conta');
        }

        const userTenant = await prisma.userTenant.findUnique({
            where: {
                user_id_tenant_id: {
                    user_id: userId,
                    tenant_id: this.tenantId,
                },
            },
        });

        if (!userTenant) {
            throw new Error('Utilizador não encontrado');
        }

        // Only allow deletion of inactive users
        if (userTenant.ativo) {
            throw new Error('Apenas utilizadores inativos podem ser removidos permanentemente. Desative primeiro.');
        }

        // Hard delete from database
        await prisma.user.delete({
            where: {
                id: userId,
            },
        });

        return {
            message: 'Utilizador removido permanentemente',
        };
    }

    /**
     * Resend invite
     */
    async resendInvite(userId: number) {
        const user = await this.getById(userId);

        // In multi-tenant, check if UserTenant is already active (not just email verified)
        if (user.ativo) {
            throw new Error('Este utilizador já aceitou o convite');
        }

        // Generate new invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { id: userId },
            data: {
                verification_code: inviteToken,
                verification_code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        // Send email
        try {
            const { sendUserInvite } = await import('../../core/email.service');
            const tenant = await prisma.tenant.findUnique({
                where: { id: this.tenantId },
            });

            if (tenant) {
                await sendUserInvite(
                    {
                        email: user.email,
                        name: user.nome,
                    },
                    tenant.nome_restaurante,
                    inviteToken
                );
            }
        } catch (error) {
            console.error('[EMAIL ERROR] Failed to resend invite:', error);
            throw new Error('Erro ao enviar convite. Tente novamente mais tarde.');
        }

        return {
            message: 'Convite reenviado com sucesso',
        };
    }
}
