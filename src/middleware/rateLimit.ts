import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Rate limiter applied to the ingestion endpoint, keyed by API key
 * so that one noisy project cannot exhaust another project's quota.
 */
export const ingestRateLimiter = rateLimit({
  windowMs: config.ingestRateLimit.windowMs,
  max: config.ingestRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
  message: { error: 'Rate limit exceeded for this project. Please slow down.' },
});

/** General-purpose limiter for auth endpoints to slow down brute force attempts. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});
