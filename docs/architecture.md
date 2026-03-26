# System Architecture

Thinkora is a production-grade AI Command Center built as a TypeScript monorepo managed by pnpm workspaces and Turborepo. It provides a RAG pipeline, MCP integrations (Notion, Supabase), model routing via OpenRouter, and an operational dashboard.

## High-Level Diagram

```
                           +--------------------+
                           |   Browser / Client  |
                           +--------+-----------+
                                    |
                                    v
                           +--------+-----------+
                           |  @thinkora/web      |
                           |  (Next.js 15)       |
                           |  port 3000          |
                           +--------+-----------+
                                    |
                        +-----------+-----------+
                        |                       |
                        v                       v
               +--------+--------+    +--------+--------+
               |  @thinkora/api  |    |  Supabase Auth  |
               |  (Fastify 5)   |    |  (supabase.co)  |
               |  port 4000     |    +-----------------+
               +---+----+---+--+
                   |    |   |
        +----------+    |   +----------+
        v               v              v
+-------+------+ +------+------+ +-----+-------+
| OpenRouter   | | Supabase DB | | @thinkora   |
| (LLM calls)  | | (Postgres)  | | /worker     |
| openrouter.ai| | port 54322  | | port 4100   |
+--------------+ +------+------+ +------+------+
                        |                |
                        v                v
                +-------+------+ +------+------+
                | Supabase     | | Redis       |
                | Storage      | | (BullMQ)    |
                | (file blobs) | | port 6379   |
                +--------------+ +-------------+

External Connectors:
  +----------------+    +-------------------+
  | Notion API     |    | Supabase MCP      |
  | (OAuth + REST) |    | (Schema + Query)  |
  +----------------+    +-------------------+
```

## Monorepo Structure

```
thinkora/
  apps/
    web/           Next.js 15 frontend (chat UI, dashboard, auth pages)
    api/           Fastify 5 API (chat, files, connectors, models, dashboard)
    worker/        Background job processor (BullMQ / in-memory queue)

  packages/
    ui-contracts/  Shared TypeScript types and Zod schemas
    db/            Database schema types, Supabase client, repositories
    auth/          Supabase auth integration (server + client + guards)
    connectors/    External service clients (OpenRouter, Notion MCP, Supabase MCP)
    parsers/       File parsers (PDF, DOCX, CSV, XLSX, images, code, etc.)
    rag-core/      Chunking, embedding, retrieval, citations, confidence scoring
    agent-core/    Orchestrator, planner, skill registry, tool runtime
    agent-skills/  Modular agent skills (retrieval, analysis, reporting)
    security/      Encryption, permissions, SQL guards, upload validation, audit
    observability/ Logging, tracing, metrics, cost tracking
    evals/         Evaluation framework (not yet populated)
    config/        Shared configuration (not yet populated)

  supabase/
    migrations/    SQL schema migrations (0001-0004)
    policies/      RLS policy documentation
    seed/          Demo seed data

  scripts/         Bootstrap, verify-env, seed, sync-models, verify-connectors
  docs/            Documentation (this directory)
```

## Apps

### web (Next.js 15)

The frontend application, built with React 19, TailwindCSS, and Zustand for state management. Uses `@supabase/ssr` for cookie-based auth and `@tanstack/react-query` for data fetching.

Key pages:
- `/` -- Landing / redirect to chat
- `/login`, `/signup`, `/forgot-password`, `/reset-password` -- Auth pages
- `/chat` -- Main chat interface with model selector, conversation list, streaming responses
- `/dashboard` -- Operational dashboard with usage, cost, model, and connector metrics
- `/files` -- File upload and ingestion status
- `/connectors` -- Notion MCP and Supabase MCP connection management
- `/settings` -- User preferences
- `/admin` -- Admin diagnostics, ingestion inspector, retrieval trace viewer

### api (Fastify 5)

The backend API service. Registers plugins for CORS, multipart uploads, WebSocket (streaming), auth, error handling, logging, and request context. Route modules:

