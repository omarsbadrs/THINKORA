# Thinkora

**AI Command Center** — A production-grade AI assistant with RAG, MCP integrations, model routing, and operational dashboard.

## Features

- **Chat Interface** — Premium dark-themed AI chat with streaming, citations, and evidence-based answers
- **RAG Pipeline** — Upload files (PDF, DOCX, CSV, XLSX, images) and query them with semantic search
- **Notion MCP** — Connect Notion workspaces for live knowledge retrieval
- **Supabase MCP** — Query your Supabase databases through natural language
- **OpenRouter Gateway** — Dynamic model selection with 200+ models, routing policies, and fallback chains
- **Model Analytics** — Filter, compare, and analyze models by cost, latency, capability, and task fit
- **Dashboard** — Request logs, usage metrics, cost tracking, error monitoring, connector health
- **Demo Mode** — Runs without external credentials for evaluation

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI (`npm install -g supabase`)
- Docker (for Redis, optional)

### 1. Clone & Bootstrap

```bash
git clone https://github.com/omarsbadrs/THINKORA.git
cd thinkora
cp .env.example .env
pnpm install
pnpm bootstrap
```

### 2. Start Supabase (Local)

```bash
supabase start
# Copy the output URLs and keys into your .env file
pnpm db:migrate
pnpm seed
```

### 3. Start Development

```bash
pnpm dev
```

This starts:
- **Web app** at `http://localhost:3000`
- **API service** at `http://localhost:4000`
- **Worker** at `http://localhost:4100`

### 4. Demo Mode

If you skip step 2, the app runs in **demo mode** automatically:
- Chat works with demo conversations
- Dashboard shows sample metrics
- Model catalog shows cached data
- Connectors show as disconnected with setup instructions

## Configuration

### Required for Live Mode

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `APP_ENCRYPTION_KEY` | 32-byte hex key for encryption |
| `SESSION_SECRET` | Random session secret |

### Optional Integrations

| Variable | Description |
|----------|-------------|
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | Notion OAuth for MCP |
| `SUPABASE_MCP_URL` / `SUPABASE_MCP_ACCESS_TOKEN` | Supabase MCP endpoint |
| `REDIS_URL` | Redis for BullMQ job queue |
| `SENTRY_DSN` | Error tracking |

See [`.env.example`](.env.example) for the complete variable reference.

## OpenRouter Configuration

Thinkora uses [OpenRouter](https://openrouter.ai) as its model gateway:

- **Model Selection** — Users choose from Auto, Fast, Balanced, Best Quality, Reasoning, Coding, Vision, and Data Analysis modes
- **Model Catalog** — Synced from OpenRouter (`pnpm sync-models`), cached locally, filterable by price/context/capability
- **Routing Policies** — Task-based model selection, ordered fallbacks, cost ceilings, provider preferences
- **Cost Controls** — Per-request max cost, daily/monthly budgets, cheap-first policies
- **ZDR Support** — Require zero data retention for sensitive workloads

### How Model Selection Works

1. User picks a model or routing mode in the chat UI
2. Backend validates the selection against routing policies
3. Request goes to OpenRouter with model preferences and fallback list
4. Response includes actual routed model metadata
5. Usage logged for dashboard analytics

## Notion MCP Integration

1. Create a Notion integration at [notion.so/my-integrations](https://notion.so/my-integrations)
2. Set `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET` in `.env`
3. Go to **Connectors** page in the app and click "Connect Notion"
4. Authorize the integration
5. Notion pages and databases are now searchable in chat

## Supabase MCP Integration

1. Deploy the Supabase MCP server or use a hosted endpoint
2. Set `SUPABASE_MCP_URL` and `SUPABASE_MCP_ACCESS_TOKEN` in `.env`
3. Go to **Connectors** page and click "Connect Supabase MCP"
4. Query your databases through natural language in chat

## File Ingestion

1. Upload files via the **Files** page or attach in chat
2. Supported formats: PDF, DOCX, TXT, MD, CSV, XLSX, JSON, HTML, XML, code files, images (OCR)
3. Files are parsed → chunked → embedded → indexed for RAG
4. Track ingestion status on the Files page

## Dashboard

The dashboard shows real-time operational metrics:
- Request volume, token usage, cost breakdown
- Model performance comparison (latency, errors, fallbacks)
- Connector health and ingestion job status
- Retrieval quality metrics and citation coverage
- Searchable request logs with drill-down traces

## Running Tests

```bash
pnpm test           # All tests
pnpm test:unit      # Unit tests only
pnpm test:e2e       # E2E tests (requires running app)
```

## Verifying Health

```bash
pnpm verify-env         # Check environment variables
pnpm verify-connectors  # Check connector connectivity
pnpm sync-models        # Refresh model catalog from OpenRouter
```

## Architecture

```
apps/
  web/       → Next.js frontend (chat UI, dashboard, auth)
  api/       → Fastify API (chat, files, connectors, models, dashboard)
  worker/    → Background jobs (ingestion, sync, embeddings)

packages/
  ui-contracts/   → Shared TypeScript types
  db/             → Database schema, repositories
  auth/           → Supabase auth integration
  connectors/     → Notion MCP, Supabase MCP, OpenRouter clients
  parsers/        → File parsers (PDF, DOCX, CSV, etc.)
  rag-core/       → Chunking, embedding, retrieval, citations
  agent-core/     → Orchestrator, planner, tool runtime
  agent-skills/   → Modular skills (retrieval, analysis, etc.)
  security/       → Encryption, permissions, guards
  observability/  → Logging, tracing, metrics
  evals/          → Evaluation framework
  config/         → Shared configuration

supabase/         → Migrations, seed data, RLS policies
docs/             → Architecture, setup, and integration docs
scripts/          → Bootstrap, verification, and sync scripts
```

## Common Issues

| Issue | Solution |
|-------|----------|
| `pnpm install` fails | Ensure pnpm >= 9 and Node >= 20 |
| Supabase connection refused | Run `supabase start` first |
| OpenRouter 401 | Check `OPENROUTER_API_KEY` in `.env` |
| Model catalog empty | Run `pnpm sync-models` |
| Chat not streaming | Check API service is running on port 4000 |
| File upload fails | Check `MAX_UPLOAD_MB` and storage bucket config |

## License

MIT
