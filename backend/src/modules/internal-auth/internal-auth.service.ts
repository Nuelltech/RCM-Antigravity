import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendPasswordReset } from '../../core/email.service';
import { env } from '../../core/env';

const prisma = new PrismaClient();

export class InternalAuthService {
    constructor(private app: FastifyInstance) { }

    async login(email: string, password: string, ipAddress?: string) {
        // Find user with relations
        const user = await prisma.internalUser.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                internalRole: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
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

        // Flatten permissions
        const permissionSlugs = user.internalRole?.permissions.map(p => p.permission.slug) || [];

        // Generate JWT token with internal user data
        const token = this.app.jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.internalRole?.name || user.role, // Fallback to string role if internalRole missing
                permissions: permissionSlugs,
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
            user: {
                ...userWithoutPassword,
                permissions: permissionSlugs
            },
        };
    }

    async getMe(userId: number) {
        // ... existing getMe code ...
        const user = await prisma.internalUser.findUnique({
            where: { id: userId },
            include: {
                internalRole: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            throw new Error('Utilizador não encontrado');
        }

        if (!user.active) {
            throw new Error('Conta inativa');
        }

        // Flatten permissions similar to login
        const permissionSlugs = user.internalRole?.permissions.map(p => p.permission.slug) || [];

        return {
            ...user,
            role: user.internalRole?.name || user.role,
            permissions: permissionSlugs
        };
    }

    async forgotPassword(email: string) {
        const user = await prisma.internalUser.findUnique({ where: { email } });
        if (!user || !user.active) return; // Silent fail security practice

        // Generate stateless JWT token
        // Secret includes password_hash so if password changes, token is invalid
        const secret = env.JWT_SECRET + user.password_hash;
        const payload = {
            id: user.id,
            email: user.email,
            type: 'password_reset'
        };

        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        await sendPasswordReset(
            { email: user.email, name: user.name },
            token
        );
    }

    async resetPassword(token: string, newPassword: string) {
        // 1. Decode generic part to get User ID
        const decoded = jwt.decode(token) as any;
        if (!decoded || !decoded.id) {
            throw new Error('Invalid or expired token');
        }

        // 2. Fetch user to get current password hash (part of the secret)
        const user = await prisma.internalUser.findUnique({ where: { id: decoded.id } });
        if (!user) {
            throw new Error('User not found');
        }

        // 3. Verify token with dynamic secret
        const secret = env.JWT_SECRET + user.password_hash;
        try {
            jwt.verify(token, secret);
        } catch (err) {
            throw new Error('Invalid or expired token');
        }

        // 4. Update password
        const password_hash = await bcrypt.hash(newPassword, 10);
        await prisma.internalUser.update({
            where: { id: user.id },
            data: { password_hash }
        });

        return { success: true };
    }
}
