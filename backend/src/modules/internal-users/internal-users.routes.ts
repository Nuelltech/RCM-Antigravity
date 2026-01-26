import { FastifyInstance } from 'fastify';
import { InternalUsersService } from './internal-users.service';
import {
    createInternalUserSchema,
    listUsersQuerySchema,
    updateInternalUserSchema,
    userIdParamSchema,
    adminResetPasswordSchema
} from './internal-users.schema';

export async function internalUsersRoutes(app: FastifyInstance) {
    const service = new InternalUsersService(app);

    // Middleware to ensure admin access
    app.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify();
            const user = request.user as any;
            if (user.type !== 'internal') {
                throw new Error('Unauthorized');
            }
            if (user.role !== 'ADMIN') { // Only admins can manage users
                throw new Error('Forbidden: Admin access required');
            }
        } catch (err) {
            reply.send(err);
        }
    });

    app.get('/', {
        schema: {
            querystring: listUsersQuerySchema,
            tags: ['Internal Users']
        }
    }, async (req, reply) => {
        const query = req.query as any;
        return service.list(query);
    });

    app.get('/:id', {
        schema: {
            params: userIdParamSchema,
            tags: ['Internal Users']
        }
    }, async (req, reply) => {
        const { id } = req.params as any;
        return service.getById(id);
    });

    app.post('/', {
        schema: {
            body: createInternalUserSchema,
            tags: ['Internal Users']
        }
    }, async (req, reply) => {
        const body = req.body as any;
        return service.create(body);
    });

    app.put('/:id', {
        schema: {
            params: userIdParamSchema,
            body: updateInternalUserSchema,
            tags: ['Internal Users']
        }
    }, async (req, reply) => {
        const { id } = req.params as any;
        const body = req.body as any;
        return service.update(id, body);
    });

    app.delete('/:id', {
        schema: {
            params: userIdParamSchema,
            tags: ['Internal Users']
        }
    }, async (req, reply) => {
        const { id } = req.params as any;
        return service.delete(id);
    });

    app.post('/:id/reset-password', {
        schema: {
            params: userIdParamSchema,
            body: adminResetPasswordSchema,
            tags: ['Internal Users']
        }
    }, async (req, reply) => {
        const { id } = req.params as any;
        const { password } = req.body as any;
        return service.adminResetPassword(id, password);
    });
}
