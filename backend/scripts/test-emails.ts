/**
 * Test subscription email templates
 * Usage: npx ts-node scripts/test-emails.ts your@email.com
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    const targetEmail = process.argv[2];
    if (!targetEmail) {
        console.error('❌ Usage: npx ts-node scripts/test-emails.ts your@email.com');
        process.exit(1);
    }

    const user = { email: targetEmail, name: 'Teste RCM' };
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5);

    const {
        sendTrialExpiringEmail,
        sendTrialExpiredEmail,
        sendPaymentFailedEmail,
        sendAccountSuspendedEmail,
    } = await import('../src/core/email.service');

    console.log(`\n📧 Sending test emails to: ${targetEmail}\n`);

    // 1. Trial expiring soon (3 days warning)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3);
    console.log('1️⃣  Sending: sendTrialExpiringEmail (3 days warning)...');
    await sendTrialExpiringEmail(user, 3, trialEnd);
    console.log('   ✅ Sent!\n');

    // 2. Trial just expired
    console.log('2️⃣  Sending: sendTrialExpiredEmail...');
    await sendTrialExpiredEmail(user);
    console.log('   ✅ Sent!\n');

    // 3. Payment failed
    console.log('3️⃣  Sending: sendPaymentFailedEmail (5 day grace period)...');
    await sendPaymentFailedEmail(user, 5, gracePeriodEnd);
    console.log('   ✅ Sent!\n');

    // 4. Account suspended
    console.log('4️⃣  Sending: sendAccountSuspendedEmail...');
    await sendAccountSuspendedEmail(user);
    console.log('   ✅ Sent!\n');

    console.log('🎉 All test emails sent! Check your inbox.');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
