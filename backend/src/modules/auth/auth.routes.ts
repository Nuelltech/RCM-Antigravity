import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema';

export async function authRoutes(app: FastifyInstance) {
    const service = new AuthService(app);

    app.withTypeProvider<ZodTypeProvider>().post('/register', {
        schema: {
            body: registerSchema,
            tags: ['Auth'],
            summary: 'Register a new tenant and owner',
        },
    }, async (req, reply) => {
        try {
            const result = await service.register(req.body);
            return reply.status(201).send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().post('/verify', {
        schema: {
            body: verifyEmailSchema,
            tags: ['Auth'],
            summary: 'Verify email with code',
        },
    }, async (req, reply) => {
        try {
            const result = await service.verifyEmail(req.body);
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().post('/login', {
        schema: {
            body: loginSchema,
            tags: ['Auth'],
            summary: 'Login user',
        },
    }, async (req, reply) => {
        try {
            const result = await service.login(req.body);
            return reply.send(result);
        } catch (err: any) {
            return reply.status(401).send({ error: err.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().post('/forgot-password', {
        schema: {
            body: forgotPasswordSchema,
            tags: ['Auth'],
            summary: 'Request password reset code',
        },
    }, async (req, reply) => {
        try {
            const result = await service.forgotPassword(req.body);
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    });

    app.withTypeProvider<ZodTypeProvider>().post('/reset-password', {
        schema: {
            body: resetPasswordSchema,
            tags: ['Auth'],
            summary: 'Reset password with code',
        },
    }, async (req, reply) => {
        try {
            const result = await service.resetPassword(req.body);
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    });

    app.get('/validate', {
        schema: {
            tags: ['Auth'],
            summary: 'Validate JWT token',
        },
    }, async (req, reply) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.status(401).send({ error: 'No token provided' });
            }

            const token = authHeader.substring(7);
            const result = await service.validateToken(token);
            return reply.send(result);
        } catch (err: any) {
            return reply.status(401).send({ error: err.message });
        }
    });
}
