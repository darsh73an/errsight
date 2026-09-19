import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database';
import { startWorker } from './workers/processEvent';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import errorRoutes from './routes/errors';
import ingestRoutes from './routes/ingest';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', errorRoutes);
app.use('/api/ingest', ingestRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    // Test DB connection
    await pool.query('SELECT NOW()');
    logger.info('Database connected');

    // Start worker
    startWorker();
    logger.info('Worker started');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
}

start();