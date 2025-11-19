import { prisma } from '../src/core/database';
import bcrypt from 'bcryptjs';

async function main() {
    const passwordHash = await bcrypt.hash('password123', 10);

    const tenant = await prisma.tenant.create({
        data: {
            nome_restaurante: 'Demo Restaurant',
            slug: 'demo-restaurant',
            plano: 'enterprise',
        },
    });

    await prisma.user.create({
        data: {
            tenant_id: tenant.id,
            nome: 'Demo Owner',
            email: 'owner@demo.com',
            password_hash: passwordHash,
            role: 'owner',
        },
    });

    console.log('Seed completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
