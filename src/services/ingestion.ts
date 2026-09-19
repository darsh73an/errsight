import { Request, Response } from 'express';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ProjectModel } from '../models/Project';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const eventQueue = new Queue('error-events', { connection: redis });

const RATE_LIMIT = 100;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function ingestError(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const project = await ProjectModel.findByApiKey(apiKey);
    if (!project) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Rate limit
    const now = Date.now();
    const rateData = rateLimitMap.get(apiKey);
    
    if (rateData && now < rateData.resetTime) {
      if (rateData.count >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      rateData.count++;
    } else {
      rateLimitMap.set(apiKey, { count: 1, resetTime: now + 60000 });
    }

    const { message, stack, level = 'error', context = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const event = {
      id: uuidv4(),
      projectId: project.id,
      message: String(message).substring(0, 1000),
      stack: stack ? String(stack).substring(0, 5000) : null,
      level,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
      receivedAt: new Date().toISOString(),
    };

    await eventQueue.add('process-error', event, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });

    const duration = Date.now() - startTime;
    logger.info(`Event ${event.id} queued in ${duration}ms`);

    return res.status(200).json({
      success: true,
      eventId: event.id,
      duration: `${duration}ms`,
    });

  } catch (error) {
    logger.error('Ingestion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}