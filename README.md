# ErrSight

**AI-Powered Error Analysis and Debugging Platform**

ErrSight is a developer-focused platform designed to help analyze application errors, identify potential root causes, and simplify debugging through structured error ingestion and processing.

## Features

- **Error Ingestion** — Receive and process application error events through an API.
- **Error Scrubbing** — Sanitize sensitive information before storing or processing error data.
- **Authentication** — Secure API access using JWT-based authentication and refresh tokens.
- **Rate Limiting** — Protect ingestion and authentication endpoints from excessive requests.
- **Background Processing** — Process asynchronous tasks using a dedicated worker and Redis.
- **Persistent Storage** — Store application data in PostgreSQL.
- **Slack Integration** — Support webhook-based notifications when configured.
- **Dashboard** — View and interact with the application through a Vite-powered frontend.

## Tech Stack

| Component | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express.js |
| Frontend | Vite |
| Database | PostgreSQL |
| Queue and Caching | Redis |
| Authentication | JWT |
| Notifications | Slack Webhooks (optional) |
| Deployment | Docker, Railway |

## Architecture

```text
Dashboard (Vite)
       |
       v
Express API (TypeScript)
       |
       +------ PostgreSQL
       |
       +------ Redis
                 |
                 v
           Background Worker
                 |
                 v
          Error Processing
```

## Project Structure

```text
errsight/
├── src/                 # Backend source code
├── dashboard/           # Vite frontend
├── scripts/              # Utility and migration scripts
├── docker-compose.yml    # Local development services
├── Dockerfile            # Backend container
├── package.json          # Backend dependencies and scripts
└── .env.example          # Environment variable template
```

*The structure above is a simplified overview; individual files may vary.*

## Prerequisites

- Node.js and npm
- Docker and Docker Compose
- PostgreSQL
- Redis

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/darsh73an/errsight.git
cd errsight/errsight
```

### 2. Configure environment variables

Create your local environment file using the provided example:

```bash
cp .env.example .env
```

Configure the required database, Redis, authentication, and application settings in `.env`.

**Never commit `.env` files, passwords, tokens, or production secrets to Git.**

### 3. Start the application

If the Docker Compose configuration is set up for local development:

```bash
docker compose up --build
```

Run database migrations using the project's configured migration command before using the application.

### 4. Start the dashboard

```bash
cd dashboard
npm install
npm run dev
```

Use the local URL printed by Vite to open the dashboard.

## Environment Configuration

ErrSight uses environment variables for configuration, including:

- `NODE_ENV` — Application environment.
- `PORT` — API listening port.
- `DATABASE_URL` — PostgreSQL connection URL.
- `REDIS_HOST` and `REDIS_PORT` — Redis connection settings.
- `JWT_SECRET` — JWT signing secret.
- `JWT_EXPIRES_IN` — Access-token expiration.
- `REFRESH_TOKEN_EXPIRES_DAYS` — Refresh-token lifetime.
- `APP_URL` and `CORS_ORIGIN` — Application and frontend origins.
- Rate-limit settings for ingestion and authentication.
- `SLACK_WEBHOOK_URL` — Optional Slack notification webhook.

See `.env.example` for the full configuration.

## Deployment

ErrSight can be deployed using container-based hosting.

A production deployment requires:

1. A running PostgreSQL database.
2. A Redis instance accessible to the API and worker.
3. Database migrations executed successfully.
4. Separate API and background-worker services, if required by the application.
5. A deployed frontend configured to communicate with the public API URL.
6. Production environment variables configured through the hosting provider.

## Security

- Keep all credentials and secrets out of source control.
- Use HTTPS in production.
- Configure strict CORS origins.
- Use strong production authentication secrets.
- Sanitize sensitive data in error payloads.
- Apply rate limits to public-facing endpoints.
- Validate inputs and handle failures safely.

## License

Add your chosen license before distributing this project publicly.
