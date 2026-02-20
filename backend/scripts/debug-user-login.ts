
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserData(email: string) {
    console.log(`Checking data for user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            tenants: {
                include: {
                    tenant: true
                }
            }
        }
    });

    if (!user) {
        console.log("User not found.");
        return;
    }

    console.log("User found:", {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: "N/A (Defined in user_tenants)"
    });

    console.log("\nTenants:");
    user.tenants.forEach((ut: any) => {
        console.log(`- Tenant ID: ${ut.tenantId}`);
        console.log(`  Name: ${ut.tenant.nome_restaurante}`);
        console.log(`  Role in Tenant: ${ut.role}`);
        console.log(`  Active: ${ut.ativo}`);
        console.log(`  Tenant Active: ${ut.tenant.ativo}`);
    });
}

checkUserData('nuno_rogerio@hotmail.com')
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
