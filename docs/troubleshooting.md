# Troubleshooting Guide

Common issues and solutions for Thinkora.

## App Won't Start

### Web app (Next.js) fails to start

**Symptom:** `pnpm dev:web` exits with errors or the page doesn't load.

**Possible causes and fixes:**

1. **Missing dependencies**
   ```bash
   pnpm install
   ```

2. **Port 3000 already in use**
   ```bash
   # Find the process
   lsof -i :3000   # macOS/Linux
   netstat -an | grep 3000   # Windows
   # Kill it or use a different port
   PORT=3001 pnpm dev:web
   ```

3. **TypeScript build errors in packages**
   ```bash
   pnpm typecheck
   pnpm build  # Build all packages first
   ```

4. **Missing environment variables**
   ```bash
   pnpm verify-env
   ```
   The web app needs at least `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_API_URL` to function. Without them, it runs in demo mode.

5. **Node version too old**
   ```bash
   node -v  # Must be >= 20.0.0
   ```

### API (Fastify) fails to start

**Symptom:** `pnpm dev:api` exits immediately or shows bind errors.

1. **Port 4000 already in use**
   Check and free port 4000, or change with `PORT=4001`.

2. **Missing or invalid config**
   Check `apps/api/src/config.ts` -- the API reads all environment variables at startup. Missing values fall back to defaults, but invalid values (like a non-numeric PORT) cause crashes.

3. **Supabase not running**
   The API attempts to connect to Supabase at startup. If `SUPABASE_URL` points to a non-running instance:
   ```bash
   supabase start   # Start local Supabase
   ```

### Worker fails to start

**Symptom:** `pnpm dev:worker` exits or shows Redis connection errors.

1. **Redis not running**
   The worker tries Redis first and falls back to an in-memory queue. If you see Redis errors but the worker continues, it's operating in fallback mode (fine for development).
   ```bash
   docker compose up -d   # Start Redis
   ```

2. **BullMQ import error**
   If `bullmq` or `ioredis` are not installed:
   ```bash
   pnpm install
   ```

## Database Connection Issues

### "Connection refused" to Supabase

**Symptom:** API or worker cannot connect to the database.

1. **Supabase not running locally**
   ```bash
   supabase start
   supabase status  # Check if all services are running
   ```

2. **Wrong DATABASE_URL**
   Default local: `postgresql://postgres:postgres@localhost:54322/postgres`
   Check that port 54322 is used (not 5432).

3. **Docker not running**
   Supabase CLI requires Docker. Ensure Docker Desktop is running.

4. **Supabase containers stopped**
   ```bash
   docker ps  # Check running containers
   supabase stop && supabase start  # Restart
   ```

### Migration errors

**Symptom:** `pnpm db:migrate` fails.

1. **pgvector extension not available**
   The first migration requires the `vector` extension. Local Supabase includes it by default. For hosted Supabase, enable it in the dashboard under Extensions.

2. **Tables already exist**
   If migrations were partially applied:
   ```bash
   pnpm db:reset   # WARNING: Destroys all data
   pnpm db:migrate
   pnpm seed
   ```

3. **Permission denied**
   Ensure `DATABASE_URL` uses a user with CREATE/ALTER permissions.

### RLS blocking queries

**Symptom:** Queries return empty results even when data exists.

1. **Using anon key without auth context**
   The anon key enforces RLS. For server-side admin operations, use `SUPABASE_SERVICE_ROLE_KEY`.

2. **User doesn't own the data**
   RLS policies restrict access to rows where `user_id = auth.uid()`. Verify the authenticated user's ID matches the data's `user_id`.

3. **JWT missing role claim**
   Audit log queries require `role = 'admin'` in the JWT's `app_metadata`.

## OpenRouter Errors

### 401 Unauthorized

**Symptom:** Chat requests fail with authentication errors.

