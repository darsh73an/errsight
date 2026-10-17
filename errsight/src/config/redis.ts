import Redis from 'ioredis';
import { config } from './index';

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
    });

export async function testRedisConnection(): Promise<void> {
  await redis.ping();
}
