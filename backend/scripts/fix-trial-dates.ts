
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting trial date fix...');

    const tenants = await prisma.tenant.findMany({
        where: {
            plano: 'trial',
            OR: [
                { trial_ends_at: null },
                { data_expiracao_plano: null }
            ]
        }
    });

    console.log(`Found ${tenants.length} tenants with missing trial dates.`);

    for (const tenant of tenants) {
        // Set new trial end date to 14 days from now to give them a fresh start/fix
        const newTrialEnd = new Date();
        newTrialEnd.setDate(newTrialEnd.getDate() + 14);

        await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                trial_ends_at: newTrialEnd,
                data_expiracao_plano: newTrialEnd,
                status: 'trial' // Ensure status is trial
            }
        });

        console.log(`Updated tenant: ${tenant.nome_restaurante} (${tenant.slug}) -> Trial ends: ${newTrialEnd.toISOString()}`);
    }

    console.log('Fix complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
