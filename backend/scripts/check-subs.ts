
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Tenant Subscriptions...');

    const tenants = await prisma.tenant.findMany({
        where: { ativo: true },
        include: {
            subscription: {
                include: { plan: true }
            },
            users: true
        }
    });

    for (const tenant of tenants) {
        console.log(`\nTenant: ${tenant.nome_restaurante} (ID: ${tenant.id})`);
        if (tenant.subscription) {
            console.log(`  - Status: ${tenant.subscription.status}`);
            console.log(`  - Plan: ${tenant.subscription.plan.name}`);
            console.log(`  - Trial End: ${tenant.subscription.trial_end}`);
            console.log(`  - Days Remaining: ${tenant.subscription.trial_end ? Math.ceil((tenant.subscription.trial_end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 'N/A'}`);
        } else {
            console.log(`  - ❌ NO SUBSCRIPTION FOUND`);
        }

        // Check finding owner/admin
        const owner = tenant.users.find(u => u.role === 'owner' || u.role === 'admin');
        if (owner) {
            console.log(`  - Admin/Owner: ${owner.email} (${owner.role})`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
