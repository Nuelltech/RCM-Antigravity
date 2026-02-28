import { FastifyInstance } from 'fastify';
import { PrismaClient, InternalUser } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CreateInternalUserInput, UpdateInternalUserInput } from './internal-users.schema';

const prisma = new PrismaClient();

export class InternalUsersService {
    constructor(private app: FastifyInstance) { }

    async list(params: { page: number; limit: number; search?: string; role?: string; active?: string }) {
        const skip = (params.page - 1) * params.limit;
        const where: any = {};

        if (params.search) {
            where.OR = [
                { name: { contains: params.search } },
                { email: { contains: params.search } },
            ];
        }

        if (params.role) {
            where.role = params.role;
        }

        if (params.active) {
            where.active = params.active === 'true';
        }

        const [users, total] = await Promise.all([
            prisma.internalUser.findMany({
                where,
                skip,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    uuid: true,
                    email: true,
                    name: true,
                    role: true,
                    active: true,
                    email_verified: true,
                    last_login_at: true,
                    createdAt: true,
                    internalRole: {
                        select: {
                            id: true,
                            name: true,
                            description: true
                        }
                    },
                    permissions: true
                }
            }),
            prisma.internalUser.count({ where })
        ]);

        return {
            data: users,
            meta: {
                total,
                page: params.page,
                limit: params.limit,
                pages: Math.ceil(total / params.limit)
            }
        };
    }

    async getById(id: number) {
        const user = await prisma.internalUser.findUnique({
            where: { id },
            select: {
                id: true,
                uuid: true,
                email: true,
                name: true,
                role: true,
                active: true,
                email_verified: true,
                last_login_at: true,
                createdAt: true,
                internalRole: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                },
                permissions: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    async create(data: CreateInternalUserInput) {
        // Check email uniqueness
        const existing = await prisma.internalUser.findUnique({
            where: { email: data.email }
        });

        if (existing) {
            throw new Error('Email already in use');
        }

        // Look up role ID
        const role = await prisma.internalRole.findUnique({
            where: { name: data.role.toUpperCase() }
        });

        if (!role) {
            throw new Error('Role inválido');
        }

        const password_hash = await bcrypt.hash(data.password, 10);

        const user = await prisma.internalUser.create({
            data: {
                email: data.email,
                name: data.name,
                role: data.role.toUpperCase(), // Keeping deprecated field for now to avoid breaking other things
                internal_role_id: role.id,
                password_hash,
                active: data.active ?? true,
                email_verified: true,
            }
        });

        const { password_hash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async update(id: number, data: UpdateInternalUserInput) {
        const user = await prisma.internalUser.findUnique({ where: { id } });
        if (!user) throw new Error('User not found');

        if (data.email && data.email !== user.email) {
            const existing = await prisma.internalUser.findUnique({ where: { email: data.email } });
            if (existing) throw new Error('Email already in use');
        }

        let roleId = user.internal_role_id;
        if (data.role) {
            const role = await prisma.internalRole.findUnique({
                where: { name: data.role.toUpperCase() }
            });
            if (!role) {
                throw new Error('Role inválido');
            }
            roleId = role.id;
        }

        const updated = await prisma.internalUser.update({
            where: { id },
            data: {
                ...data, // email, name, active
                role: data.role ? data.role.toUpperCase() : undefined, // Keep sync
                internal_role_id: roleId,
            }
        });

        const { password_hash: _, ...userWithoutPassword } = updated;
        return userWithoutPassword;
    }

    async delete(id: number) {
        // We might want to just deactivate instead of deleting to preserve history
        // But for "delete" endpoint, let's implement soft delete (set active = false) or hard delete if really requested
        // Let's do Soft Delete by default via update, but if this is EXPLICIT delete, usually it means hard delete.
        // However, Prisma constraints might fail if there are relations (logs, chats).
        // Let's try hard delete but catch error.

        try {
            await prisma.internalUser.delete({ where: { id } });
            return { success: true };
        } catch (error) {
            // Fallback to deactivation? Or just let it fail -> user should deactivate instead.
            // Actually, for consistency, let's make DELETE endpoint deactivate the user? 
            // No, standard REST DELETE means remove. If we want deactivate, use PATCH active=false.
            throw error;
        }
    }

    async adminResetPassword(id: number, password: string) {
        const password_hash = await bcrypt.hash(password, 10);
        await prisma.internalUser.update({
            where: { id },
            data: { password_hash }
        });
        return { success: true };
    }
}
