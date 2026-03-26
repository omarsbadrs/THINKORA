# Environment Variable Reference

All environment variables for Thinkora, grouped by category. Copy `.env.example` to `.env` and fill in your values. The app runs in demo mode when required credentials are absent.

## Supabase (App Backend)

| Variable | Description | Required | Default |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (REST API endpoint) | Yes | `http://localhost:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key (safe for client-side) | Yes | -- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only, bypasses RLS) | Yes | -- |
| `DATABASE_URL` | PostgreSQL connection string for direct database access | Yes | `postgresql://postgres:postgres@localhost:54322/postgres` |

## OpenRouter (Model Gateway)

| Variable | Description | Required | Default |
|---|---|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM calls | Yes | -- |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL | No | `https://openrouter.ai/api/v1` |
| `OPENROUTER_SITE_URL` | Your site URL (sent as `HTTP-Referer` header) | No | `http://localhost:3000` |
| `OPENROUTER_APP_NAME` | Your app name (sent as `X-Title` header) | No | `Thinkora` |
| `OPENROUTER_DEFAULT_MODEL` | Default model slug for chat | No | `anthropic/claude-sonnet-4` |
| `OPENROUTER_DEFAULT_FAST_MODEL` | Default model for "Fast" routing mode | No | `anthropic/claude-haiku-4` |
| `OPENROUTER_DEFAULT_REASONING_MODEL` | Default model for "Reasoning" routing mode | No | `anthropic/claude-sonnet-4` |
| `OPENROUTER_DEFAULT_VISION_MODEL` | Default model for "Vision" routing mode | No | `anthropic/claude-sonnet-4` |
| `OPENROUTER_DEFAULT_EMBEDDING_MODEL` | Embedding model for RAG vector search | No | `openai/text-embedding-3-small` |
| `OPENROUTER_ENABLE_AUTO_ROUTER` | Enable automatic model routing | No | `true` |
| `OPENROUTER_ENABLE_MODEL_FALLBACKS` | Enable fallback chains when primary model fails | No | `true` |
| `OPENROUTER_DEFAULT_ALLOWED_MODELS` | Comma-separated list of allowed model slugs (empty = all) | No | -- |
| `OPENROUTER_DEFAULT_IGNORED_PROVIDERS` | Comma-separated list of excluded provider families | No | -- |
| `OPENROUTER_REQUIRE_ZDR` | Require zero data retention from providers | No | `false` |
| `OPENROUTER_DATA_COLLECTION_POLICY` | Data collection setting sent to OpenRouter | No | `deny` |
| `OPENROUTER_REQUIRE_PARAMETERS_MATCH` | Require provider to support all request parameters | No | `false` |
| `OPENROUTER_MAX_REQUEST_COST_USD` | Maximum cost per single request in USD | No | `1.00` |
| `OPENROUTER_MODEL_CACHE_TTL_SECONDS` | How long to cache the model catalog in seconds | No | `3600` |
| `OPENROUTER_MODELS_SYNC_CRON` | Cron expression for automatic model catalog sync | No | `0 */6 * * *` |
| `OPENROUTER_ENABLE_PROMPT_CACHING` | Enable prompt caching for supported models | No | `true` |
| `OPENROUTER_LOG_RAW_ROUTING_METADATA` | Log raw routing metadata from OpenRouter responses | No | `false` |
| `OPENROUTER_BUDGET_DAILY_USD` | Daily spending limit in USD | No | `10.00` |
| `OPENROUTER_BUDGET_MONTHLY_USD` | Monthly spending limit in USD | No | `200.00` |

## Notion MCP

| Variable | Description | Required | Default |
|---|---|---|---|
| `NOTION_CLIENT_ID` | Notion OAuth application client ID | No | -- |
| `NOTION_CLIENT_SECRET` | Notion OAuth application client secret | No | -- |
| `NOTION_REDIRECT_URI` | OAuth callback URL for Notion authorization | No | `http://localhost:3000/api/connectors/notion/callback` |
| `NOTION_MCP_BASE_URL` | Custom Notion MCP server base URL (if using a proxy) | No | -- |

