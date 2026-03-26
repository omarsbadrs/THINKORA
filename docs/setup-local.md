# Local Development Setup

This guide walks you through setting up Thinkora for local development.

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | >= 20.0.0 | Runtime |
| **pnpm** | >= 9.0.0 | Package manager (monorepo workspaces) |
| **Supabase CLI** | latest | Local Postgres, Auth, Storage, Realtime |
| **Docker** | latest | Required by Supabase CLI; also runs Redis |
| **Git** | any | Version control |

### Installing prerequisites

```bash
# Node.js (via nvm)
nvm install 20
nvm use 20

# pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Supabase CLI
npm install -g supabase

# Verify
node -v          # v20.x.x
pnpm -v          # 9.x.x
supabase --version
docker --version
```

## Step-by-Step Setup

### 1. Clone the repository

```bash
git clone https://github.com/omarsbadrs/THINKORA.git
cd THINKORA
```

### 2. Copy environment file

```bash
cp .env.example .env
```

The `.env.example` file contains all variables with placeholder values. The app runs in **demo mode** automatically when credentials are missing.

### 3. Install dependencies

```bash
pnpm install
```

This installs all workspace dependencies for `apps/*` and `packages/*` in a single operation.

### 4. Bootstrap the project

```bash
pnpm bootstrap
```

Runs `scripts/bootstrap.ts` which performs initial setup tasks (creating directories, validating configuration, etc.).

### 5. Start Supabase (local)

```bash
supabase start
```

This starts local instances of:
- **Postgres** on port `54322`
- **Auth** on port `54321` (part of the Supabase API)
- **Storage** on port `54321`
- **Studio** (web UI) typically on port `54323`

After `supabase start` completes, it prints connection details. Copy the output values into your `.env` file:

```bash
# Example output:
#   API URL: http://localhost:54321
#   anon key: eyJhbG...
#   service_role key: eyJhbG...
#   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
```

Update these in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from output>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 6. Run database migrations

```bash
pnpm db:migrate
```

This runs `supabase db push`, applying the SQL migrations in `supabase/migrations/`:
- `0001_initial.sql` -- All tables (users, conversations, messages, files, chunks, connectors, models, analytics)
- `0002_rls.sql` -- Row-Level Security policies
- `0003_storage.sql` -- Storage bucket configuration
- `0004_indexes.sql` -- Performance indexes

### 7. Seed demo data

```bash
pnpm seed
```

Populates the database with sample conversations, files, model entries, and dashboard metrics for testing.

### 8. Start Redis (optional)

If you want BullMQ job processing (instead of the in-memory queue):

```bash
docker compose up -d
```

This starts Redis on port 6379 using the `docker-compose.yml` at the project root.

### 9. Start development servers

```bash
pnpm dev
```

This uses Turborepo to start all three services concurrently:

| Service | URL | Command |
|---|---|---|
| **Web** | `http://localhost:3000` | `next dev --port 3000` |
| **API** | `http://localhost:4000` | `tsx watch src/server.ts` |
| **Worker** | `http://localhost:4100` | `tsx watch src/worker.ts` |

You can also start services individually:

```bash
pnpm dev:web     # Just the frontend
pnpm dev:api     # Just the API
pnpm dev:worker  # Just the worker
```

### 10. Sync model catalog (optional)

If you have an OpenRouter API key configured:

```bash
pnpm sync-models
```

Fetches the full model catalog from OpenRouter, normalizes it, derives capability tags, and writes both a JSON cache file and database entries.

### 11. Verify environment

```bash
pnpm verify-env
```

Checks all required and optional environment variables and reports their status.

## Demo Mode vs Live Mode

### Demo Mode

The app enters demo mode automatically when critical credentials are missing (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `OPENROUTER_API_KEY` not set). You can also force it with `DEMO_MODE=true`.

In demo mode:
- **Authentication** is bypassed -- a mock "Demo User" is injected
- **Chat** returns pre-configured demo conversations
- **Dashboard** shows sample metrics
- **Model catalog** uses cached JSON data
- **Connectors** show as disconnected with setup instructions
- **File uploads** are accepted but not processed (logged to console)
- **Worker** uses an in-memory queue instead of Redis

### Live Mode

When all credentials are provided:
- Full Supabase authentication with email/password
- Real OpenRouter API calls with model routing
- Notion and Supabase MCP connections available
- File ingestion pipeline fully operational
- Redis-backed BullMQ job queue
- Real-time dashboard analytics

## Common Issues and Solutions

| Issue | Solution |
|---|---|
| `pnpm install` fails | Ensure pnpm >= 9 and Node >= 20. Run `corepack enable` first. |
| `supabase start` fails | Ensure Docker is running. Try `docker system prune` if disk is full. |
| Supabase connection refused | Run `supabase start` and wait for it to complete. Check port 54321 is not in use. |
| `pnpm db:migrate` fails | Ensure Supabase is running. Check `DATABASE_URL` in `.env`. |
| API won't start on port 4000 | Another process may be using port 4000. Check with `lsof -i :4000` or `netstat -an | grep 4000`. |
| Web app shows blank page | Check browser console for errors. Ensure `NEXT_PUBLIC_API_URL=http://localhost:4000` is set. |
| OpenRouter 401 error | Check `OPENROUTER_API_KEY` in `.env` is valid and not a placeholder. |
| Model catalog empty | Run `pnpm sync-models` to fetch from OpenRouter, or rely on demo cache. |
| Chat not streaming | Ensure the API service is running on port 4000. Check WebSocket connectivity. |
| File upload fails | Check `MAX_UPLOAD_MB` (default 50). Verify the `uploads` storage bucket exists. |
| Redis connection failed | Worker falls back to in-memory queue. Install Redis or run `docker compose up -d`. |
| TypeScript errors | Run `pnpm typecheck` to see all type errors. Ensure `pnpm build` succeeds for dependencies. |

## Useful Commands

```bash
pnpm dev              # Start all services
pnpm build            # Build all packages and apps
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:e2e         # End-to-end tests (requires running app)
pnpm lint             # Lint all packages
pnpm lint:fix         # Lint and auto-fix
pnpm typecheck        # TypeScript type checking
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting without modifying
pnpm clean            # Remove all build artifacts and node_modules
pnpm verify-env       # Check environment variables
pnpm verify-connectors # Check connector connectivity
pnpm sync-models      # Refresh model catalog
pnpm db:migrate       # Apply database migrations
pnpm db:reset         # Reset database (destructive)
pnpm db:seed          # Re-seed demo data
pnpm db:studio        # Open Supabase Studio web UI
```
