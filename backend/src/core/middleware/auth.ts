import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        userId?: number;
    }
}

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
    req.log.info(`[AUTH] Middleware called for ${req.method} ${req.url}`);

    // Skip auth check for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        req.log.info('[AUTH] Skipping OPTIONS request');
        return;
    }

    // Skip auth for public routes
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/verify', '/api/users/accept-invite', '/api/users/validate-invite-token', '/health'];

    // Check for exact root route match
    if (req.url === '/' || req.url === '') {
        req.log.info('[AUTH] Skipping root route');
        return;
    }

    if (publicRoutes.some(route => req.url.startsWith(route))) {
        req.log.info(`[AUTH] Skipping public route: ${req.url}`);
        return;
    }

    req.log.info('[AUTH] Proceeding with authentication check');

    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        req.log.info(`[AUTH] Authorization header: ${authHeader ? 'Present' : 'Missing'}`);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.log.warn('[AUTH] Invalid authorization header format');
            return reply.status(401).send({ error: 'No token provided' });
        }

        // Extract token (remove 'Bearer ' prefix)
        const token = authHeader.substring(7);
        req.log.info(`[AUTH] Token extracted, length: ${token.length}`);

        // Verify JWT token using the server's jwt instance
        const decoded = await req.server.jwt.verify(token) as any;
        req.log.info(`[AUTH] Token verified successfully, user ID: ${decoded.id || decoded.userId}`);

        // Set user info on request - IMPORTANT: Set full user object for authorization middleware
        req.userId = decoded.id || decoded.userId;
        (req as any).user = {
            id: decoded.id || decoded.userId,
            role: decoded.role,
            email: decoded.email,
            tenantId: decoded.tenantId
        };

        req.log.info(`[AUTH] User object set: id=${(req as any).user.id}, role=${(req as any).user.role}`);

    } catch (error) {
        req.log.error(`[AUTH] Token verification failed: ${error}`);
        return reply.status(401).send({ error: 'Invalid or expired token' });
    }
}

