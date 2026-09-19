// src/services/ingestion.ts
import { Request, Response } from 'express';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { Project } from '../models/Project';

// Redis connection for queue
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// Queue for background processing
const eventQueue = new Queue('error-events', {
  connection: redis,
});

// Rate limiting: max events per minute per project
const RATE_LIMIT = 100;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function ingestError(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    // 1. Get API key from header
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    // 2. Validate project (fast DB check)
    const project = await Project.findOne({ where: { apiKey } });
    if (!project) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // 3. Rate limit check (in-memory, fast)
    const now = Date.now();
    const rateData = rateLimitMap.get(apiKey);
    
    if (rateData && now < rateData.resetTime) {
      if (rateData.count >= RATE_LIMIT) {
        logger.warn(`Rate limit exceeded for project ${project.id}`);
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      rateData.count++;
    } else {
      rateLimitMap.set(apiKey, { count: 1, resetTime: now + 60000 });
    }

    // 4. Validate payload
    const { message, stack, level = 'error', context = {} } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 5. Create event object
    const event = {
      id: uuidv4(),
      projectId: project.id,
      message: message.substring(0, 1000), // limit size
      stack: stack?.substring(0, 5000) || null,
      level,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
      receivedAt: new Date().toISOString(),
    };

    // 6. Push to queue (fast, non-blocking)
    await eventQueue.add('process-error', event, {
      attempts: 3, // retry 3 times if worker fails
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s
      },
      removeOnComplete: 100, // keep last 100 completed jobs
      removeOnFail: 500, // keep last 500 failed for debugging
    });

    // 7. Respond immediately (< 50ms target)
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