import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { ErrorEventModel } from '../models/ErrorEvent';
import { ErrorGroupModel } from '../models/ErrorGroup';
import { generateFingerprint } from '../services/fingerprint';
import { scrubPII } from '../services/scrubber';
import { sendAlert } from '../services/alert';
import { logger } from '../utils/logger';

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
      
      logger.info(`Processing event ${data.id}`);

      try {
        const scrubbedMessage = scrubPII(data.message);
        const scrubbedStack = data.stack ? scrubPII(data.stack) : null;

        const fingerprint = generateFingerprint({
          message: scrubbedMessage,
          stack: scrubbedStack,
          level: data.level,
        });

        let errorGroup = await ErrorGroupModel.findByFingerprint(
          data.projectId, 
          fingerprint
        );

        let isNewGroup = false;

        if (!errorGroup) {
          errorGroup = await ErrorGroupModel.create({
            projectId: data.projectId,
            fingerprint,
            title: scrubbedMessage.substring(0, 200),
            type: data.level,
            level: data.level,
          });
          isNewGroup = true;
          logger.info(`New error group: ${fingerprint}`);
        } else {
          await ErrorGroupModel.incrementCount(errorGroup.id);
        }

        await ErrorEventModel.create({
          errorGroupId: errorGroup.id,
          projectId: data.projectId,
          message: scrubbedMessage.substring(0, 1000),
          stackTrace: scrubbedStack?.substring(0, 5000),
          level: data.level,
          context: data.context,
        });

        if (isNewGroup) {
          await sendAlert({
            projectId: data.projectId,
            groupId: errorGroup.id,
            message: scrubbedMessage,
            level: data.level,
            fingerprint,
          });
        }

        logger.info(`Event ${data.id} processed`);
        return { success: true, groupId: errorGroup.id, isNewGroup };

      } catch (error) {
        logger.error(`Failed to process event ${data.id}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err.message);
  });

  logger.info('Error processing worker started');
  return worker;
}