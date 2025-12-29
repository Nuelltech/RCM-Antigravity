
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'owner@demo.com';
    const newPassword = '123456';

    console.log(`Resetting password for ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.error('User not found!');
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                email_verificado: true // Ensure verification too
            }
        });

        console.log('✅ Password reset successfully!');
        console.log(`Credentials: ${email} / ${newPassword}`);

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
