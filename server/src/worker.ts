import { Worker } from 'bullmq';
import { redisConnection } from './config/redis.js'; 
import { QUEUE_NAME } from './queue/workflowQueue.js';
import workerProcessor from './workerProcessor.js'; 

console.log(`🚀 Worker Manager Starting (In-Process Mode)...`);

const worker = new Worker(QUEUE_NAME, workerProcessor, { 
    connection: redisConnection,
});

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} finished`);
});

worker.on('failed', (job, err) => {
    console.log(`❌ Job ${job?.id} failed: ${err.message}`);
});