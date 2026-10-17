import { Queue } from 'bullmq';
import { redis } from '../config/redis';

export const QUEUE_NAME = 'error-events';

export const eventQueue = new Queue(QUEUE_NAME, {
  connection: redis,
});

eventQueue.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Event queue error', err);
});

