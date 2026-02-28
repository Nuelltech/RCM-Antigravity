import { FastifyInstance } from 'fastify';
import { InternalRolesService } from './internal-roles.service';
import {
    createInternalRoleSchema,
    listRolesQuerySchema,
    updateInternalRoleSchema,
    roleIdParamSchema,
    internalRoleListResponseSchema,
    internalPermissionListResponseSchema
} from './internal-roles.schema';

export async function internalRolesRoutes(app: FastifyInstance) {
    const service = new InternalRolesService(app);

    // Middleware to ensure admin access
    app.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify();
            const user = request.user as any;
            if (user.type !== 'internal') {
                throw new Error('Unauthorized');
            }
            if (user.role?.toUpperCase() !== 'ADMIN') { // Only admins can manage roles
                throw new Error('Forbidden: Admin access required');
            }
        } catch (err) {
            reply.send(err);
        }
    });

    app.get('/roles', {
        schema: {
            querystring: listRolesQuerySchema,
            tags: ['Internal Roles'],
            // response: { 200: internalRoleListResponseSchema } // Optional: strict response validation
        }
    }, async (req, reply) => {
        const query = req.query as any;
        return service.list(query);
    });

    app.get('/roles/permissions', {
        schema: {
            tags: ['Internal Roles'],
            // response: { 200: internalPermissionListResponseSchema }
        }
    }, async (req, reply) => {
        return service.listPermissions();
    });

    app.get('/roles/:id', {
        schema: {
            params: roleIdParamSchema,
            tags: ['Internal Roles']
        }
    }, async (req, reply) => {
        const { id } = req.params as any;
        return service.getById(id);
    });

    app.post('/roles', {
        schema: {
            body: createInternalRoleSchema,
            tags: ['Internal Roles']
        }
    }, async (req, reply) => {
        const body = req.body as any;
        return service.create(body);
    });

    app.put('/roles/:id', {
        schema: {
            params: roleIdParamSchema,
            body: updateInternalRoleSchema,
            tags: ['Internal Roles']
        }
    }, async (req, reply) => {
        const { id } = req.params as any;
        const body = req.body as any;
        return service.update(id, body);
    });

    app.delete('/roles/:id', {
        schema: {
            params: roleIdParamSchema,
            tags: ['Internal Roles']
        }
    }, async (req, reply) => {
        const { id } = req.params as any;
        return service.delete(id);
    });
}
