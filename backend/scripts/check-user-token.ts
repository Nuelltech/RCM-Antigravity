
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Active Sessions for User ID 1...');

    try {
        const sessions = await prisma.session.findMany({
            where: {
                user_id: 1,
                revoked: false
            }
        });

        console.log(`Found ${sessions.length} active sessions.`);

        const sessionsWithToken = sessions.filter(s => s.push_token);
        console.log(`Sessions with Push Token: ${sessionsWithToken.length}`);

        if (sessions.length > 0) {
            console.log('\n--- ACTIVE SESSIONS ---');
            sessions.forEach(s => {
                console.log(`ID: ${s.id} | Created: ${s.createdAt.toISOString()} | Token: ${s.push_token ? '✅ YES' : '❌ NO'} | UA: ${s.user_agent || 'N/A'}`);
                if (s.push_token) console.log(`   └─ Token: ${s.push_token.substring(0, 15)}...`);
            });
            console.log('-----------------------\n');
        } else {
            console.log('WARNING: No active sessions found.');

            // Check for ANY sessions (including revoked/expired)
            const allSessions = await prisma.session.findMany({
                where: { user_id: 1 },
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            if (allSessions.length > 0) {
                console.log('\n--- RECENT HISTORY (Inactive/Revoked) ---');
                allSessions.forEach(s => {
                    console.log(`ID: ${s.id} | Created: ${s.createdAt.toISOString()} | Revoked: ${s.revoked} | Exp: ${s.expires_at.toISOString()}`);
                });
            }
        }
    } catch (err) {
        console.error('Error querying sessions:', err);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
