
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // IDs found in the previous inspection
    const stuckIds = [14, 11, 10];

    console.log(`Deleting stuck invoices with IDs: ${stuckIds.join(', ')}...`);

    const result = await prisma.faturaImportacao.deleteMany({
        where: {
            id: {
                in: stuckIds
            },
            status: 'pending' // Safety check: only delete if still pending
        }
    });

    console.log(`Deleted ${result.count} invoices.`);
    console.log('You can now re-upload the invoice to test the flow.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
