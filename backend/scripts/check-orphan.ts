import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const connection = new Redis("redis://93.127.192.117:6379");
const queue = new Queue('invoice-processing', { connection });

async function check() {
    try {
        const invoice = await prisma.faturaImportacao.findUnique({
            where: { id: 22 }
        });
        console.log('DB Invoice 22:', invoice ? `${invoice.id} - ${invoice.status}` : 'Not Found');

        if (invoice) {
            const count = await queue.getJobCounts();
            console.log('Queue Status:', count);

            // Let's check waiting jobs
            const waiting = await queue.getWaiting();
            const delayed = await queue.getDelayed();
            const active = await queue.getActive();

            const isWaiting = waiting.find(j => j.data.invoiceId === 22);
            const isDelayed = delayed.find(j => j.data.invoiceId === 22);
            const isActive = active.find(j => j.data.invoiceId === 22);

            console.log('Is Invoice 22 in Queue?');
            console.log('Waiting:', !!isWaiting);
            console.log('Delayed:', !!isDelayed);
            console.log('Active:', !!isActive);

            if (!isWaiting && !isDelayed && !isActive && invoice.status === 'pending') {
                console.log('ORPHANED INVOICE DETECTED! Re-adding to queue...');
                await queue.add('process-invoice', {
                    invoiceId: invoice.id,
                    tenantId: invoice.tenant_id,
                    ocrText: "Re-injected by support script",
                    filepath: invoice.ficheiro_url,
                    uploadSource: 'web'
                });
                console.log('Successfully re-injected Invoice 22 into BullMQ!');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
        await connection.quit();
    }
}
check();
