
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/modules/auth/auth.service';
import { FastifyInstance } from 'fastify';

const prisma = new PrismaClient();

// Mock Fastify Instance
const mockApp = {
    jwt: {
        sign: (payload: any) => 'mock-token',
        verify: (token: string) => ({ userId: 1, email: 'test@example.com', role: 'admin', tenantId: 1 })
    }
} as unknown as FastifyInstance;

const authService = new AuthService(mockApp);

async function main() {
    console.log('--- Starting Tenant Creation Tests ---');

    const uniqueId = Date.now();
    const existingUserEmail = `existing.user.${uniqueId}@test.com`;
    const tenantContactEmail = `tenant.contact.${uniqueId}@test.com`; // Will be used as contact email

    try {
        // 1. Setup: Create a Tenant with a specific contact email
        console.log('\n1. Setup: Creating initial tenant with contact email...');
        const setupTenant = await prisma.tenant.create({
            data: {
                nome_restaurante: `Setup Tenant ${uniqueId}`,
                slug: `setup-tenant-${uniqueId}`,
                email_contacto: tenantContactEmail,
                plano: 'trial'
            }
        });
        console.log('   ✅ Setup Tenant created:', setupTenant.nome_restaurante);

        // 2. Setup: Create an existing user (who has a tenant)
        console.log('\n2. Setup: Creating an existing user...');
        const existingUser = await prisma.user.create({
            data: {
                nome: 'Existing User',
                email: existingUserEmail,
                password_hash: 'hash',
                email_verificado: true
            }
        });
        // Link to setup tenant
        await prisma.userTenant.create({
            data: {
                user_id: existingUser.id,
                tenant_id: setupTenant.id,
                role: 'admin'
            }
        });
        console.log('   ✅ Existing User created:', existingUser.email);


        // 3. TEST: Try to register with the Tenant Contact Email (Should Fail)
        console.log('\n3. TEST: Registering with Tenant Contact Email (Expected Failure)...');
        try {
            await authService.register({
                nome_restaurante: 'Fail Restaurant',
                nif: `999${uniqueId}`, // Random NIF
                morada: 'Test Street',
                nome_usuario: 'Hacker',
                email: tenantContactEmail, // <--- BLOCKED EMAIL
                password: 'password123'
            });
            console.error('   ❌ FAILURE: Should have thrown error, but succeeded.');
        } catch (error: any) {
            if (error.message.includes('Email already registered as a restaurant contact')) {
                console.log('   ✅ SUCCESS: Blocked as expected.');
            } else {
                console.error('   ❌ FAILURE: Wrong error message:', error.message);
            }
        }

        // 4. TEST: Existing User creating NEW Tenant (Should Success)
        console.log('\n4. TEST: Existing User creating NEW Tenant (Expected Success)...');
        try {
            const result = await authService.register({
                nome_restaurante: `New Branch ${uniqueId}`,
                nif: `888${uniqueId}`,
                morada: 'Branch Street',
                nome_usuario: 'Existing User New Name', // Should be ignored/not update user
                email: existingUserEmail, // <--- EXISTING USER EMAIL
                password: 'newpassword123' // Should be ignored
            });

            console.log('   ✅ SUCCESS: Registration went through.');

            if (result.loginRequired === true) {
                console.log('   ✅ SUCCESS: loginRequired flag is present.');
            } else {
                console.error('   ❌ FAILURE: loginRequired flag missing.');
            }

            // Verify User Data NOT changed
            const userAfter = await prisma.user.findUnique({ where: { email: existingUserEmail } });
            if (userAfter?.password_hash === 'hash') {
                console.log('   ✅ SUCCESS: User password NOT changed.');
            } else {
                console.error('   ❌ FAILURE: User password WAS changed.');
            }

            // Verify UserTenant link
            const userTenants = await prisma.userTenant.findMany({ where: { user_id: existingUser.id } });
            if (userTenants.length === 2) {
                console.log('   ✅ SUCCESS: User now has 2 tenants.');
            } else {
                console.error(`   ❌ FAILURE: User has ${userTenants.length} tenants (expected 2).`);
            }

        } catch (error: any) {
            console.error('   ❌ FAILURE: Registration failed:', error);
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
