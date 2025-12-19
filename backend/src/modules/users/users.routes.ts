import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { UsersService } from './users.service';
import {
    listUsersSchema,
    inviteUserSchema,
    updateRoleSchema,
    updateProfileSchema,
    changePasswordSchema,
    acceptInviteSchema,
} from './users.schema';
import { requirePermission, requireOwnerOrPermission } from '../../core/middleware/authorization';
import z from 'zod';

export async function usersRoutes(app: FastifyInstance) {
    // =================================================================
    // LIST USERS - Admin only
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        preHandler: [requirePermission('USERS_VIEW')],
        schema: {
            querystring: listUsersSchema,
            tags: ['Users'],
            summary: 'List all users in tenant',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);

        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

        return service.list({
            page,
            limit,
            search: req.query.search,
            role: req.query.role,
            ativo: req.query.ativo,
        });
    });

    // =================================================================
    // GET USER BY ID
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().get('/:id', {
        preHandler: [
            requireOwnerOrPermission(
                (req) => parseInt((req.params as any).id),
                'USERS_VIEW'
            )
        ],
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Users'],
            summary: 'Get user by ID',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = parseInt(req.params.id);

        try {
            return await service.getById(userId);
        } catch (error: any) {
            return reply.status(404).send({ error: error.message });
        }
    });

    // =================================================================
    // INVITE USER - Admin only
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().post('/invite', {
        preHandler: [requirePermission('USERS_INVITE')],
        schema: {
            body: inviteUserSchema,
            tags: ['Users'],
            summary: 'Invite new user to tenant',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = (req as any).user?.id;

        try {
            const result = await service.inviteUser(req.body, userId);
            return reply.status(201).send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // VALIDATE INVITE TOKEN - Public (check if user exists)
    // =================================================================
    app.get('/validate-invite-token/:token', async (req, reply) => {
        const { token } = req.params as { token: string };
        const tenantId = parseInt(req.headers['x-tenant-id'] as string || '1');
        const service = new UsersService(tenantId);

        try {
            const result = await service.validateInviteToken(token);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // ACCEPT INVITE - Public (with token)
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().post('/accept-invite', {
        schema: {
            body: acceptInviteSchema,
            tags: ['Users'],
            summary: 'Accept user invite and set password',
        },
    }, async (req, reply) => {
        // Extract tenant from token or use default
        // For now, we'll need tenant_id in the request somehow
        // This could be improved with a public invite validation endpoint
        const tenantId = parseInt(req.headers['x-tenant-id'] as string || '1');
        const service = new UsersService(tenantId);

        try {
            const result = await service.acceptInvite(req.body);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // UPDATE USER ROLE - Admin only
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().put('/:id/role', {
        preHandler: [requirePermission('USERS_UPDATE_ROLE')],
        schema: {
            params: z.object({ id: z.string() }),
            body: updateRoleSchema,
            tags: ['Users'],
            summary: 'Update user role',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = parseInt(req.params.id);
        const updatedBy = (req as any).user?.id;

        try {
            const result = await service.updateRole(userId, req.body);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // UPDATE PROFILE - Own profile or Admin
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().put('/:id/profile', {
        preHandler: [
            requireOwnerOrPermission(
                (req) => parseInt((req.params as any).id),
                'USERS_VIEW'
            )
        ],
        schema: {
            params: z.object({ id: z.string() }),
            body: updateProfileSchema,
            tags: ['Users'],
            summary: 'Update user profile',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = parseInt(req.params.id);

        try {
            const result = await service.updateProfile(userId, req.body);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // CHANGE PASSWORD - Own password only
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().put('/:id/password', {
        preHandler: [
            requireOwnerOrPermission(
                (req) => parseInt((req.params as any).id),
                'USERS_VIEW' // Admin can also change passwords
            )
        ],
        schema: {
            params: z.object({ id: z.string() }),
            body: changePasswordSchema,
            tags: ['Users'],
            summary: 'Change user password',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        const userId = parseInt(req.params.id);
        const service = new UsersService((req as any).tenantId || 1);

        try {
            const result = await service.changePassword(userId, req.body);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // DEACTIVATE USER - Admin only
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().delete('/:id', {
        preHandler: [requirePermission('USERS_DELETE')],
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Users'],
            summary: 'Deactivate user',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = parseInt(req.params.id);
        const deactivatedBy = (req as any).user?.id;

        try {
            const result = await service.deactivate(userId, deactivatedBy);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // REACTIVATE USER - Admin only
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().post('/:id/reactivate', {
        preHandler: [requirePermission('USERS_DELETE')],
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Users'],
            summary: 'Reactivate user',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = parseInt(req.params.id);

        try {
            const result = await service.reactivateUser(userId);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // RESEND INVITE - Admin only
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().post('/:id/resend-invite', {
        preHandler: [requirePermission('USERS_INVITE')],
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Users'],
            summary: 'Resend user invite',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = parseInt(req.params.id);

        try {
            const result = await service.resendInvite(userId);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // =================================================================
    // PERMANENT DELETE USER - Admin only (for inactive users)
    // =================================================================
    app.withTypeProvider<ZodTypeProvider>().delete('/:id/permanent-delete', {
        preHandler: [requirePermission('USERS_DELETE')],
        schema: {
            params: z.object({ id: z.string() }),
            tags: ['Users'],
            summary: 'Permanently delete user (cannot be undone)',
            security: [{ bearerAuth: [] }],
        },
    }, async (req, reply) => {
        if (!req.tenantId) return reply.status(401).send();
        const service = new UsersService(req.tenantId);
        const userId = parseInt(req.params.id);
        const deletedBy = (req as any).user?.id;

        try {
            const result = await service.permanentDeleteUser(userId, deletedBy);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
