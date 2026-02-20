import { Worker, Queue } from 'bullmq';
import { prisma } from '../core/database';
import * as emailService from '../core/email.service';

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const SUBSCRIPTION_CHECK_QUEUE = 'subscription-check-queue';

// Queue for scheduling
export const subscriptionCheckQueue = new Queue(SUBSCRIPTION_CHECK_QUEUE, { connection });

// Worker Implementation
export const subscriptionCheckWorker = new Worker(SUBSCRIPTION_CHECK_QUEUE, async (job) => {
    console.log('[SUBSCRIPTION WORKER] 🔍 Starting daily subscription check (Source: TenantSubscription)...');

    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    // 1. Alert: Expiring in 3 days (trial_ends_at is roughly 3 days from now)
    // Source: TenantSubscription
    const expiringSoon = await prisma.tenantSubscription.findMany({
        where: {
            status: 'trial',
            trial_end: {
                gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
                lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999))
            }
        },
        include: {
            tenant: {
                include: {
                    userTenants: {
                        where: { role: 'admin' },
                        include: { user: true }
                    }
                }
            }
        }
    });

    for (const sub of expiringSoon) {
        for (const ut of sub.tenant.userTenants) {
            await emailService.sendTrialExpiringEmail(
                { email: ut.user.email, name: ut.user.nome },
                3,
                sub.trial_end!
            );
            console.log(`[SUBSCRIPTION WORKER] Sent expiry warning to ${ut.user.email} (Tenant: ${sub.tenant.slug})`);
        }
    }

    // 2. Alert: Suspended (Expired > 3 days ago)
    // trial_ends_at < today - 3 days AND status != suspended
    const trafficCutoff = new Date();
    trafficCutoff.setDate(today.getDate() - 4); // safely > 3 days

    const toSuspend = await prisma.tenantSubscription.findMany({
        where: {
            status: { in: ['trial', 'grace_period'] }, // Check active trials or grace
            trial_end: {
                lt: trafficCutoff
            }
        },
        include: {
            tenant: {
                include: {
                    userTenants: {
                        where: { role: 'admin' },
                        include: { user: true }
                    }
                }
            }
        }
    });

    for (const sub of toSuspend) {
        // Update subscription status to suspended
        await prisma.tenantSubscription.update({
            where: { id: sub.id },
            data: {
                status: 'suspended',
                suspension_date: new Date(),
                suspension_reason: 'Trial period expired > 3 days ago'
            }
        });

        // Also update legacy tenant table for backward compatibility (optional but safe)
        await prisma.tenant.update({
            where: { id: sub.tenant_id },
            data: { status: 'suspended', suspended_at: new Date() }
        });

        // Notify
        for (const ut of sub.tenant.userTenants) {
            await emailService.sendAccountSuspendedEmail(
                { email: ut.user.email, name: ut.user.nome }
            );
            console.log(`[SUBSCRIPTION WORKER] Suspended tenant ${sub.tenant.slug} and notified ${ut.user.email}`);
        }
    }

    console.log(`[SUBSCRIPTION WORKER] ✅ Check complete. Warnings: ${expiringSoon.length}, Suspensions: ${toSuspend.length}`);

}, {
    connection,
    lockDuration: 60000 // 1 min lock
});

// Helper to schedule the job (call this on server startup)
export async function scheduleSubscriptionChecks() {
    // Determine cron pattern: Every day at 02:00 AM
    await subscriptionCheckQueue.add('daily-check', {}, {
        repeat: {
            pattern: '0 2 * * *'
        }
    });
    console.log('[SUBSCRIPTION WORKER] 🕒 Scheduled daily check for 02:00 AM');
}
