import { FastifyRequest, FastifyReply } from 'fastify';
import { hasPermission, Permission } from '../permissions';

/**
 * Authorization middleware
 * Checks if the authenticated user has the required permission
 */
export function requirePermission(permission: Permission) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        // Get user from request (set by auth middleware)
        const user = (request as any).user;

        console.log(`[AUTHZ] Checking permission: ${permission}`);
        console.log(`[AUTHZ] User:`, user);

        if (!user) {
            console.log(`[AUTHZ] No user found - returning 401`);
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        console.log(`[AUTHZ] User role: ${user.role}`);
        console.log(`[AUTHZ] Checking hasPermission(${user.role}, ${permission})`);

        // Check if user's role has the required permission
        if (!hasPermission(user.role, permission)) {
            console.log(`[AUTHZ] Permission DENIED`);
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'Sem permissão para aceder a este recurso',
                required: permission,
                userRole: user.role
            });
        }

        console.log(`[AUTHZ] Permission GRANTED`);
        // Permission granted, continue
    };
}

/**
 * Require one of multiple permissions (OR logic)
 */
export function requireAnyPermission(...permissions: Permission[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        // Check if user has ANY of the required permissions
        const hasAnyPermission = permissions.some(perm =>
            hasPermission(user.role, perm)
        );

        if (!hasAnyPermission) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'Sem permissão para aceder a este recurso',
                requiredAny: permissions,
                userRole: user.role
            });
        }
    };
}

/**
 * Require all permissions (AND logic)
 */
export function requireAllPermissions(...permissions: Permission[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        // Check if user has ALL of the required permissions
        const hasAllPermissions = permissions.every(perm =>
            hasPermission(user.role, perm)
        );

        if (!hasAllPermissions) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'Sem permissão para aceder a este recurso',
                requiredAll: permissions,
                userRole: user.role
            });
        }
    };
}

/**
 * Check if user is the resource owner OR has permission
 * Useful for profile edits, etc.
 */
export function requireOwnerOrPermission(
    getUserId: (request: FastifyRequest) => number,
    permission: Permission
) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const resourceUserId = getUserId(request);
        const isOwner = user.id === resourceUserId;
        const hasRequiredPermission = hasPermission(user.role, permission);

        if (!isOwner && !hasRequiredPermission) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'Apenas o próprio utilizador ou administrador podem realizar esta ação'
            });
        }
    };
}
