
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Token provided by the user
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
    if (!passwordHash) {
        console.log(`🔑 User has no password. Setting temporary password: ${tempPassword}`);
        passwordHash = await bcrypt.hash(tempPassword, 10);
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

    // Update UserTenant(s) associated with this invite?
    // The token is on the User, effectively inviting them to the system.
    // Usually, there's a specific UserTenant that is pending.
    // The service `acceptInvite` logic implies it activates *active* relationship logic which is a bit ambiguous if multiple pending exist.
    // But `acceptInvite` in `users.service` finds the UserTenant using `this.tenantId`.
    // Since we are running a script, we don't have `this.tenantId`.
    // We should look for any UserTenant for this user that is `ativo: false`.

    const pendingTenants = user.userTenants.filter(ut => !ut.ativo);

    if (pendingTenants.length === 0) {
        console.log('⚠️ No pending (inactive) tenant relationships found for this user.');
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
    if (!user.password_hash) {
        console.log(`⚠️ Please inform the user their temporary password is: ${tempPassword}`);
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
