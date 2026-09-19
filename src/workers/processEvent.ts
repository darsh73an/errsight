// src/workers/processEvent.ts
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { ErrorEvent } from '../models/ErrorEvent';
import { ErrorGroup } from '../models/ErrorGroup';
import { generateFingerprint } from '../services/fingerprint';
import { scrubPII } from '../services/scrubber';
import { sendAlert } from '../services/alert';
import { logger } from '../utils/logger';

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

interface ErrorEventData {
  id: string;
  projectId: string;
  message: string;
  stack: string | null;
  level: string;
  context: Record<string, any>;
  receivedAt: string;
}

export function startWorker() {
  const worker = new Worker(
    'error-events',
    async (job: Job<ErrorEventData>) => {
      const { data } = job;
      
      logger.info(`Processing event ${data.id} (attempt ${job.attemptsMade + 1})`);

      try {
        // Step 1: Scrub PII from message and context
        const scrubbedMessage = scrubPII(data.message);
        const scrubbedStack = data.stack ? scrubPII(data.stack) : null;
        const scrubbedContext = scrubContext(data.context);

        // Step 2: Generate fingerprint for grouping
        const fingerprint = generateFingerprint({
          message: scrubbedMessage,
          stack: scrubbedStack,
          level: data.level,
        });

        // Step 3: Find or create error group
        let errorGroup = await ErrorGroup.findOne({
          where: { projectId: data.projectId, fingerprint },
        });

        let isNewGroup = false;

        if (!errorGroup) {
          // Create new group
          errorGroup = await ErrorGroup.create({
            projectId: data.projectId,
            fingerprint,
            message: scrubbedMessage.substring(0, 500),
            stack: scrubbedStack?.substring(0, 2000) || null,
            level: data.level,
            firstSeen: new Date(),
            lastSeen: new Date(),
            eventCount: 1,
            userCount: 1, // simplified; would use unique user IDs in production
            status: 'unresolved',
          });
          isNewGroup = true;
          logger.info(`New error group created: ${fingerprint}`);
        } else {
          // Update existing group
          await errorGroup.increment('eventCount');
          await errorGroup.update({
            lastSeen: new Date(),
            // Update message if this one is cleaner
            message: scrubbedMessage.substring(0, 500),
          });
        }

        // Step 4: Store individual event
        await ErrorEvent.create({
          groupId: errorGroup.id,
          projectId: data.projectId,
          message: scrubbedMessage.substring(0, 1000),
          stack: scrubbedStack?.substring(0, 5000) || null,
          level: data.level,
          context: scrubbedContext,
          timestamp: new Date(data.receivedAt),
        });

        // Step 5: Alert if new group
        if (isNewGroup) {
          await sendAlert({
            projectId: data.projectId,
            groupId: errorGroup.id,
            message: scrubbedMessage,
            level: data.level,
            fingerprint,
          });
        }

        logger.info(`Event ${data.id} processed successfully`);
        return { success: true, groupId: errorGroup.id, isNewGroup };

      } catch (error) {
        logger.error(`Failed to process event ${data.id}:`, error);
        throw error; // BullMQ will retry based on job options
      }
    },
    {
      connection: redis,
      concurrency: 5, // process 5 events in parallel
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    logger.debug(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err.message);
  });

  logger.info('Error processing worker started');
  return worker;
}

// Helper: scrub PII from context object
function scrubContext(context: Record<string, any>): Record<string, any> {
  const scrubbed = { ...context };
  
  // Remove common PII fields
  const piiFields = ['email', 'password', 'token', 'apiKey', 'ssn', 'creditCard'];
  for (const field of piiFields) {
    if (scrubbed[field]) {
      scrubbed[field] = '[REDACTED]';
    }
  }
  
  // Scrub any string values
  for (const key in scrubbed) {
    if (typeof scrubbed[key] === 'string') {
      scrubbed[key] = scrubPII(scrubbed