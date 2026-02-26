import { Worker, Queue } from 'bullmq';
import { prisma } from '../core/database';
import * as emailService from '../core/email.service';

/** Shared grace period constant — must match subscriptions.service.ts */
const GRACE_PERIOD_DAYS = 3;

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const SUBSCRIPTION_CHECK_QUEUE = 'subscription-check-queue';

// Queue for scheduling
export const subscriptionCheckQueue = new Queue(SUBSCRIPTION_CHECK_QUEUE, { connection });

/**
 * Daily subscription lifecycle worker.
 *
 * Runs at 02:00 every day. Handles three separate scenarios:
 *
 * 1. Warn trial tenants expiring in 3 days → email
 * 2. Trial expired (no payment) → move to `past_due` + start 3-day grace period
 * 3. Grace period expired → `suspendAccount()`
 */
export const subscriptionCheckWorker = new Worker(SUBSCRIPTION_CHECK_QUEUE, async (job) => {
    console.log('[SUBSCRIPTION WORKER] 🔍 Starting daily subscription lifecycle check...');

    const now = new Date();

    // ── JOB 1: Warn trials expiring in exactly 3 days ─────────────────────────
    const warnFrom = new Date(now);
    warnFrom.setDate(now.getDate() + 2);
    warnFrom.setHours(0, 0, 0, 0);

    const warnTo = new Date(now);
    warnTo.setDate(now.getDate() + 3);
    warnTo.setHours(23, 59, 59, 999);

    const warningSoon = await prisma.tenantSubscription.findMany({
        where: {
            status: 'trial',
            trial_end: { gte: warnFrom, lte: warnTo },
        },
        include: {
            tenant: {
                include: {
                    userTenants: {
                        where: { role: 'admin' },
                        include: { user: true },
                    },
                },
            },
        },
    });

    for (const sub of warningSoon) {
        for (const ut of sub.tenant.userTenants) {
            try {
                await emailService.sendTrialExpiringEmail(
                    { email: ut.user.email, name: ut.user.nome },
                    3,
                    sub.trial_end!
                );
                console.log(`[SUBSCRIPTION WORKER] 📧 Trial warning sent to ${ut.user.email} (Tenant: ${sub.tenant.slug})`);
            } catch (err) {
                console.error(`[SUBSCRIPTION WORKER] Email error for ${ut.user.email}:`, err);
            }
        }
    }

    // ── JOB 2: Trial expired → start grace period ─────────────────────────────
    // Trials that ended before now and are still in 'trial' status
    const expiredTrials = await prisma.tenantSubscription.findMany({
        where: {
            status: 'trial',
            trial_end: { lt: now },
        },
        include: {
            tenant: {
                include: {
                    userTenants: {
                        where: { role: 'admin' },
                        include: { user: true },
                    },
                },
            },
        },
    });



    for (const sub of expiredTrials) {
        const gracePeriodEnd = new Date(now);
        gracePeriodEnd.setDate(now.getDate() + GRACE_PERIOD_DAYS);

        await prisma.tenantSubscription.update({
            where: { id: sub.id },
            data: {
                status: 'past_due',
                payment_failed_at: now,
                grace_period_end: gracePeriodEnd,
            },
        });

        // Also update tenant status for quick checks
        await prisma.tenant.update({
            where: { id: sub.tenant_id },
            data: { status: 'payment_overdue' },
        });

        for (const ut of sub.tenant.userTenants) {
            try {
                await emailService.sendTrialExpiredEmail(
                    { email: ut.user.email, name: ut.user.nome }
                );
                console.log(`[SUBSCRIPTION WORKER] 📧 Trial-expired notice sent to ${ut.user.email} (Tenant: ${sub.tenant.slug}) — ${GRACE_PERIOD_DAYS} day grace period started`);
            } catch (err) {
                console.error(`[SUBSCRIPTION WORKER] Email error for ${ut.user.email}:`, err);
            }
        }
    }

    // ── JOB 3: Grace period expired → suspend account ─────────────────────────
    const toSuspend = await prisma.tenantSubscription.findMany({
        where: {
            status: 'past_due',
            grace_period_end: { lt: now },
        },
        include: {
            tenant: {
                include: {
                    userTenants: {
                        where: { role: 'admin' },
                        include: { user: true },
                    },
                },
            },
        },
    });

    for (const sub of toSuspend) {
        // Suspend both subscription and tenant
        await prisma.tenantSubscription.update({
            where: { id: sub.id },
            data: {
                status: 'suspended',
                suspension_date: now,
                suspension_reason: 'Grace period expired after trial/payment failure',
            },
        });

        await prisma.tenant.update({
            where: { id: sub.tenant_id },
            data: {
                status: 'suspended',
                suspended_at: now,
                suspension_reason: 'Grace period expired — no payment received',
            },
        });

        for (const ut of sub.tenant.userTenants) {
            try {
                await emailService.sendAccountSuspendedEmail(
                    { email: ut.user.email, name: ut.user.nome }
                );
                console.log(`[SUBSCRIPTION WORKER] 🚫 Suspended tenant ${sub.tenant.slug} — notified ${ut.user.email}`);
            } catch (err) {
                console.error(`[SUBSCRIPTION WORKER] Email error for ${ut.user.email}:`, err);
            }
        }
    }

    console.log(`[SUBSCRIPTION WORKER] ✅ Daily check complete:`);
    console.log(`  📧 Warnings sent: ${warningSoon.length}`);
    console.log(`  ⏳ Trials moved to grace: ${expiredTrials.length}`);
    console.log(`  🚫 Accounts suspended: ${toSuspend.length}`);

}, {
    connection,
    lockDuration: 60_000, // 1 min lock
});

// Helper to schedule the job (called on server startup)
export async function scheduleSubscriptionChecks() {
    // Remove any existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await subscriptionCheckQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await subscriptionCheckQueue.removeRepeatableByKey(job.key);
    }

    // Schedule for 02:00 AM every day
    await subscriptionCheckQueue.add('daily-lifecycle-check', {}, {
        repeat: {
            pattern: '0 2 * * *',
        },
    });

    console.log('[SUBSCRIPTION WORKER] 🕒 Scheduled daily lifecycle check for 02:00 AM');
}
