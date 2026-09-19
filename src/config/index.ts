import dotenv from 'dotenv';

dotenv.config();

function withDefault(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  jwt: {
    secret: withDefault('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    connectionString: withDefault(
      'DATABASE_URL',
      'postgres://errsight:errsight@localhost:5432/errsight'
    ),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  ingestRateLimit: {
    max: parseInt(process.env.INGEST_RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.INGEST_RATE_LIMIT_WINDOW_MS || '60000', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.ALERT_FROM_EMAIL || 'alerts@errsight.local',
  },

  slack: {
    defaultWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  },

  dashboardOrigin: process.env.DASHBOARD_ORIGIN || 'http://localhost:5173',
};
