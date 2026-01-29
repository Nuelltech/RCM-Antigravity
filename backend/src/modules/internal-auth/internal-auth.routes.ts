import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { InternalAuthService } from './internal-auth.service';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from './internal-auth.schema';

export async function internalAuthRoutes(app: FastifyInstance) {
    const service = new InternalAuthService(app);

    // Public endpoint - Login
    app.withTypeProvider<ZodTypeProvider>().post('/login', {
        schema: {
            body: loginSchema,
            tags: ['Internal', 'Auth'],
            summary: 'Internal team login',
            description: 'Login endpoint for internal team members (Admin, Marketing, Sales, Support)',
        },
    }, async (req, reply) => {
        try {
            const { email, password } = req.body;
            const ipAddress = req.ip;

            const result = await service.login(email, password, ipAddress);

            return reply.status(200).send({
                success: true,
                ...result,
            });
        } catch (err: any) {
            app.log.error('Error in POST /internal/auth/login:', err);
            return reply.status(401).send({
                success: false,
                error: err.message || 'Falha no login',
            });
        }
    });

    // Public endpoint - Forgot Password
    app.withTypeProvider<ZodTypeProvider>().post('/forgot-password', {
        schema: {
            body: forgotPasswordSchema,
            tags: ['Internal', 'Auth'],
            summary: 'Request password reset',
        },
    }, async (req, reply) => {
        const { email } = req.body;
        await service.forgotPassword(email); // Always success for security
        return reply.send({ success: true, message: 'If account exists, email sent' });
    });

    // Public endpoint - Reset Password
    app.withTypeProvider<ZodTypeProvider>().post('/reset-password', {
        schema: {
            body: resetPasswordSchema,
            tags: ['Internal', 'Auth'],
            summary: 'Reset password with token',
        },
    }, async (req, reply) => {
        try {
            const { token, password } = req.body;
            await service.resetPassword(token, password);
            return reply.send({ success: true, message: 'Password updated' });
        } catch (err: any) {
            return reply.status(400).send({
                success: false,
                error: err.message
            });
        }
    });

    // Protected endpoint - Get current user
    app.get('/me', {
        schema: {
            tags: ['Internal', 'Auth'],
            summary: 'Get current internal user',
            description: 'Returns current authenticated internal user info',
        },
        onRequest: async (req, reply) => {
            // Verify JWT token
            try {
                await req.jwtVerify();

                // Verify it's an internal user token
                const payload = req.user as any;
                if (payload.type !== 'internal') {
                    throw new Error('Invalid token type');
                }
            } catch (err) {
                return reply.status(401).send({
                    success: false,
                    error: 'Não autenticado',
                });
            }
        },
    }, async (req, reply) => {
        try {
            const payload = req.user as any;
            const user = await service.getMe(payload.userId);

            return reply.send({
                success: true,
                user,
            });
        } catch (err: any) {
            app.log.error('Error in GET /internal/auth/me:', err);
            return reply.status(500).send({
                success: false,
                error: 'Falha ao obter utilizador',
            });
        }
    });

    // Logout (mainly client-side, but we can have an endpoint for consistency)
    app.post('/logout', {
        schema: {
            tags: ['Internal', 'Auth'],
            summary: 'Logout (client-side)',
            description: 'Logout endpoint (token invalidation happens client-side)',
        },
    }, async (req, reply) => {
        // In a stateless JWT setup, logout is mainly client-side
        // We could add token blacklisting here if needed in the future
        return reply.send({
            success: true,
            message: 'Logout successful',
        });
    });
}