## Supabase MCP

| Variable | Description | Required | Default |
|---|---|---|---|
| `SUPABASE_MCP_URL` | Supabase MCP server endpoint URL | No | -- |
| `SUPABASE_MCP_ACCESS_TOKEN` | Access token for the Supabase MCP server | No | -- |

## Storage

| Variable | Description | Required | Default |
|---|---|---|---|
| `STORAGE_BUCKET_UPLOADS` | Name of the Supabase Storage bucket for file uploads | No | `uploads` |

## Security

| Variable | Description | Required | Default |
|---|---|---|---|
| `APP_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption of secrets (connector credentials, etc.) | Yes | -- |
| `SESSION_SECRET` | Random secret for session signing | Yes | -- |
| `RATE_LIMIT_MAX` | Maximum requests per rate limit window | No | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit window duration | No | `1 minute` |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins | No | `http://localhost:3000,http://localhost:5173` |

## Services

| Variable | Description | Required | Default |
|---|---|---|---|
| `API_BASE_URL` | Internal URL of the API service | No | `http://localhost:4000` |
| `WORKER_BASE_URL` | Internal URL of the worker service | No | `http://localhost:4100` |
| `NEXT_PUBLIC_API_URL` | Public URL of the API service (used by the frontend) | No | `http://localhost:4000` |
| `PORT` | Port for the API server to listen on | No | `4000` |
| `HOST` | Host for the API server to bind to | No | `0.0.0.0` |
| `WORKER_HEALTH_PORT` | Port for the worker health check endpoint | No | `4100` |

## App Config

| Variable | Description | Required | Default |
|---|---|---|---|
| `DEMO_MODE` | Force demo mode even when credentials are present | No | `false` |
| `DEMO_USER_ID` | User ID for the demo user | No | `demo-user-001` |
| `DEMO_USER_NAME` | Display name for the demo user | No | `Demo User` |
| `DEMO_USER_EMAIL` | Email address for the demo user | No | `demo@thinkora.dev` |
| `MAX_UPLOAD_MB` | Maximum file upload size in megabytes | No | `50` |
| `MAX_FILE_SIZE` | Maximum file upload size in bytes (alternative to MAX_UPLOAD_MB) | No | `52428800` |
| `ALLOWED_MIME_TYPES` | Comma-separated list of allowed upload MIME types | No | `application/pdf,text/plain,...` |
| `OCR_ENABLED` | Enable OCR processing for image files | No | `false` |
| `LOG_LEVEL` | Logging verbosity: `fatal`, `error`, `warn`, `info`, `debug`, `trace` | No | `info` |
| `NODE_ENV` | Runtime environment: `development`, `production`, `test` | No | `development` |

## Monitoring

| Variable | Description | Required | Default |
|---|---|---|---|
| `SENTRY_DSN` | Sentry Data Source Name for error tracking | No | -- |

## Queue (BullMQ / Redis)

| Variable | Description | Required | Default |
|---|---|---|---|
| `REDIS_URL` | Redis connection URL for BullMQ job queue | No | `redis://localhost:6379` |
| `WORKER_CONCURRENCY` | Maximum number of concurrent job processors | No | `5` |
| `WORKER_POLL_INTERVAL` | Polling interval for the in-memory queue (ms) | No | `5000` |
| `WORKER_RETRY_ATTEMPTS` | Maximum retry attempts for failed jobs | No | `3` |
| `WORKER_RETRY_DELAY` | Initial retry delay in milliseconds | No | `1000` |

## Generating Secrets

```bash
# Generate APP_ENCRYPTION_KEY (32 bytes = 64 hex characters)
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32

# Alternative using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Variable Validation

Run the built-in verification script to check your configuration:

```bash
pnpm verify-env
```

This checks all required variables and reports which are set, missing, or still at placeholder values. When `DEMO_MODE=true`, missing required variables are reported as warnings instead of errors.
