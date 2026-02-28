/**
 * validate-stripe.ts
 *
 * Validates the Stripe configuration and database data.
 * Runs all checks and reports any issues found.
 *
 * Usage:
 *   cd backend
 *   npx ts-node scripts/validate-stripe.ts
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// ── Colour helpers ────────────────────────────────────────────────────────────
const OK = (msg: string) => console.log(`   ✅ ${msg}`);
const ERR = (msg: string) => console.error(`   ❌ ${msg}`);
const WRN = (msg: string) => console.warn(`   ⚠️  ${msg}`);
const HDR = (msg: string) => console.log(`\n${'─'.repeat(60)}\n📋 ${msg}\n${'─'.repeat(60)}`);

let totalErrors = 0;

function fail(msg: string) {
    ERR(msg);
    totalErrors++;
}

async function main() {
    console.log('\n🔍 RCM — Stripe Validation Script');
    console.log('   Running at:', new Date().toISOString());

    // ── 1. ENV VARS ───────────────────────────────────────────────────────────
    HDR('1. Environment Variables');

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const frontendUrl = process.env.FRONTEND_URL;

    if (!stripeSecretKey) {
        fail('STRIPE_SECRET_KEY is not set');
    } else if (!stripeSecretKey.startsWith('sk_')) {
        fail(`STRIPE_SECRET_KEY looks invalid — starts with: "${stripeSecretKey.slice(0, 8)}..."`);
    } else {
        const mode = stripeSecretKey.startsWith('sk_test_') ? '(TEST mode 🧪)' : '(LIVE mode 🚀)';
        OK(`STRIPE_SECRET_KEY is set ${mode}`);
    }

    if (!stripeWebhookSecret) {
        WRN('STRIPE_WEBHOOK_SECRET is not set — webhooks won\'t be verified');
    } else if (!stripeWebhookSecret.startsWith('whsec_')) {
        fail(`STRIPE_WEBHOOK_SECRET looks invalid — should start with "whsec_"`);
    } else {
        OK('STRIPE_WEBHOOK_SECRET is set');
    }

    if (!frontendUrl) {
        WRN('FRONTEND_URL is not set — success/cancel redirect URLs will use localhost:3000');
    } else {
        OK(`FRONTEND_URL = ${frontendUrl}`);
    }

    if (!stripeSecretKey) {
        fail('Cannot continue without STRIPE_SECRET_KEY');
        process.exit(1);
    }

    // ── 2. STRIPE API CONNECTION ──────────────────────────────────────────────
    HDR('2. Stripe API Connection');

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    try {
        const account = await stripe.accounts.retrieve();
        OK(`Connected to Stripe account: ${account.email || account.id}`);
        OK(`Charges enabled: ${account.charges_enabled}`);
    } catch (err: any) {
        fail(`Cannot connect to Stripe: ${err.message}`);
        console.error('   Full error:', err.raw?.message || err.message);
        process.exit(1);
    }

    // ── 3. DATABASE — SUBSCRIPTION PLANS ─────────────────────────────────────
    HDR('3. Subscription Plans in Database');

    const plans = await prisma.subscriptionPlan.findMany({
        orderBy: { price_monthly: 'asc' },
    });

    if (plans.length === 0) {
        fail('No subscription plans found in database!');
    } else {
        OK(`Found ${plans.length} plan(s) in database`);
    }

    const priceIdsToValidate: { planName: string; period: string; priceId: string }[] = [];

    for (const plan of plans) {
        console.log(`\n   📦 Plan: ${plan.display_name} (name="${plan.name}")`);
        console.log(`      Price: €${plan.price_monthly}/month, €${plan.price_yearly}/year`);

        if (!plan.stripe_price_id_monthly) {
            fail(`stripe_price_id_monthly is NULL for plan "${plan.name}"`);
        } else {
            OK(`stripe_price_id_monthly = ${plan.stripe_price_id_monthly}`);
            priceIdsToValidate.push({
                planName: plan.name,
                period: 'monthly',
                priceId: plan.stripe_price_id_monthly,
            });
        }

        if (!plan.stripe_price_id_yearly) {
            WRN(`stripe_price_id_yearly is NULL for plan "${plan.name}" (yearly billing won't work)`);
        } else {
            OK(`stripe_price_id_yearly  = ${plan.stripe_price_id_yearly}`);
            priceIdsToValidate.push({
                planName: plan.name,
                period: 'yearly',
                priceId: plan.stripe_price_id_yearly,
            });
        }
    }

    // ── 4. VALIDATE PRICE IDs AGAINST STRIPE API ──────────────────────────────
    HDR('4. Validating Price IDs Against Stripe');

    for (const item of priceIdsToValidate) {
        try {
            const price = await stripe.prices.retrieve(item.priceId);
            const active = price.active ? '✅' : '⚠️  INACTIVE';
            const currency = price.currency.toUpperCase();
            const amount = price.unit_amount ? `${(price.unit_amount / 100).toFixed(2)} ${currency}` : 'N/A';
            console.log(`   ${active} [${item.planName}/${item.period}] ${item.priceId} → ${amount}`);

            if (!price.active) {
                fail(`Price ${item.priceId} is INACTIVE in Stripe — activate it in the Stripe Dashboard`);
            }
        } catch (err: any) {
            fail(`[${item.planName}/${item.period}] Price ID "${item.priceId}" NOT FOUND in Stripe: ${err.raw?.message || err.message}`);
        }
    }

    // ── 5. TENANT SUBSCRIPTIONS ───────────────────────────────────────────────
    HDR('5. Tenant Subscriptions in Database');

    const subscriptions = await prisma.tenantSubscription.findMany({
        include: {
            tenant: { select: { nome_restaurante: true, email_contacto: true } },
            plan: { select: { display_name: true } },
        },
    });

    if (subscriptions.length === 0) {
        WRN('No tenant subscriptions found');
    } else {
        OK(`Found ${subscriptions.length} tenant subscription(s)`);
    }

    for (const sub of subscriptions) {
        console.log(`\n   🏢 ${sub.tenant.nome_restaurante} (tenant_id=${sub.tenant_id})`);
        console.log(`      Plan: ${sub.plan?.display_name || 'N/A'} | Status: ${sub.status}`);

        if (!sub.stripe_customer_id) {
            WRN(`No stripe_customer_id — will be created on first checkout attempt`);
        } else {
            // Validate the customer ID against Stripe
            try {
                const customer = await stripe.customers.retrieve(sub.stripe_customer_id);
                if ((customer as any).deleted) {
                    fail(`stripe_customer_id "${sub.stripe_customer_id}" is DELETED in Stripe`);
                } else {
                    OK(`stripe_customer_id = ${sub.stripe_customer_id} (${(customer as Stripe.Customer).email || 'no email'})`);
                }
            } catch (err: any) {
                fail(`stripe_customer_id "${sub.stripe_customer_id}" NOT FOUND in Stripe: ${err.raw?.message || err.message}`);
            }
        }

        if (!sub.stripe_subscription_id) {
            sub.status === 'trial'
                ? OK('No stripe_subscription_id — expected during trial')
                : WRN('No stripe_subscription_id');
        } else {
            // Validate the subscription ID
            try {
                const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
                OK(`stripe_subscription_id = ${sub.stripe_subscription_id} (status: ${stripeSub.status})`);
                if (stripeSub.status !== sub.status && sub.status !== 'trial') {
                    WRN(`Status mismatch! DB says "${sub.status}" but Stripe says "${stripeSub.status}"`);
                    totalErrors++;
                }
            } catch (err: any) {
                fail(`stripe_subscription_id "${sub.stripe_subscription_id}" NOT FOUND in Stripe: ${err.raw?.message || err.message}`);
            }
        }
    }

    // ── 6. SUMMARY ────────────────────────────────────────────────────────────
    HDR('Summary');

    if (totalErrors === 0) {
        console.log('🎉 All checks passed! Stripe configuration looks good.\n');
    } else {
        console.error(`🚨 Found ${totalErrors} error(s). Fix the issues above before attempting checkout.\n`);
    }
}

main()
    .catch((err) => {
        console.error('\n💥 Unexpected error:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
