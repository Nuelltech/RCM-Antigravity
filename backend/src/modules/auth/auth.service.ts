import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../core/database';
import { LoginInput, RegisterInput, VerifyEmailInput, ForgotPasswordInput, ResetPasswordInput } from './auth.schema';
import { FastifyInstance } from 'fastify';
import { DEFAULT_FAMILIES, DEFAULT_SUBFAMILIES } from '../../core/constants/seedData';

export class AuthService {
    constructor(private app: FastifyInstance) { }

    async register(input: RegisterInput) {
        const { nome_restaurante, nif, morada, nome_usuario, email, password, slug } = input;

        // Check if NIF exists
        const existingTenantNif = await prisma.tenant.findFirst({ where: { nif } });
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

        // NEW VALIDATION: Check if email is already a CONTACT email for a restaurant
        // This prevents re-registering a restaurant with its official contact email,
        // but allows the USER email to be reused for multiple restaurants (multi-tenant admin)
        const existingTenantContact = await prisma.tenant.findFirst({
            where: { email_contacto: email }
        });

        if (existingTenantContact) {
            throw new Error('Email already registered as a restaurant contact.');
        }

        // Check if user email exists
        const existingUser = await prisma.user.findUnique({ where: { email } });

        // We no longer block existing users. We allow them to create a new tenant (branch).
        // However, we must be careful NOT to overwrite their password if they already exist.

        let hashedPassword = '';
        if (!existingUser) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const generatedSlug = slug || nome_restaurante.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

        // Generate 6-digit verification code - ONLY used for NEW users
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Transaction to create Tenant + Owner User (or link) + Seed Data
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Tenant
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14); // 14 days trial

            const tenant = await tx.tenant.create({
                data: {
                    nome_restaurante,
                    slug: generatedSlug,
                    nif,
                    morada,
                    email_contacto: email, // Set the registering email as the contact email for this tenant
                    plano: 'trial',
                    status: 'trial',
                    trial_ends_at: trialEnd,
                    data_expiracao_plano: trialEnd
                },
            });

