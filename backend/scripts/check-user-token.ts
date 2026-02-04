
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

        if (sessionsWithToken.length > 0) {
            console.log('Tokens found:', sessionsWithToken.map(s => s.push_token));
        } else {
            console.log('WARNING: No active sessions have a push token.');
            console.log('The mobile app needs to be opened and logged in to register a token.');
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
