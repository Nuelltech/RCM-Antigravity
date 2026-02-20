
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_TO_DELETE = process.argv[2];

async function main() {
    if (!EMAIL_TO_DELETE) {
        console.error('Please provide an email address as an argument.');
        process.exit(1);
    }

    console.log(`Searching for user with email: ${EMAIL_TO_DELETE}...`);

    const user = await prisma.user.findUnique({
        where: { email: EMAIL_TO_DELETE },
        include: {
            tenants: {
                include: { tenant: true }
            }
        }
    });

    if (!user) {
        console.error('User not found.');
        process.exit(1);
    }

    console.log(`Found user: ${user.nome} (ID: ${user.id})`);

    if (user.tenants.length > 0) {
        console.log(`User is associated with ${user.tenants.length} tenant(s).`);

        for (const ut of user.tenants) {
            const tenant = ut.tenant;
            console.log(`Processing tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})`);

            // Check if there are other users in this tenant
            const otherUsersCount = await prisma.userTenant.count({
                where: {
                    tenant_id: tenant.id,
                    user_id: { not: user.id }
                }
            });

            if (otherUsersCount === 0) {
                console.log(`Deleting tenant ${tenant.nome_restaurante} (no other users)...`);

                const tenantId = tenant.id;

                try {
                    await prisma.$transaction(async (tx) => {
                        // 1. Logs
                        await tx.auditLog.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.errorLog.deleteMany({ where: { tenant_id: tenantId } });

                        // 2. Billing
                        await tx.tenantSubscription.deleteMany({ where: { tenant_id: tenantId } });

                        // 3. Operational
                        await tx.vendaLinhaImportacao.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.vendaImportacao.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.venda.deleteMany({ where: { tenant_id: tenantId } });

                        // 4. Catalog
                        await tx.menuItem.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.receita.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.compraItem.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.compraFatura.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.compra.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.produto.deleteMany({ where: { tenant_id: tenantId } });

                        // 5. Relations
                        await tx.userTenant.deleteMany({ where: { tenant_id: tenantId } });
                        await tx.session.deleteMany({ where: { tenant_id: tenantId } });

                        // 6. Delete Tenant
                        await tx.tenant.delete({ where: { id: tenantId } });
                    });
                    console.log('Tenant deleted.');
                } catch (err) {
                    console.error('Error deleting tenant:', err);
                }
            } else {
                console.log(`Skipping tenant deletion, there are ${otherUsersCount} other users.`);
                // Just remove the link for this user
                await prisma.userTenant.deleteMany({
                    where: { user_id: user.id, tenant_id: tenant.id }
                });
                console.log('User removed from tenant.');
            }
        }
    } else {
        console.log('User has no tenants linked.');
    }

    // Finally delete the user
    try {
        await prisma.user.delete({ where: { id: user.id } });
        console.log('User deleted successfully.');
    } catch (e) {
        console.error('Error deleting user:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
