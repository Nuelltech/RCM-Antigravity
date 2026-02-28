import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding internal users...');

    const users = [
        {
            email: 'admin@rcm.internal',
            password: 'admin123',
            name: 'Admin User',
            role: 'Admin',
            email_verified: true,
        },
        {
            email: 'marketing@rcm.internal',
            password: 'marketing123',
            name: 'Marketing User',
            role: 'Marketing',
            email_verified: true,
        },
        {
            email: 'sales@rcm.internal',
            password: 'sales123',
            name: 'Sales User',
            role: 'Sales',
            email_verified: true,
        },
        {
            email: 'support@rcm.internal',
            password: 'support123',
            name: 'Support User',
            role: 'Support',
            email_verified: true,
        },
    ];

    // 1. Seed Roles
    const roles = [
        { name: 'ADMIN', description: 'Administrator' },
        { name: 'SALES', description: 'Sales Team' },
        { name: 'MARKETING', description: 'Marketing Team' },
        { name: 'SUPPORT', description: 'Support Team' }
    ];

    const roleMap = new Map<string, number>();

    for (const r of roles) {
        const role = await prisma.internalRole.upsert({
            where: { name: r.name },
            update: {},
            create: r,
        });
        roleMap.set(r.name, role.id);
        console.log(`✅ Role ready: ${r.name}`);
    }

    // 2. Seed Users
    for (const userData of users) {
        // Map simplified role string to DB Role Name
        const roleName = userData.role.toUpperCase();
        const roleId = roleMap.get(roleName);

        if (!roleId) {
            console.warn(`⚠️ Role ${roleName} not found for user ${userData.email}, skipping.`);
            continue;
        }

        const existing = await prisma.internalUser.findUnique({
            where: { email: userData.email },
        });

        if (existing) {
            console.log(`⏭️  User ${userData.email} already exists, skipping...`);
            continue;
        }

        // Hash password
        const password_hash = await bcrypt.hash(userData.password, 10);

        // Create user
        await prisma.internalUser.create({
            data: {
                email: userData.email,
                password_hash,
                name: userData.name,
                role: userData.role, // Keep for legacy if needed
                internal_role_id: roleId,
                email_verified: userData.email_verified,
                active: true
            },
        });
        console.log(`✅ Created user: ${userData.email} (${roleName})`);
    }

    console.log('✨ Internal users seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('Admin:     admin@rcm.internal / admin123');
    console.log('Marketing: marketing@rcm.internal / marketing123');
    console.log('Sales:     sales@rcm.internal / sales123');
    console.log('Support:   support@rcm.internal / support123');
}

main()
    .catch((e) => {
        console.error('Error seeding internal users:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
