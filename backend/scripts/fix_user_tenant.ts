
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
    const userId = 1;
    const tenantId = 1;

    console.log(`🔧 Fixing UserTenant for User ${userId} <-> Tenant ${tenantId}...`);
    console.log(`Database URL: ${process.env.DATABASE_URL?.split('@')[1]}`);

    try {
        // Check if exists
        const existing = await prisma.userTenant.findUnique({
            where: {
                user_id_tenant_id: {
                    user_id: userId,
                    tenant_id: tenantId
                }
            }
        });

        if (existing) {
            console.log('✅ Relation already exists.');
            return;
        }

        // Create
        await prisma.userTenant.create({
            data: {
                user_id: userId,
                tenant_id: tenantId,
                role: 'admin', // Default to admin for the owner
                ativo: true,
                activated_at: new Date()
            }
        });

        console.log('✅ UserTenant created successfully!');

    } catch (error) {
        console.error('❌ Error fixing UserTenant:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
