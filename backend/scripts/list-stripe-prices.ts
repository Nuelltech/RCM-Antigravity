/**
 * list-stripe-prices.ts
 *
 * Lists all active prices from your Stripe account, grouped by product.
 * Use this to find the correct price_xxx IDs to put in the database.
 *
 * Usage:
 *   cd backend
 *   npx ts-node scripts/list-stripe-prices.ts
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        console.error('❌ STRIPE_SECRET_KEY is not set');
        process.exit(1);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    console.log('\n📋 Active prices in your Stripe account:\n');
    console.log('─'.repeat(80));

    // Fetch all active prices with their products
    const prices = await stripe.prices.list({
        active: true,
        expand: ['data.product'],
        limit: 100,
    });

    // Group by product
    const grouped = new Map<string, { productName: string; prices: Stripe.Price[] }>();

    for (const price of prices.data) {
        const product = price.product as Stripe.Product;
        if (product.deleted) continue;

        const productName = product.name;
        if (!grouped.has(product.id)) {
            grouped.set(product.id, { productName, prices: [] });
        }
        grouped.get(product.id)!.prices.push(price);
    }

    for (const [, { productName, prices: productPrices }] of grouped) {
        console.log(`\n🛍️  Product: ${productName}`);
        for (const price of productPrices) {
            const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
            const currency = price.currency.toUpperCase();
            const interval = price.recurring
                ? `${price.recurring.interval_count > 1 ? price.recurring.interval_count + ' ' : ''}${price.recurring.interval}`
                : 'one-time';
            console.log(`   Price ID : ${price.id}`);
            console.log(`   Amount   : ${amount} ${currency} / ${interval}`);
        }
    }

    console.log('\n' + '─'.repeat(80));

    // Show current DB state
    console.log('\n📊 Current Database State:\n');
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { price_monthly: 'asc' } });

    console.log('Plan Name   | Monthly Price ID              | Yearly Price ID');
    console.log('─'.repeat(80));
    for (const plan of plans) {
        const m = plan.stripe_price_id_monthly ?? '❌ NULL';
        const y = plan.stripe_price_id_yearly ?? '❌ NULL';
        const mOk = m.startsWith('price_') ? '✅' : '❌';
        const yOk = y.startsWith('price_') ? '✅' : '❌';
        console.log(`${plan.name.padEnd(12)}| ${mOk} ${m.padEnd(28)} | ${yOk} ${y}`);
    }

    // Generate SQL to fix
    console.log('\n\n📝 SQL to update (replace price_xxx with the actual IDs above):\n');
    for (const plan of plans) {
        console.log(`-- ${plan.display_name}`);
        console.log(`UPDATE SubscriptionPlan`);
        console.log(`  SET stripe_price_id_monthly = 'price_REPLACE_MONTHLY',`);
        console.log(`      stripe_price_id_yearly  = 'price_REPLACE_YEARLY'`);
        console.log(`  WHERE name = '${plan.name}';\n`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
