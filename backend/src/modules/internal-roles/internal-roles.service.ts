import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CreateInternalRoleInput, UpdateInternalRoleInput } from './internal-roles.schema';

const prisma = new PrismaClient();

export class InternalRolesService {
    constructor(private app: FastifyInstance) { }

    async list(params: { page: number; limit: number; search?: string }) {
        const skip = (params.page - 1) * params.limit;
        const where: any = {};

        if (params.search) {
            where.name = { contains: params.search, mode: 'insensitive' };
        }

        const [roles, total] = await Promise.all([
            prisma.internalRole.findMany({
                where,
                skip,
                take: params.limit,
                include: {
                    permissions: {
                        include: {
                            permission: true
                        }
                    },
                    _count: {
                        select: { users: true }
                    }
                },
                orderBy: { name: 'asc' }
            }),
            prisma.internalRole.count({ where })
        ]);

        return {
            data: roles,
            meta: {
                total,
                page: params.page,
                limit: params.limit,
                pages: Math.ceil(total / params.limit)
            }
        };
    }

    async getById(id: number) {
        const role = await prisma.internalRole.findUnique({
            where: { id },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        if (!role) {
            throw new Error('Role not found');
        }

        return role;
    }

    async listPermissions() {
        return prisma.internalPermission.findMany({
            orderBy: [{ module: 'asc' }, { slug: 'asc' }]
        });
    }

    async create(data: CreateInternalRoleInput) {
        const existing = await prisma.internalRole.findUnique({
            where: { name: data.name.toUpperCase() }
        });

        if (existing) {
            throw new Error('Role name already exists');
        }

        const role = await prisma.internalRole.create({
            data: {
                name: data.name.toUpperCase(),
                description: data.description,
                permissions: {
                    create: data.permissions?.map(permissionId => ({
                        permission: { connect: { id: permissionId } }
                    }))
                }
            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        return role;
    }

    async update(id: number, data: UpdateInternalRoleInput) {
        const role = await prisma.internalRole.findUnique({ where: { id } });
        if (!role) throw new Error('Role not found');

        // Allow updating description and permissions
        // For permissions, we will delete all existing and create new ones (simplest approach for "set")
        // Alternatively we can diff, but replace is safer for "save state".

        const updateData: any = {
            description: data.description,
            updatedAt: new Date()
        };

        if (data.permissions) {
            // Transactional update for permissions
            return prisma.$transaction(async (tx) => {
                // Delete existing
                await tx.internalRolePermission.deleteMany({
                    where: { role_id: id }
                });

                // Create new
                if (data.permissions && data.permissions.length > 0) {
                    await tx.internalRolePermission.createMany({
                        data: data.permissions.map(permId => ({
                            role_id: id,
                            permission_id: permId
                        }))
                    });
                }

                // Return updated role
                return tx.internalRole.findUnique({
                    where: { id },
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                });
            });
        }

        const updated = await prisma.internalRole.update({
            where: { id },
            data: updateData,
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        return updated;
    }

    async delete(id: number) {
        // Check if usages
        const usersCount = await prisma.internalUser.count({
            where: { internal_role_id: id }
        });

        if (usersCount > 0) {
            throw new Error('Cannot delete role assigned to users');
        }

        await prisma.internalRole.delete({ where: { id } });
        return { success: true };
    }
}
