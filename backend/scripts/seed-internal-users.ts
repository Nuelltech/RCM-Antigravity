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

    for (const userData of users) {
        // Check if user already exists
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
        const user = await prisma.internalUser.create({
            data: {
                email: userData.email,
                password_hash,
                name: userData.name,
                role: userData.role,
                email_verified: userData.email_verified,
            },
        });

        console.log(`✅ Created ${userData.role}: ${userData.email}`);
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
