import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const QUEUE_NAME = 'nexus-workflows';

export const workflowQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, 
    backoff: {
      type: 'exponential', 
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

console.log(`🚀 Queue Initialized: ${QUEUE_NAME}`);