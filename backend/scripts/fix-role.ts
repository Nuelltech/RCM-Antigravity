import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'owner@demo.com';
    console.log(`🔍 Checking user ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { tenants: true }
    });

    if (!user) {
        console.log('❌ User not found!');
        return;
    }

    console.log('✅ User found:', user.nome);
    console.log('Current Tenants/Roles:', user.tenants);

    // Fix the role
    if (user.tenants.length > 0) {
        console.log('🛠️ Updating role to "owner"...');
        const update = await prisma.userTenant.updateMany({
            where: {
                user_id: user.id,
            },
            data: {
                role: 'owner' // Force role to owner
            }
        });
        console.log(`Updated ${update.count} tenant links to owner.`);
    }

    // Verify
    const updatedUser = await prisma.user.findUnique({
        where: { email },
        include: { tenants: true }
    });
    console.log('🆕 New Roles:', updatedUser?.tenants);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
