import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema, verifyEmailSchema } from './auth.schema';

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
}
