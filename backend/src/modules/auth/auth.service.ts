import bcrypt from 'bcryptjs';
import { prisma } from '../../core/database';
import { LoginInput, RegisterInput } from './auth.schema';
import { FastifyInstance } from 'fastify';

export class AuthService {
    constructor(private app: FastifyInstance) { }

    async register(input: RegisterInput) {
        const { nome_restaurante, nome_usuario, email, password, slug } = input;

        // Check if email exists globally (or per tenant? usually globally for SaaS login)
        // In this multi-tenant app, a user belongs to a tenant. 
        // We'll assume unique email per tenant, but maybe unique global for simplicity of login?
        // The schema has @@unique([tenant_id, email]), so email can be reused across tenants.
        // BUT for the initial registration of a NEW tenant, we are creating both.

        const existingTenant = slug ? await prisma.tenant.findUnique({ where: { slug } }) : null;
        if (existingTenant) {
            throw new Error('Slug already taken');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const generatedSlug = slug || nome_restaurante.toLowerCase().replace(/ /g, '-') + '-' + Date.now();

        // Transaction to create Tenant + Owner User
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    nome_restaurante,
                    slug: generatedSlug,
                    plano: 'trial',
                },
            });

            const user = await tx.user.create({
                data: {
                    tenant_id: tenant.id,
                    nome: nome_usuario,
                    email,
                    password_hash: hashedPassword,
                    role: 'owner',
                },
            });

            return { tenant, user };
        });

        return result;
    }

    async login(input: LoginInput) {
        // Since email is not unique globally, we might need tenant slug in login OR assume email is unique for now.
        // Or we find ALL users with this email and ask user to choose tenant.
        // For simplicity in this MVP, let's assume we find the first user or require tenant slug in header/body?
        // PRD says: "users - UNIQUE (tenant_id, email)".
        // Let's assume for now the login is: Email + Password. 
        // If multiple users found, we return a list of tenants to choose from?
        // Or we just pick the first one.
        // Let's try to find one user.

        const users = await prisma.user.findMany({
            where: { email: input.email },
            include: { tenant: true },
        });

        if (users.length === 0) {
            throw new Error('Invalid credentials');
        }

        // Check password for each (usually they should be same if it's same person, but maybe not)
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

        // Generate Token
        const token = this.app.jwt.sign({
            id: validUser.id,
            email: validUser.email,
            role: validUser.role,
            tenantId: validUser.tenant_id,
        });

        return { token, user: validUser, tenant: validUser.tenant };
    }
}