| Prefix | Purpose |
|---|---|
| `/health` | Health check endpoint |
| `/chat` | Chat completions (blocking + streaming via WebSocket) |
| `/files` | File upload, listing, status |
| `/connectors` | Notion/Supabase MCP OAuth and status |
| `/search` | Semantic, metadata, and hybrid search |
| `/models` | Model catalog, routing, recommendations |
| `/dashboard` | Analytics, usage, cost, logs |
| `/memory` | Session memory CRUD |
| `/admin` | Admin diagnostics |
| `/evals` | Evaluation framework |

Services under `src/services/`:
- **chat/** -- `chat.service.ts` (orchestrator integration), `conversation.service.ts`, `message.service.ts`, `stream-events.ts`, `ui-event-mapper.ts`
- **models/** -- `model-registry.service.ts`, `model-routing.service.ts`, `model-analysis.service.ts`, `model-recommendation.service.ts`, `model-logging.service.ts`
- **memory/** -- `memory.service.ts`, `memory-policies.ts`, `memory-types.ts`

### worker

Background job processor. Connects to Redis via BullMQ when available; falls back to an in-memory queue in demo mode. Exposes a health endpoint on port 4100.

Registered job types:

| Job | Purpose |
|---|---|
| `file-ingest` | Parse, chunk, embed, index an uploaded file |
| `reprocess-file` | Clean up old data and re-ingest a file |
| `notion-sync` | Sync pages/databases from a connected Notion workspace |
| `connector-health` | Periodic connectivity check for all connectors |
| `generate-summary` | Generate an AI summary of a document |
| `index-version` | Index a new version of an already-ingested file |
| `model-sync` | Refresh the model catalog from OpenRouter |

## Packages (All 12)

| Package | Purpose |
|---|---|
| `ui-contracts` | Shared TypeScript interfaces and Zod validation schemas for auth, chat, connectors, dashboard, files, and models. The single source of truth for API shapes. |
| `db` | Database client factory, TypeScript row types (`schema.ts`), and repository classes for chunks, connectors, conversations, files, logs, memory, messages, models, and model-usage. |
| `auth` | Server-side Supabase auth (`createServerSupabaseClient`, `getServerSession`, `requireAuth`), client-side helpers, and route guard middleware (`AuthGuard` HOF). Demo mode returns a mock user when credentials are absent. |
| `connectors` | Clients for OpenRouter (chat completions, streaming, model catalog), Notion MCP (OAuth, search, page retrieval, block recursion), Supabase MCP (schema introspection, query execution, safety guards), and Supabase Storage (upload helper). |
| `parsers` | File type detection and parsing for PDF, DOCX, TXT, Markdown, CSV, XLSX, JSON, HTML, XML, code files, images (OCR), and archives. Each parser implements a common `BaseParser` interface. Output is normalized into sections, tables, and metadata. |
| `rag-core` | Full RAG pipeline: text chunking (paragraph/sentence/token with overlap), table chunking, embedding via OpenRouter embedding models, semantic vector search, metadata search, hybrid search (weighted merge), deduplication (Jaccard similarity), re-ranking (keyword overlap + source/position diversity), context reconstruction, citation building, and confidence scoring. |
| `agent-core` | The orchestration layer: `Orchestrator` (9-step pipeline), `Planner` (rule-based, zero-cost), `SkillRegistry` (registration + execution), `ToolRuntime` (permission gating, timeouts, dispatch), `ResponseBuilder` (citation markers, follow-up suggestions), and `policies` (tool call budgets, cost limits, allowlists). |
| `agent-skills` | Modular skill implementations: `retrieval-planner`, `file-analyst`, `spreadsheet-analyst`, `notion-analyst`, `supabase-analyst`, `model-analyst`, `research-synthesis`, `report-generator`, `citation-builder`, `memory-manager`, `admin-diagnostics`. |
| `security` | AES-256-GCM encryption/decryption, SHA-256 hashing, key generation, role-based permissions (admin/editor/viewer), SQL injection guards, upload validation (MIME type, extension, size, double-extension, null byte, path traversal), and structured audit logging. |
| `observability` | Pino-based structured logger, lightweight in-process tracing (spans + traces), metrics collection, and cost tracking utilities (estimate, calculate actual, compare deviation). |
| `evals` | Evaluation framework (placeholder for retrieval quality, answer accuracy, and citation coverage benchmarks). |
| `config` | Shared configuration (placeholder for cross-package config utilities). |

## Data Flows

### Chat Message Flow

```
User types message in chat UI
        |
        v
  POST /chat  (or WebSocket for streaming)
        |
        v
  Auth plugin verifies Supabase session (or demo user)
        |
        v
  ChatService builds AgentContext
        |
        v
  Orchestrator.processMessage(context)
    |
    +-- 1. Planner.createPlan()          -- rule-based, zero LLM cost
    |       examines query keywords, available sources, registered skills
    |
    +-- 2-5. Execute plan steps:
    |       RETRIEVE: semantic/hybrid search against files, Notion, Supabase
    |       TOOL: dispatch via ToolRuntime (permission + timeout gated)
    |       ANALYZE: invoke skills via SkillRegistry
    |
    +-- 6. ModelRouter.chat()            -- calls OpenRouter API
    |       applies routing policy, fallback chain, cost constraints
    |       returns content + actual model + token counts + latency
    |
    +-- 7. buildCitations()              -- maps chunks to inline [1][2] markers
    |
    +-- 8. computeConfidence()           -- multi-dimensional 0-1 score
    |
    +-- 9. ResponseBuilder.buildResponse()
    |       inserts citation markers, generates follow-up suggestions,
    |       flags truncation, returns AgentResponse
    |
        v
  Response streamed/returned to client with citations, confidence, metadata
```

### File Ingestion Flow

```
User uploads file via /files page or chat attachment
        |
        v
  POST /files/upload
    validates: size (<=50MB), MIME type, extension, filename safety
    uploads blob to Supabase Storage
    creates file record (status: "uploaded")
    enqueues "file-ingest" job
        |
        v
  Worker picks up job
    |
    +-- 1. Download from Supabase Storage
    +-- 2. detectFileType() by extension + MIME
    +-- 3. getParser(type).parse(buffer)
    +-- 4. normalizeParseResult() -> sections, tables, metadata
    +-- 5. Persist parsed_artifacts to DB
    +-- 6. indexDocument():
    |       chunkText() -- paragraph-first, sentence fallback, token fallback
    |                      512 tokens per chunk, 50 token overlap
    |       embedText() -- calls OpenRouter embedding model
    |       insert chunks with vector(1536) embeddings into chunks table
    +-- 7. Update file status to "processed"
        |
        v
  File is now searchable via semantic/hybrid search
```

### Model Routing Flow

```
Chat request arrives with selectedModel + routingMode
        |
        v
  ModelRoutingService receives request
    |
    +-- 1. Classify task type from query content
    |       (chat, rag, code, reasoning, vision, file-analysis)
    |
    +-- 2. Load applicable RoutingPolicies from DB
    |       sorted by priority (highest first)
    |
    +-- 3. resolveModel(taskType, policies, catalog)
    |       Strategy: direct | auto | task-based | cheap-first | quality-first
    |       Validates against constraints:
    |         - maxCostPerMTokens
    |         - requireZdr (zero data retention)
    |         - requiredModalities
    |         - requiredCapabilities (tags)
    |         - preferredProviders / excludeProviders
    |         - minContextLength
    |         - allowDeprecated
    |
    +-- 4. buildFallbackChain(primary, policies, catalog)
    |       primary model first, then explicit fallbacks, then catalog by score
    |
    +-- 5. estimateRequestCost() -- pre-flight budget check
    |
    +-- 6. OpenRouterClient.chatCompletion() or .streamChatCompletion()
    |       headers: Authorization, HTTP-Referer, X-Title, X-Request-Id
    |       retry: exponential backoff with jitter, max 3 attempts
    |
    +-- 7. calculateActualCost() + compareCosts() for deviation tracking
    |
    +-- 8. Log to model_usage_logs table
    |       (request_id, selected_model, actual_model, routing_mode,
    |        tokens, cost, latency, status, task_type, fallback_used)
        |
        v
  Response returned with actual model metadata
```
