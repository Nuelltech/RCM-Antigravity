
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing top 5 most recent invoices...');

    const invoices = await prisma.faturaImportacao.findMany({
        take: 5,
        orderBy: {
            createdAt: 'desc'
        }
    });

    if (invoices.length === 0) {
        console.log('No invoices found in database.');
    } else {
        for (const inv of invoices) {
            console.log(`[${inv.id}] ${inv.createdAt.toISOString()} | Status: ${inv.status} | File: ${inv.ficheiro_nome}`);

            if (inv.status === 'pending') {
                // Check metrics for pending invoices to see if they were touched
                const logs = await prisma.invoiceProcessingMetrics.findMany({
                    where: { invoice_id: inv.id }
                });
                console.log(`    -> Metrics Found: ${logs.length}`);
            }
        }
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
