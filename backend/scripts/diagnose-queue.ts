import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis("redis://93.127.192.117:6379");
const queue = new Queue('invoice-processing', { connection });

async function diagnose() {
    console.log('--- DIAGNOSTIC SCRIPT ---');
    try {
        const counts = await queue.getJobCounts();
        console.log('Queue counts:', counts);

        const waiting = await queue.getWaiting();
        if (waiting.length > 0) {
            console.log(`Waiting jobs:`, waiting.map(j => j.id));
        }

        const active = await queue.getActive();
        if (active.length > 0) {
            console.log(`Active jobs:`, active.map(j => j.id));
        }

        if (waiting.length > 0 || active.length > 0) {
            console.log('Jobs exist in Redis but are not finishing. Worker might be dead or deadlocked.');
        } else {
            console.log('Queue is EMPTY. If the invoice is pending, queue.add() failed silently or was lost.');
        }
    } catch (e) {
        console.error('Diagnostic error:', e);
    } finally {
        await connection.quit();
    }
}

diagnose();
