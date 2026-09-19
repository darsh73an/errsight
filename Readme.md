# ErrSight 🚨

Error tracking platform with intelligent grouping and real-time alerts.

## Features

- **SDK Integration** — Capture errors from your JavaScript apps
- **Smart Grouping** — Fingerprint-based error grouping reduces noise
- **Real-time Alerts** — Get notified on new errors via email/Slack
- **Dashboard** — Visualize error trends, affected users, and releases
- **Privacy-first** — Automatic PII scrubbing before storage

## Architecture

- **Fast ingestion** — API acknowledges in <50ms, processes async
- **Reliable** — Automatic retries with exponential backoff
- **Scalable** — Queue-based workers handle spikes

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Redis, BullMQ
- **Frontend:** React, TypeScript, Vite
- **SDK:** JavaScript (browser + Node.js)
- **Infra:** Docker, docker-compose

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/errsight.git
cd errsight

# 2. Setup environment
cp .env.example .env
# Edit .env with your DB and Redis credentials

# 3. Start services
docker-compose up -d

# 4. Run migrations
npm run migrate

# 5. Start backend
npm run dev

# 6. Start worker (new terminal)
npm run worker

# 7. Start dashboard (new terminal)
cd dashboard && npm install && npm run dev
