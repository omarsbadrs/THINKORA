# Production Deployment

This guide covers deploying Thinkora to a production environment.

## Architecture Overview

A production Thinkora deployment consists of three services:

| Service | Technology | Recommended Host |
|---|---|---|
| **Web** | Next.js 15 (SSR) | Vercel, Docker, or any Node.js host |
| **API** | Fastify 5 | Docker on fly.io, Railway, or any container host |
| **Worker** | BullMQ + Node.js | Docker on the same host as API or a separate container |

Plus external dependencies:

| Dependency | Recommended |
|---|---|
| **PostgreSQL** | Supabase (hosted) or self-hosted Postgres 15+ with pgvector |
| **Redis** | Upstash, Redis Cloud, or self-hosted Redis 7+ |
| **Object Storage** | Supabase Storage (included with Supabase project) |
| **LLM Gateway** | OpenRouter (required) |

## Environment Preparation

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Note down:
- Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
- Anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`)
- Database connection string (`DATABASE_URL`)

### 2. Set up Redis

Provision a Redis instance. Recommended services:
- [Upstash](https://upstash.com) -- serverless Redis with free tier
- [Redis Cloud](https://redis.com/cloud) -- managed Redis

Note the connection URL (`REDIS_URL`).

### 3. Get an OpenRouter API key

Sign up at [openrouter.ai](https://openrouter.ai) and generate an API key.

### 4. Generate security keys

```bash
# Encryption key (32 bytes / 64 hex chars)
openssl rand -hex 32

# Session secret
openssl rand -hex 32
```

## Database Migrations

### Option A: Supabase Dashboard

1. Go to **SQL Editor** in your Supabase dashboard
2. Run each migration file in order:
   - `supabase/migrations/0001_initial.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_storage.sql`
   - `supabase/migrations/0004_indexes.sql`

### Option B: Supabase CLI (linked project)

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option C: Direct psql

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_initial.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_storage.sql
psql "$DATABASE_URL" -f supabase/migrations/0004_indexes.sql
```

### Verify migrations

Confirm that the `pgvector` extension is enabled and all tables exist:

```sql
SELECT extname FROM pg_extension WHERE extname = 'vector';
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

## Environment Variables

See [env-vars.md](./env-vars.md) for the complete reference. At minimum, set:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=https://your-domain.com
OPENROUTER_APP_NAME=Thinkora

# Security
APP_ENCRYPTION_KEY=<64 hex chars>
SESSION_SECRET=<64 hex chars>

# Services (internal URLs)
API_BASE_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
WORKER_BASE_URL=http://worker:4100  # internal Docker network

# Redis
REDIS_URL=rediss://default:password@your-redis.upstash.io:6379

# App
DEMO_MODE=false
LOG_LEVEL=warn
NODE_ENV=production
```

## Deploying the Web App

### Option A: Vercel

1. Connect your GitHub repository to Vercel
2. Set the root directory to `apps/web`
3. Framework preset: **Next.js**
4. Add all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard
5. Deploy

Build command (auto-detected): `next build`
Output directory (auto-detected): `.next`

### Option B: Docker

Create `apps/web/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/web apps/web
COPY turbo.json .
RUN pnpm build:web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

```bash
docker build -f apps/web/Dockerfile -t thinkora-web .
docker run -p 3000:3000 --env-file .env thinkora-web
```

## Deploying the API

### Option A: Docker + fly.io

Create `apps/api/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/api apps/api
RUN pnpm build:api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
```

Deploy to fly.io:

```bash
cd apps/api
fly launch
fly secrets set OPENROUTER_API_KEY=sk-or-v1-...
# Set all other env vars as secrets
fly deploy
```

### Option B: Docker + any container host

```bash
docker build -f apps/api/Dockerfile -t thinkora-api .
docker run -p 4000:4000 --env-file .env thinkora-api
```

## Deploying the Worker

Create `apps/worker/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/worker apps/worker
RUN cd apps/worker && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 4100
CMD ["node", "apps/worker/dist/worker.js"]
```

```bash
docker build -f apps/worker/Dockerfile -t thinkora-worker .
docker run -p 4100:4100 --env-file .env thinkora-worker
```

The worker requires `REDIS_URL` to use BullMQ. Without Redis, it falls back to an in-memory queue (not recommended for production since jobs are lost on restart).

## SSL / Domain Setup

### With Vercel (web)
SSL is automatic. Set your custom domain in the Vercel dashboard.

### With fly.io (API)
SSL is automatic. Set your custom domain:
```bash
fly certs create api.your-domain.com
```

### With a reverse proxy (self-hosted)
Use Caddy or Nginx as a reverse proxy with automatic HTTPS:

```
# Caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}

api.your-domain.com {
    reverse_proxy localhost:4000
}
```

## Health Checks

All services expose health check endpoints:

| Service | Endpoint | Expected Response |
|---|---|---|
| **API** | `GET /health` | `200 {"status": "ok"}` |
| **Worker** | `GET /health` | `200 {"status": "healthy", "queue": "bullmq", "uptime": ...}` |
| **Web** | `GET /` | `200` (renders page) |

Configure your hosting platform to probe these endpoints:
- **Interval:** 30 seconds
- **Timeout:** 10 seconds
- **Unhealthy threshold:** 3 consecutive failures

### Verify deployment

```bash
# API health
curl https://api.your-domain.com/health

# Worker health
curl http://worker-host:4100/health

# Model sync
OPENROUTER_API_KEY=sk-or-v1-... pnpm sync-models

# Environment check
pnpm verify-env

# Connector check
pnpm verify-connectors
```

## Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] RLS policies active on all user-scoped tables
- [ ] Storage bucket `uploads` exists with correct permissions
- [ ] API returns 200 on `/health`
- [ ] Worker returns 200 on `/health`
- [ ] Web app loads and login page renders
- [ ] Authentication flow works (sign up, sign in, sign out)
- [ ] Chat sends a message and receives a streamed response
- [ ] Model catalog is populated (run `pnpm sync-models` if empty)
- [ ] File upload and ingestion pipeline completes
- [ ] Dashboard shows live metrics
- [ ] Sentry DSN configured (if using error tracking)
- [ ] Budget limits configured (`OPENROUTER_BUDGET_DAILY_USD`, `OPENROUTER_BUDGET_MONTHLY_USD`)
- [ ] CORS origins updated to production domains
- [ ] Encryption key and session secret are unique per environment
