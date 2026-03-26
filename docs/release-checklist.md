# Release Checklist

Follow this checklist before, during, and after deploying a new version of Thinkora.

## Pre-Release Checks

### Code Quality

- [ ] All changes are committed and pushed
- [ ] Feature branch has been merged to the release branch (or main)
- [ ] No outstanding merge conflicts
- [ ] Code has been reviewed by at least one other team member

### Type Checking

```bash
pnpm typecheck
```

- [ ] No TypeScript errors across all packages and apps

### Linting

```bash
pnpm lint
```

- [ ] No linting errors or warnings

### Formatting

```bash
pnpm format:check
```

- [ ] All files are properly formatted

### Test Suite

```bash
pnpm test
```

- [ ] All unit tests pass
- [ ] All integration tests pass

```bash
pnpm test:e2e
```

- [ ] All end-to-end tests pass (requires running app)

## Migration Verification

### Review migrations

- [ ] Review any new migration files in `supabase/migrations/`
- [ ] Migrations are numbered sequentially (no gaps or conflicts)
- [ ] Migrations are backward-compatible (no data loss)
- [ ] Migrations include proper `IF NOT EXISTS` / `IF EXISTS` guards where appropriate
- [ ] New tables have RLS enabled and appropriate policies defined
- [ ] New columns have sensible defaults for existing rows

### Test migrations

- [ ] Run migrations against a fresh database
  ```bash
  supabase db reset
  pnpm db:migrate
  ```
- [ ] Verify all tables exist with correct columns
- [ ] Verify RLS policies are active
- [ ] Verify indexes are created

### Rollback plan

- [ ] Down migrations or rollback SQL scripts are prepared (if applicable)
- [ ] Document the rollback procedure for this release

## Build Verification

```bash
pnpm build
```

- [ ] All packages build successfully
- [ ] Web app builds without warnings
- [ ] API app builds without warnings
- [ ] Worker builds without warnings

### Docker builds (if applicable)

```bash
docker build -f apps/web/Dockerfile -t thinkora-web:latest .
docker build -f apps/api/Dockerfile -t thinkora-api:latest .
docker build -f apps/worker/Dockerfile -t thinkora-worker:latest .
```

- [ ] All Docker images build successfully
- [ ] Images start and respond to health checks

## Environment Variable Audit

- [ ] Compare `.env.example` against production environment
- [ ] All new environment variables are documented in [env-vars.md](./env-vars.md)
- [ ] No sensitive values in `.env.example` (only placeholders)
- [ ] Production-specific values updated:
  - [ ] `NODE_ENV=production`
  - [ ] `LOG_LEVEL=warn` (or `info`)
  - [ ] `DEMO_MODE=false`
  - [ ] `CORS_ORIGINS` set to production domains only
  - [ ] `OPENROUTER_SITE_URL` set to production URL
  - [ ] `NOTION_REDIRECT_URI` set to production callback URL
- [ ] Security keys are unique per environment:
  - [ ] `APP_ENCRYPTION_KEY` is different from staging/dev
  - [ ] `SESSION_SECRET` is different from staging/dev
- [ ] Budget limits are configured appropriately:
  - [ ] `OPENROUTER_BUDGET_DAILY_USD`
  - [ ] `OPENROUTER_BUDGET_MONTHLY_USD`
  - [ ] `OPENROUTER_MAX_REQUEST_COST_USD`

## Deployment Steps

### 1. Database Migrations

Apply migrations to the production database before deploying new code:

```bash
# Option A: Supabase CLI
supabase link --project-ref <ref>
supabase db push

# Option B: Direct SQL
psql "$PRODUCTION_DATABASE_URL" -f supabase/migrations/XXXX_new_migration.sql
```

- [ ] Migrations applied successfully
- [ ] Verify tables and columns exist

### 2. Sync Model Catalog

```bash
OPENROUTER_API_KEY=<prod-key> pnpm sync-models
```

- [ ] Model catalog refreshed
- [ ] Verify model count in logs

### 3. Deploy Worker

Deploy the worker first so it's ready to process jobs from the new API.

- [ ] Worker deployed
- [ ] Worker health check passes (`GET /health`)

### 4. Deploy API

- [ ] API deployed
- [ ] API health check passes (`GET /health`)
- [ ] Test a basic chat request
- [ ] Verify model selection works

### 5. Deploy Web

- [ ] Web app deployed
- [ ] Web app loads in browser
- [ ] Login page renders
- [ ] Sign in works

### 6. Verify Connectors

```bash
pnpm verify-connectors
```

- [ ] Notion connector reachable (if configured)
- [ ] Supabase MCP connector reachable (if configured)
- [ ] OpenRouter API accessible

## Post-Deploy Verification

### Smoke Tests

- [ ] Sign in with a test account
- [ ] Send a chat message and receive a response
- [ ] Verify streaming works (tokens appear incrementally)
- [ ] Upload a file and verify it processes
- [ ] Check the dashboard for new request data
- [ ] Verify the model catalog page shows models
- [ ] Check connector status page

### Monitor

- [ ] Check error tracking (Sentry) for new errors
- [ ] Monitor API response times for the first 15 minutes
- [ ] Check worker job processing (no stuck jobs)
- [ ] Verify no increase in error rate
- [ ] Check OpenRouter cost tracking for unexpected spikes

### Communication

- [ ] Update the changelog with release notes
- [ ] Notify the team of the successful deployment
- [ ] Update any status page if applicable

## Rollback Procedure

If issues are detected after deployment:

1. **Revert the web app** to the previous version
2. **Revert the API** to the previous version
3. **Revert the worker** to the previous version
4. **If database migrations need rollback:**
   - Execute the rollback SQL
   - Verify data integrity
5. **Notify the team** of the rollback
6. **Investigate** the root cause before re-attempting deployment
