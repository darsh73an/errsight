-- ErrSight initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   //Generates a random unique ID like a1b2c3d4-...
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_email VARCHAR(255),
  slack_webhook_url TEXT,
  alert_threshold INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);      // Creates a "search shortcut" on owner_id column
CREATE INDEX IF NOT EXISTS idx_projects_api_key ON projects(api_key);

CREATE TABLE IF NOT EXISTS error_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fingerprint VARCHAR(64) NOT NULL,
  title TEXT NOT NULL,
  type VARCHAR(255),
  level VARCHAR(20) NOT NULL DEFAULT 'error',
  status VARCHAR(20) NOT NULL DEFAULT 'unresolved',
  event_count INTEGER NOT NULL DEFAULT 0,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_error_groups_project ON error_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_error_groups_last_seen ON error_groups(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_groups_status ON error_groups(status);

CREATE TABLE IF NOT EXISTS error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_group_id UUID NOT NULL REFERENCES error_groups(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  stack_trace TEXT,
  level VARCHAR(20) NOT NULL DEFAULT 'error',
  environment VARCHAR(50) DEFAULT 'production',
  release VARCHAR(100),
  url TEXT,
  user_agent TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_events_group ON error_events(error_group_id);
CREATE INDEX IF NOT EXISTS idx_error_events_project ON error_events(project_id);
CREATE INDEX IF NOT EXISTS idx_error_events_received ON error_events(received_at DESC);
