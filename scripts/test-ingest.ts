// scripts/test-ingest.ts
import { ErrSight } from '../sdk/javascript/src/index';

// Mock config
ErrSight.init({
  apiKey: 'test-api-key-123',
  environment: 'development',
});

// Simulate errors
console.log('Sending test errors...');

ErrSight.captureException(new Error('Database connection failed'));
ErrSight.captureException(new Error('Database connection failed')); // same, should group
ErrSight.captureException(new Error('Database connection failed')); // same, should group

ErrSight.captureException(new Error('User 42 not found'));
ErrSight.captureException(new Error('User 99 not found')); // different message, same pattern after normalization

setTimeout(() => {
  console.log('Test complete. Check database.');
  process.exit(0);
}, 2000);