// src/queues/index.ts
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export const eventQueue = new Queue('error-events', {
  connection: redis,
});

export async function closeQueues() {
  await eventQueue.close();
}