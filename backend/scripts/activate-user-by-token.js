
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Token provided by the user
    // const token = 'af6e2f64707aaeea1b9e141b1402a3cb491d82ab67548135fbbff6a32d876dae';
    const token = 'af6e2f64707aaeea1b9e141b1402a3cb491d82ab67548135fbbff6a32d876dae';
    const tempPassword = 'Start123!'; // Temporary password

    console.log(`🔍 Searching for user with token: ${token}`);

    const user = await prisma.user.findFirst({
        where: {
            verification_code: token,
        },
        include: {
            userTenants: true
        }
    });

    if (!user) {
        console.error('❌ User not found with this token.');
        return;
    }

    console.log(`✅ Found user: ${user.nome} (${user.email})`);

    // Check if user already has a password
    let passwordHash = user.password_hash;
    let passwordUpdated = false;

    if (!passwordHash) {
        console.log(`🔑 User has no password. Setting temporary password: ${tempPassword}`);
        passwordHash = await bcrypt.hash(tempPassword, 10);
        passwordUpdated = true;
    } else {
        console.log('🔒 User already has a password set. Keeping it.');
    }

    // Update User
    await prisma.user.update({
        where: { id: user.id },
        data: {
            email_verificado: true,
            verification_code: null,
            verification_code_expires_at: null,
            password_hash: passwordHash,
        },
    });
    console.log('✅ User updated (email verified, token cleared).');

    // Find pending tenants
    const pendingTenants = user.userTenants.filter(ut => !ut.ativo);

    if (pendingTenants.length === 0) {
        console.log('⚠️ No pending (inactive) tenant relationships found for this user.');
        // Maybe force activate all related tenants even if they are somehow active but weird?
        // No, let's stick to logic.
    } else {
        for (const ut of pendingTenants) {
            await prisma.userTenant.update({
                where: {
                    user_id_tenant_id: {
                        user_id: ut.user_id,
                        tenant_id: ut.tenant_id
                    }
                },
                data: {
                    ativo: true,
                    activated_at: new Date()
                }
            });
            console.log(`✅ Activated access to Tenant ID: ${ut.tenant_id}`);
        }
    }

    console.log('\n🎉 Activation Complete!');
    if (passwordUpdated) {
        console.log(`⚠️  temporary password is: ${tempPassword}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
