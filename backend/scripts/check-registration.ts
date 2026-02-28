
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    try {
        const emails = ['nuno_rogerio@hotmail.com', 'nrmm81@gmail.com'];
        const nifs = ['504405197'];

        console.log('--- Users ---');
        for (const email of emails) {
            const user = await prisma.user.findUnique({ where: { email } });
            console.log(`Email ${email}: ${user ? 'FOUND (ID: ' + user.id + ')' : 'NOT FOUND'}`);
        }

        console.log('\n--- Tenants ---');
        for (const nif of nifs) {
            const tenant = await prisma.tenant.findUnique({ where: { nif } });
            console.log(`NIF ${nif}: ${tenant ? 'FOUND (ID: ' + tenant.id + ')' : 'NOT FOUND'}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
