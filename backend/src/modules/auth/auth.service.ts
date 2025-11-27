import bcrypt from 'bcryptjs';
import { prisma } from '../../core/database';
import { LoginInput, RegisterInput, VerifyEmailInput } from './auth.schema';
import { FastifyInstance } from 'fastify';
import { DEFAULT_FAMILIES, DEFAULT_SUBFAMILIES } from '../../core/constants/seedData';

export class AuthService {
    constructor(private app: FastifyInstance) { }

    async register(input: RegisterInput) {
        const { nome_restaurante, nif, morada, nome_usuario, email, password, slug } = input;

        // Check if NIF exists
        const existingTenantNif = await prisma.tenant.findUnique({ where: { nif } });
        if (existingTenantNif) {
            throw new Error('NIF already registered');
        }

        // Check if slug exists
        if (slug) {
            const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
            if (existingTenant) {
                throw new Error('Slug already taken');
            }
        }

        // Check if user email exists (in this tenant context, but for new tenant it's global check effectively)
        // We will enforce unique email for owner registration
        const existingUser = await prisma.user.findFirst({ where: { email } });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const generatedSlug = slug || nome_restaurante.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Transaction to create Tenant + Owner User + Seed Data
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Tenant
            const tenant = await tx.tenant.create({
                data: {
                    nome_restaurante,
                    slug: generatedSlug,
                    nif,
                    morada,
                    plano: 'trial',
                },
            });

            // 2. Create User
            const user = await tx.user.create({
                data: {
                    tenant_id: tenant.id,
                    nome: nome_usuario,
                    email,
                    password_hash: hashedPassword,
                    role: 'owner',
                    verification_code: verificationCode,
                    verification_code_expires_at: verificationExpiresAt,
                    email_verificado: false,
                },
            });

            // 3. Seed Families
            const familyMap = new Map<string, number>();
            for (const family of DEFAULT_FAMILIES) {
                const newFamily = await tx.familia.create({
                    data: {
                        tenant_id: tenant.id,
                        nome: family.nome,
                        codigo: family.codigo,
                    },
                });
                familyMap.set(family.codigo, newFamily.id);
            }

            // 4. Seed Subfamilies
            for (const sub of DEFAULT_SUBFAMILIES) {
                const familyId = familyMap.get(sub.familia_codigo);
                if (familyId) {
                    await tx.subfamilia.create({
                        data: {
                            tenant_id: tenant.id,
                            familia_id: familyId,
                            nome: sub.nome,
                            codigo: sub.codigo,
                        },
                    });
                }
            }

            return { tenant, user };
        });

        // Mock Email Sending
        console.log(`[EMAIL MOCK] Verification code for ${email}: ${verificationCode}`);

        return {
            message: 'Registration successful. Please verify your email.',
            email: result.user.email
        };
    }

    async verifyEmail(input: VerifyEmailInput) {
        const user = await prisma.user.findFirst({
            where: { email: input.email },
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.email_verificado) {
            return { message: 'Email already verified' };
        }

        if (user.verification_code !== input.code) {
            throw new Error('Invalid verification code');
        }

        if (user.verification_code_expires_at && user.verification_code_expires_at < new Date()) {
            throw new Error('Verification code expired');
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                email_verificado: true,
                verification_code: null,
                verification_code_expires_at: null,
            },
        });

        return { message: 'Email verified successfully' };
    }

    async login(input: LoginInput) {
        const users = await prisma.user.findMany({
            where: { email: input.email },
            include: { tenant: true },
        });

        if (users.length === 0) {
            throw new Error('Invalid credentials');
        }

        let validUser = null;
        for (const user of users) {
            const valid = await bcrypt.compare(input.password, user.password_hash);
            if (valid) {
                validUser = user;
                break;
            }
        }

        if (!validUser) {
            throw new Error('Invalid credentials');
        }

        if (!validUser.email_verificado) {
            throw new Error('Email not verified. Please check your inbox for the verification code.');
        }

        if (!validUser.ativo || !validUser.tenant.ativo) {
            throw new Error('Account is inactive');
        }

        const token = this.app.jwt.sign({
            id: validUser.id,
            email: validUser.email,
            role: validUser.role,
            tenantId: validUser.tenant_id,
        });

        return { token, user: validUser, tenant: validUser.tenant };
    }
}
