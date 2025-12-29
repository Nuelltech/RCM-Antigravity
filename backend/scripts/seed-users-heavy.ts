import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting heavy user seeding...');
    console.log('Creating 100 test users across 3 tenants\n');

    const password = 'LoadTest123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const tenants = [
        { id: 2, slug: 'test-pequeno', name: 'PEQUENO' },
        { id: 3, slug: 'test-medio', name: 'MEDIO' },
        { id: 4, slug: 'test-grande', name: 'GRANDE' },
    ];

    let totalCreated = 0;
    const usersPerTenant = 34; // ~100 users total across 3 tenants

    for (const tenant of tenants) {
        console.log(`\n📊 Creating users for ${tenant.name} (tenant ${tenant.id})...`);

        for (let i = 1; i <= usersPerTenant; i++) {
            const userNum = totalCreated + i;
            const email = `loadtest${userNum}@${tenant.slug}.com`;
            const nome = `Load Test User ${userNum}`;

            try {
                // Check if user already exists
                const existing = await prisma.user.findUnique({
                    where: { email }
                });

                if (existing) {
                    console.log(`  ⏩ User ${email} already exists, skipping...`);
                    continue;
                }

                // Create user
                const user = await prisma.user.create({
                    data: {
                        nome,
                        email,
                        password_hash: passwordHash,
                        email_verificado: true,
                    }
                });

                // Assign to tenant with random role
                const roles = ['chef', 'manager', 'staff'] as const;
                const role = roles[Math.floor(Math.random() * roles.length)];

                await prisma.userTenant.create({
                    data: {
                        user_id: user.id,
                        tenant_id: tenant.id,
                        role: role,
                        ativo: true,
                        activated_at: new Date(),
                    }
                });

                if (i % 10 === 0) {
                    console.log(`  ✅ Created ${i}/${usersPerTenant} users for ${tenant.name}`);
                }
            } catch (error) {
                console.error(`  ❌ Error creating ${email}:`, error);
            }
        }

        totalCreated += usersPerTenant;
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`📊 Total users created: ${totalCreated}`);
    console.log(`\n🔐 Login credentials:`);
    console.log(`   Email: loadtest1@test-pequeno.com to loadtest${totalCreated}@test-grande.com`);
    console.log(`   Password: ${password}`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