            // 2. Handle User
            let user;
            if (existingUser) {
                // User exists.
                // SECURITY: We update the verification code to force re-verification.
                // We do NOT update the password.
                user = await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        verification_code: verificationCode,
                        verification_code_expires_at: verificationExpiresAt
                    }
                });
                console.log(`[AUTH] Linking existing user ${user.id} to new tenant ${tenant.id} (Pending Verification)`);
            } else {
                // Create new User
                user = await tx.user.create({
                    data: {
                        nome: nome_usuario,
                        email,
                        password_hash: hashedPassword,
                        verification_code: verificationCode,
                        verification_code_expires_at: verificationExpiresAt,
                        email_verificado: false,
                    },
                });
            }

            // 3. Create UserTenant relationship
            // For existing users, we set this to FALSE until they verify the code.
            // For new users, it's also effectively "pending" until email is verified, but logic below handles it.
            // Actually, we can just set 'ativo: false' for everyone and activate in verifyEmail.
            // BUT, for simplicity and backward compatibility with the 'new user' flow which might be slightly different,
            // let's stick to the plan:
            // ALWAYS set ativo=false initially? 
            // The original code set it to true for new users but they couldn't login properly without email_verificado=true.
            // Standardizing: Set ativo=false. verifyEmail sets it to true.
            await tx.userTenant.create({
                data: {
                    user_id: user.id,
                    tenant_id: tenant.id,
                    role: 'admin',
                    ativo: false, // Wait for verification
                    activated_at: null,
                },
            });

            // 4. Create Trial Subscription (Standard Plan)
            const standardPlan = await tx.subscriptionPlan.findUnique({ where: { name: 'standard' } });
            if (standardPlan) {
                const trialEnd = new Date();
                trialEnd.setDate(trialEnd.getDate() + 14); // 14 days trial

                await tx.tenantSubscription.create({
                    data: {
                        tenant_id: tenant.id,
                        plan_id: standardPlan.id,
                        status: 'trial',
                        trial_start: new Date(),
                        trial_end: trialEnd
                    }
                });
            }



            return { tenant, user, isNewUser: !existingUser };
        }, {
            maxWait: 5000,
            timeout: 30000,
        });

        // ALWAYS Send verification email (for both new and existing users)
        try {
            const { sendVerificationCode } = await import('../../core/email.service');
            await sendVerificationCode(
                { email: result.user.email, name: result.user.nome },
                verificationCode
            );
            console.log(`[EMAIL] Verification email sent to ${email}`);
        } catch (error) {
            console.error('[EMAIL ERROR] Failed to send verification email:', error);
        }

        return {
            message: 'Registration successful. Please verify your email.',
            email: result.user.email,
            loginRequired: false // Proceed to Verify page
        };
    }

    async verifyEmail(input: VerifyEmailInput) {
        const user = await prisma.user.findFirst({
            where: { email: input.email },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // REMOVED early return for already verified email. 
        // We need to allow re-verification to activate pending tenants.

        if (user.verification_code !== input.code) {
            throw new Error('Invalid verification code');
        }

        if (user.verification_code_expires_at && user.verification_code_expires_at < new Date()) {
            throw new Error('Verification code expired');
        }

        await prisma.$transaction(async (tx) => {
            // 1. Verify User
            await tx.user.update({
                where: { id: user.id },
                data: {
                    email_verificado: true,
                    verification_code: null,
                    verification_code_expires_at: null,
                },
            });

            // 2. Activate any pending tenant links for this user
            // This covers the case where an existing user registers a new tenant
            await tx.userTenant.updateMany({
                where: {
                    user_id: user.id,
                    ativo: false
                },
                data: {
                    ativo: true,
                    activated_at: new Date()
                }
            });
        });

        return { message: 'Email verified successfully' };
    }

    async login(input: LoginInput) {
        // Find user by email
        const user = await prisma.user.findFirst({
            where: { email: input.email },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if user has a password set
        if (!user.password_hash) {
            throw new Error('Password not set. Please accept your invitation first.');
        }

        const valid = await bcrypt.compare(input.password, user.password_hash);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        if (!user.email_verificado) {
            throw new Error('Email not verified. Please check your inbox for the verification code.');
        }

        // Update last login time
        await prisma.user.update({
            where: { id: user.id },
            data: { ultimo_login: new Date() },
        });

        // Get all tenants this user has access to
        const userTenants = await prisma.userTenant.findMany({
            where: {
                user_id: user.id,
                ativo: true, // Only active relationships
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        nome_restaurante: true,
                        slug: true,
                        ativo: true,
                        // Fetch subscription details
                        tenantSubscription: {
                            select: {
                                status: true,
                                trial_end: true,
                                current_period_end: true,
                                plan: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    },
                },
            },
        });

        // Filter out inactive tenants (still respect hard delete/deactivation)
        // AND check subscription status if needed (optional: we usually allow login to pay)
        const activeTenants = userTenants.filter((ut) => ut.tenant.ativo);

        if (activeTenants.length === 0) {
            throw new Error('No active tenants found for this user');
        }

        // Use first active tenant as default
        const defaultTenant = activeTenants[0];

        // LOGIC UPDATE: Use TenantSubscription for roles/features in token if needed
        // For now, we trust the relationship, but we log the 'real' status
        const subscription = defaultTenant.tenant.tenantSubscription;
        console.log(`[AUTH] Login to tenant ${defaultTenant.tenant.nome_restaurante}. Real Subscription Status: ${subscription?.status}`);

        const token = this.app.jwt.sign({
            userId: user.id,
            email: user.email,
            name: user.nome,
            role: defaultTenant.role, // Role from UserTenant
            tenantId: defaultTenant.tenant_id,
            tenantName: defaultTenant.tenant.nome_restaurante,
        });

        // Check if tenant is seeded (has families)
        const familyCount = await prisma.familia.count({
            where: { tenant_id: defaultTenant.tenant.id }
        });
        const isSeeded = familyCount > 0;

        const response = {
            token,
            isSeeded, // Add flag for frontend redirection
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: defaultTenant.role,
                tenant_id: defaultTenant.tenant_id,
            },
            tenant: defaultTenant.tenant,
            tenants: activeTenants.map((ut) => ({
                id: ut.tenant.id,
                nome_restaurante: ut.tenant.nome_restaurante,
                slug: ut.tenant.slug,
                role: ut.role, // User's role in this tenant
                subscriptionStatus: ut.tenant.tenantSubscription?.status // Send real status to frontend
            })),
        };

        // Create Session Record (Critical for Notifications)
        const accessTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const refreshToken = crypto.randomBytes(40).toString('hex'); // Dummy refresh for now
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        console.log(`[AUTH] 🚀 Creating session for User ${user.id} in Tenant ${defaultTenant.tenant_id}...`);

        try {
            const session = await prisma.session.create({
                data: {
                    user_id: user.id,
                    tenant_id: defaultTenant.tenant_id,
                    access_token_hash: accessTokenHash,
                    refresh_token_hash: refreshTokenHash,
                    expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 mins (match JWT)
                    refresh_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    user_agent: 'Mobile App', // Hardcoded safely for mobile
                }
            });
            console.log(`[AUTH] ✅ Session created successfully! ID: ${session.id}`);
        } catch (err) {
            console.error('[AUTH] ❌ FAILED to create session:', err);
            // We log but don't throw to allow login to proceed (though push won't work)
        }

        return response;
    }

    /**
     * Switch to a different tenant
     * Validates that user has access to the target tenant
     */
    async switchTenant(userId: number, targetTenantId: number) {
        // Check if user has access to target tenant
        const userTenant = await prisma.userTenant.findUnique({
            where: {
                user_id_tenant_id: {
                    user_id: userId,
                    tenant_id: targetTenantId,
                },
            },
            include: {
                user: true,
                tenant: true,
            },
        });

        if (!userTenant || !userTenant.ativo) {
            throw new Error('Não tem acesso a este restaurante');
        }

        // Generate new JWT with new tenantId
        const newToken = this.app.jwt.sign({
            userId: userTenant.user.id,
            email: userTenant.user.email,
            name: userTenant.user.nome,
            tenantId: targetTenantId,
            tenantName: userTenant.tenant.nome_restaurante,
            role: userTenant.role, // Role specific to this tenant
        });

        // Create Session Record (Critical for Notifications)
        const accessTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
        const refreshToken = crypto.randomBytes(40).toString('hex'); // Dummy refresh for now
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        console.log(`[AUTH] 🚀 Switching Tenant: Creating session for User ${userTenant.user.id} in Tenant ${targetTenantId}...`);

        try {
            const session = await prisma.session.create({
                data: {
                    user_id: userTenant.user.id,
                    tenant_id: targetTenantId,
                    access_token_hash: accessTokenHash,
                    refresh_token_hash: refreshTokenHash,
                    expires_at: new Date(Date.now() + 60 * 60 * 1000), // 60 mins (match JWT)
                    refresh_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    user_agent: 'Mobile App / Web Switch', // Generic UA
                }
            });
            console.log(`[AUTH] ✅ Session created successfully for new tenant! ID: ${session.id}`);
        } catch (err) {
            console.error('[AUTH] ❌ FAILED to create session during tenant switch:', err);
            // non-blocking
        }

        return {
            access_token: newToken,
            user: {
                id: userTenant.user.id,
                nome: userTenant.user.nome,
                email: userTenant.user.email,
                role: userTenant.role,
                tenant_id: targetTenantId, // Missing: Added for frontend data consistency
            },
            tenant: {
                id: userTenant.tenant.id,
                nome_restaurante: userTenant.tenant.nome_restaurante,
                slug: userTenant.tenant.slug,
            },
        };
    }

    async validateToken(token: string) {
        try {
            const decoded = this.app.jwt.verify(token) as {
                userId: number;
                email: string;
                role: string;
                tenantId: number;
            };

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
            });

            if (!user) {
                throw new Error('Invalid token');
            }

            // Check if user still has an active relationship with this tenant
            const userTenant = await prisma.userTenant.findUnique({
                where: {
                    user_id_tenant_id: {
                        user_id: decoded.userId,
                        tenant_id: decoded.tenantId,
                    },
                },
            });

            if (!userTenant || !userTenant.ativo) {
                throw new Error('Invalid token - no active tenant relationship');
            }

            return {
                isValid: true,
                userId: decoded.userId,
                email: decoded.email,
                tenantId: decoded.tenantId,
                role: decoded.role,
            };
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
    async forgotPassword(input: ForgotPasswordInput) {
        const user = await prisma.user.findFirst({
            where: { email: input.email },
        });

        if (!user) {
            // For security, don't reveal if user exists
            return { message: 'If the email exists, a verification code has been sent.' };
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verification_code: verificationCode,
                verification_code_expires_at: verificationExpiresAt,
            },
        });

        // Send forgot password email
        try {
            const { sendForgotPassword } = await import('../../core/email.service');
            await sendForgotPassword(
                { email: user.email, name: user.nome },
                verificationCode
            );
        } catch (error) {
            console.error('[EMAIL ERROR] Failed to send verification code:', error);
            // Continue anyway for security - don't reveal email sending failure
        }

        return { message: 'Verification code sent.' };
    }

    async resetPassword(input: ResetPasswordInput) {
        const user = await prisma.user.findFirst({
            where: { email: input.email },
        });

        if (!user) {
            throw new Error('Invalid request');
        }

        if (user.verification_code !== input.code) {
            throw new Error('Invalid verification code');
        }

        if (user.verification_code_expires_at && user.verification_code_expires_at < new Date()) {
            throw new Error('Verification code expired');
        }

        const hashedPassword = await bcrypt.hash(input.newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                verification_code: null,
                verification_code_expires_at: null,
                // Also verify email if not already verified, since they proved ownership
                email_verificado: true,
            },
        });

        return { message: 'Password updated successfully' };
    }

    async registerPushToken(userId: number, token: string) {
        console.log(`[AuthService] Registering push token for user ${userId}...`);
        const result = await prisma.session.updateMany({
            where: {
                user_id: userId,
                revoked: false,
                expires_at: { gt: new Date() }
            },
            data: {
                push_token: token
            }
        });
        console.log(`[AuthService] Updated ${result.count} sessions with push token.`);
        return { success: true };
    }
}
