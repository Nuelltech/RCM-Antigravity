/**
 * sync-stripe-prices.ts
 *
 * Automatically matches Stripe prices to DB plans by EUR amount,
 * then updates the DB with the correct price_xxx IDs.
 *
 * Usage:
 *   cd backend
 *   npx ts-node scripts/sync-stripe-prices.ts
 *
 * Add --dry-run to preview without saving to DB.
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const OK = (msg: string) => console.log(`   ✅ ${msg}`);
const ERR = (msg: string) => console.error(`   ❌ ${msg}`);
const WRN = (msg: string) => console.warn(`   ⚠️  ${msg}`);
const HDR = (msg: string) => console.log(`\n${'─'.repeat(60)}\n📋 ${msg}\n${'─'.repeat(60)}`);

async function main() {
    console.log('\n🔧 RCM — Stripe Price Sync');
    console.log('   Running at:', new Date().toISOString());
    if (DRY_RUN) console.log('   📝 DRY RUN — no DB changes will be made');

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) { console.error('❌ STRIPE_SECRET_KEY not set'); process.exit(1); }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // ── 1. Fetch all EUR recurring prices from Stripe ─────────────────────────
    HDR('1. Fetching prices from Stripe');

    const stripeResponse = await stripe.prices.list({
        active: true,
        expand: ['data.product'],
        limit: 100,
    });

    // Only EUR recurring prices (ignore USD test products, one-time, etc.)
    const recurringEur = stripeResponse.data.filter(
        p => p.currency === 'eur' && p.recurring && !(p.product as Stripe.Product).deleted
    );

    console.log(`\n   Found ${stripeResponse.data.length} active prices in Stripe`);
    console.log(`   Using ${recurringEur.length} EUR recurring prices:\n`);

    for (const price of recurringEur) {
        const product = price.product as Stripe.Product;
        const amount = ((price.unit_amount ?? 0) / 100).toFixed(2);
        const interval = price.recurring!.interval;
        console.log(`   ${price.id}  →  ${product.name} | €${amount}/${interval}`);
    }

    // ── 2. Load DB plans ──────────────────────────────────────────────────────
    HDR('2. Plans in Database');

    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { price_monthly: 'asc' } });

    for (const plan of plans) {
        console.log(`   📦 ${plan.display_name} | €${plan.price_monthly}/month | €${plan.price_yearly}/year`);
    }

    // ── 3. Auto-match by price amount ─────────────────────────────────────────
    HDR('3. Matching prices to plans');

    let updates = 0;
    let missing = 0;

    for (const plan of plans) {
        console.log(`\n   📦 ${plan.display_name}:`);

        const mPrice = Number(plan.price_monthly || 0);
        const yPrice = Number(plan.price_yearly || 0);

        // We match by name now (e.g., 'base', 'standard', 'plus' from plan.name)
        const planKeyword = plan.name.toLowerCase().replace(' plan', '').replace('plano ', '').trim();

        // Find matching monthly price by NAME
        const monthlyPrice = recurringEur.find(p => {
            const product = p.product as Stripe.Product;
            return product.name.toLowerCase().includes(planKeyword) && p.recurring?.interval === 'month';
        });

        // Find matching yearly price by NAME
        const yearlyPrice = recurringEur.find(p => {
            const product = p.product as Stripe.Product;
            return product.name.toLowerCase().includes(planKeyword) && p.recurring?.interval === 'year';
        });

        const updateData: any = {};

        if (monthlyPrice) {
            const product = monthlyPrice.product as Stripe.Product;
            const stripeAmount = (monthlyPrice.unit_amount ?? 0) / 100;
            OK(`Monthly match: ${monthlyPrice.id} (${product.name}) | Syncing €${stripeAmount}`);
            updateData.stripe_price_id_monthly = monthlyPrice.id;
            updateData.price_monthly = stripeAmount; // Sync Stripe amount to DB
            updates++;
        } else {
            ERR(`No monthly Stripe price found containing keyword '${planKeyword}'`);
            missing++;
        }

        if (yearlyPrice) {
            const product = yearlyPrice.product as Stripe.Product;
            const stripeAmount = (yearlyPrice.unit_amount ?? 0) / 100;
            OK(`Yearly match:  ${yearlyPrice.id} (${product.name}) | Syncing €${stripeAmount}`);
            updateData.stripe_price_id_yearly = yearlyPrice.id;
            updateData.price_yearly = stripeAmount; // Sync Stripe amount to DB
            updates++;
        } else if (yPrice > 0 || plan.name !== 'free') {
            // Only complain about missing yearly plan if it's not the free plan
            ERR(`No yearly Stripe price found containing keyword '${planKeyword}'`);
            missing++;
        }

        // Update DB
        if (Object.keys(updateData).length > 0 && !DRY_RUN) {
            await prisma.subscriptionPlan.update({
                where: { name: plan.name },
                data: updateData,
            });
            console.log(`   💾 DB updated for plan "${plan.name}"`);
        } else if (DRY_RUN && Object.keys(updateData).length > 0) {
            WRN(`DRY RUN — would update plan "${plan.name}" with: ${JSON.stringify(updateData)}`);
        }
    }

    // ── 4. Summary ────────────────────────────────────────────────────────────
    HDR('4. Summary');

    if (!DRY_RUN) {
        console.log(`   💾 Updated ${updates} price ID(s) in the database`);
    }

    if (missing > 0) {
        WRN(`${missing} price(s) couldn't be matched. You need to create them in Stripe:`);
        console.log('\n   Go to: https://dashboard.stripe.com/test/products/create');
        console.log('   For each missing price, create a product with a recurring EUR price.');
        console.log('   Then re-run this script.\n');
    } else {
        console.log('\n   🎉 All prices matched and updated!');
        if (!DRY_RUN) {
            console.log('   Run validate-stripe.ts to confirm everything is correct.\n');
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