1. **Invalid API key**
   - Check `OPENROUTER_API_KEY` in `.env`
   - Ensure the key starts with `sk-or-v1-`
   - Verify the key is active at [openrouter.ai/keys](https://openrouter.ai/keys)

2. **Placeholder value**
   Make sure the key is not still set to `your-openrouter-api-key`.

### 429 Rate Limited

**Symptom:** Requests fail with rate limit errors.

1. **Too many concurrent requests**
   The client retries automatically with exponential backoff (up to 3 times).

2. **Account limits**
   Check your OpenRouter account for rate limit tiers.

### Model not found

**Symptom:** Error mentions the requested model doesn't exist.

1. **Stale model catalog**
   ```bash
   pnpm sync-models  # Refresh catalog
   ```

2. **Model deprecated or removed**
   Check [openrouter.ai/models](https://openrouter.ai/models) for current availability.

### Timeout errors

**Symptom:** Requests fail after 60 seconds.

1. **Long prompts with slow models**
   Reduce prompt size or choose a faster model.

2. **Network issues**
   Check connectivity to `openrouter.ai`.

### Budget exceeded

**Symptom:** Requests rejected with budget error.

1. **Daily limit reached**
   Check `OPENROUTER_BUDGET_DAILY_USD` (default: $10).

2. **Per-request limit**
   Check `OPENROUTER_MAX_REQUEST_COST_USD` (default: $1.00). Lower the max tokens or use a cheaper model.

## Notion Connection Problems

### OAuth flow fails

1. **Redirect URI mismatch**
   Ensure `NOTION_REDIRECT_URI` in `.env` exactly matches the URI configured in your Notion integration settings.

2. **Invalid client credentials**
   Verify `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET` match your Notion integration.

3. **Integration type**
   The Notion integration must be set to "Public" type for OAuth. Internal integrations use a different auth flow.

### Search returns no results

1. **Pages not shared**
   In Notion, each page must be explicitly shared with the integration. Go to the page -> "..." -> "Connections" -> add your integration.

2. **Database items not shared**
   Database pages inherit the parent database's connections. Share the database itself.

3. **Sync not completed**
   Check if the initial `notion-sync` job has completed. Look at the worker logs or the Connectors page.

### Rate limit errors from Notion

Notion's API is rate-limited to approximately 3 requests per second. The client handles this automatically, but heavy sync operations may hit limits.

**Fix:** Wait and retry. For large workspaces, consider syncing in batches.

## File Upload Failures

### Upload rejected

1. **File too large**
   Default limit is 50 MB. Check `MAX_UPLOAD_MB` in `.env`.

2. **Unsupported format**
   Check the allowed MIME types and extensions in [file-ingestion.md](./file-ingestion.md).

3. **Suspicious filename**
   Files with double extensions (e.g., `.pdf.exe`), null bytes, or path separators are rejected.

### Upload succeeds but processing fails

1. **Worker not running**
   ```bash
   pnpm dev:worker
   ```

2. **Supabase Storage bucket missing**
   Ensure the `uploads` bucket exists in Supabase Storage. Check migration `0003_storage.sql`.

3. **File type detection fails**
   The parser may not recognize the file type. Check the worker logs for `UNSUPPORTED_FORMAT` errors.

4. **Embedding API errors**
   The indexing stage calls OpenRouter for embeddings. If `OPENROUTER_API_KEY` is not set, indexing will fail.

### File stuck in "processing" state

1. **Worker crashed during processing**
   Restart the worker. Jobs with retry policy will be re-attempted.

2. **Redis lost the job**
   If using in-memory queue (demo mode), jobs are lost on worker restart. Re-upload the file.

3. **Manually reset file status**
   ```sql
   UPDATE files SET status = 'uploaded' WHERE id = '<file-id>';
   ```
   Then re-trigger ingestion.

## Model Catalog Empty

**Symptom:** Model selector shows no options, or the model catalog page is empty.

1. **Sync not run**
   ```bash
   pnpm sync-models
   ```

2. **No API key**
   `sync-models` requires a valid `OPENROUTER_API_KEY`.

3. **Database not connected**
   Models are synced to the `model_registry` table. If the DB is unavailable, a JSON cache file is written to `apps/api/src/demo/model-catalog-cache.json`.

4. **Demo mode**
   In demo mode, the catalog uses the cached JSON file. If this file doesn't exist, run `pnpm sync-models`.

## Dashboard Shows No Data

**Symptom:** Dashboard panels show zeros or "No data" messages.

1. **No requests made yet**
   The dashboard reads from `model_usage_logs`, `model_cost_daily`, and other analytics tables. Send some chat messages first.

2. **Demo mode**
   In demo mode, the dashboard shows sample data from the seed script. Run `pnpm seed` to populate.

3. **Time range filter**
   Check the dashboard's time range selector. Data may exist outside the current view window.

4. **RLS filtering**
   Dashboard queries are scoped to the authenticated user's data. Admin users may need a different view.

## Worker Jobs Stuck

### Jobs not being picked up

1. **Worker not running**
   ```bash
   pnpm dev:worker
   curl http://localhost:4100/health
   ```

2. **Redis disconnected**
   If Redis goes down, the BullMQ worker stops processing. Restart Redis:
   ```bash
   docker compose restart redis
   ```

3. **Wrong queue name**
   The worker listens on the `thinkora-jobs` queue. Ensure jobs are being enqueued to the same queue name.

### Jobs failing repeatedly

1. **Check worker logs**
   Look for error messages in the worker output. Common causes:
   - Database connection lost
   - OpenRouter API errors
   - File not found in storage

2. **Retry exhaustion**
   Jobs retry up to 3 times (configurable). After exhaustion, they are marked as failed.

3. **Check job status in database**
   ```sql
   SELECT id, file_id, status, stage, error, retry_count
   FROM file_processing_jobs
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Clear stuck jobs

If using Redis/BullMQ:
```bash
# Connect to Redis CLI
redis-cli
# List all jobs in the queue
KEYS bull:thinkora-jobs:*
# Clear failed jobs
DEL bull:thinkora-jobs:failed
```

## General Debugging

### Enable debug logging

```bash
LOG_LEVEL=debug pnpm dev
```

### Check all services health

```bash
# API
curl http://localhost:4000/health

# Worker
curl http://localhost:4100/health

# Supabase
supabase status
```

### Verify environment

```bash
pnpm verify-env
pnpm verify-connectors
```

### Reset everything

```bash
supabase stop
supabase start
pnpm db:reset
pnpm db:migrate
pnpm seed
pnpm sync-models
pnpm dev
```
