import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class InternalAuthService {
    constructor(private app: FastifyInstance) { }

    async login(email: string, password: string, ipAddress?: string) {
        // Find user
        const user = await prisma.internalUser.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            throw new Error('Credenciais inválidas');
        }

        if (!user.active) {
            throw new Error('Conta inativa');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Credenciais inválidas');
        }

        // Update last login
        await prisma.internalUser.update({
            where: { id: user.id },
            data: {
                last_login_at: new Date(),
                last_login_ip: ipAddress,
            },
        });

        // Generate JWT token with internal user data
        const token = this.app.jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                type: 'internal', // Mark as internal user token
            },
            {
                expiresIn: process.env.JWT_INTERNAL_EXPIRES_IN || '7d',
            }
        );

        // Return user without password
        const { password_hash, ...userWithoutPassword } = user;

        return {
            token,
            user: userWithoutPassword,
        };
    }

    async getMe(userId: number) {
        const user = await prisma.internalUser.findUnique({
            where: { id: userId },
            select: {
                id: true,
                uuid: true,
                email: true,
                name: true,
                role: true,
                permissions: true,
                active: true,
                email_verified: true,
                last_login_at: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new Error('Utilizador não encontrado');
        }

        if (!user.active) {
            throw new Error('Conta inativa');
        }

        return user;
    }
}
