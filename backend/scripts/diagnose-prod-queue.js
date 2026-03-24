const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.production' });

async function diagnose() {
    console.log("Connecting to Redis: " + process.env.REDIS_URL);
    const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        family: 4
    });

    const queue = new Queue('invoice-processing', { connection: redis });

    console.log("Queue name:", queue.name);
    
    // Get job counts
    const counts = await queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed', 'paused');
    console.log("Job Counts:", counts);

    // If waiting or delayed, print the job IDs
    const waiting = await queue.getWaiting();
    console.log("Waiting jobs:", waiting.map(j => ({ id: j.id, name: j.name })));

    const active = await queue.getActive();
    console.log("Active jobs:", active.map(j => ({ id: j.id, name: j.name })));

    const failed = await queue.getFailed();
    console.log("Failed jobs:", failed.slice(0, 5).map(j => ({ id: j.id, name: j.name, failedReason: j.failedReason })));

    await redis.quit();
}

diagnose().catch(console.error);
