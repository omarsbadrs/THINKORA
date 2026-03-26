# Model Registry

The model registry is Thinkora's internal catalog of LLM models available through OpenRouter. It stores normalized metadata, capability tags, and pricing information used for model selection, routing, and analytics.

## How Models Are Stored

Models are stored in the `model_registry` table with the following schema:

| Column | Type | Description |
|---|---|---|
| `slug` | `text` (PK) | Full model identifier (e.g., `anthropic/claude-sonnet-4`) |
| `canonical_slug` | `text` | Model name without provider prefix (e.g., `claude-sonnet-4`) |
| `display_name` | `text` | Human-readable name |
| `provider_family` | `text` | Provider prefix (e.g., `anthropic`, `openai`, `google`) |
| `description` | `text` | Model description |
| `context_length` | `int` | Maximum context window in tokens |
| `input_cost_per_m` | `float` | Cost per million input tokens (USD) |
| `output_cost_per_m` | `float` | Cost per million output tokens (USD) |
| `input_modalities` | `text[]` | Supported input types (e.g., `{text}`, `{text,image}`) |
| `output_modalities` | `text[]` | Supported output types (e.g., `{text}`) |
| `supported_parameters` | `text[]` | API parameters the model supports |
| `structured_output` | `boolean` | Supports JSON mode / structured output |
| `tools_support` | `boolean` | Supports function/tool calling |
| `reasoning_support` | `boolean` | Has chain-of-thought / reasoning capabilities |
| `is_moderated` | `boolean` | Provider enforces content moderation |
| `max_completion_tokens` | `int` | Maximum output tokens per request |
| `deprecated` | `boolean` | Model is deprecated |
| `expires_at` | `timestamptz` | When the model will be removed (if known) |
| `tags` | `text[]` | Derived capability tags |
| `synced_at` | `timestamptz` | When this record was last updated |

### RLS

The model registry is readable by any authenticated user (`auth.uid() IS NOT NULL`). Write access is restricted to the service role (used during sync).

## Sync Process

### Trigger Methods

| Method | Command | Frequency |
|---|---|---|
| Manual CLI | `pnpm sync-models` | On demand |
| Worker job | `model-sync` job | Configurable cron (`OPENROUTER_MODELS_SYNC_CRON`) |
| API endpoint | `POST /models/sync` | On demand (admin only) |

### Sync Pipeline

```
1. Fetch raw models from OpenRouter
   GET https://openrouter.ai/api/v1/models
   Returns: { data: OpenRouterModel[] }

2. For each raw model:
   normalizeModel(raw) -> ModelRecord

3. Store in two locations:
   a. JSON cache: apps/api/src/demo/model-catalog-cache.json
   b. Database: INSERT ... ON CONFLICT (slug) DO UPDATE

4. Record sync job in model_sync_jobs table:
   { status, models_synced, started_at, completed_at, error }
```

### What sync-models Reports

```
Syncing OpenRouter Model Catalog

  Fetched 342 models from OpenRouter
  Anthropic: 24 models
  OpenAI: 31 models
  Google: 18 models
  Meta: 22 models
  ...

Tag distribution:
  best-for-chat: 89
  long-context: 67
  cheap: 143
  vision: 45
  tool-capable: 78
  reasoning: 23
  coding: 34
  ...

  Cached 342 models to apps/api/src/demo/model-catalog-cache.json
  Synced 342 models to database

  Model sync complete.
```

## Normalization

**File:** `packages/connectors/src/openrouter/normalize-model.ts`

The `normalizeModel()` function transforms raw OpenRouter API responses into the internal `ModelRecord` format.

### Transformations

1. **Slug splitting:** `anthropic/claude-sonnet-4` -> provider: `anthropic`, canonical: `claude-sonnet-4`

2. **Price conversion:** OpenRouter returns cost-per-token as a string (e.g., `"0.000003"`). This is converted to cost-per-million-tokens: `parseFloat(price) * 1_000_000`

3. **Modality parsing:** The architecture modality string (e.g., `"text+image->text"`) is split into input and output modality arrays

4. **Feature detection:** Heuristic pattern matching on slug and name:
   - **Structured output:** GPT-4o, GPT-4-turbo, Claude 3+/4, Gemini 1.5+/2, Mistral Large
   - **Tool calling:** GPT-4, GPT-3.5-turbo, Claude 3+/4, Gemini, Mistral Large, Command-R, Llama 3.1+
   - **Reasoning:** O1, O3, O4, DeepSeek-R, QwQ, models with "reasoning" or "think" in name

## Tag Derivation

**File:** `packages/connectors/src/openrouter/capability-tags.ts`

Tags are derived automatically from model metadata. They enable filtering and routing decisions.

### Available Tags

| Tag | Criteria |
|---|---|
| `fast` | Name matches: flash, mini, haiku, instant, turbo, small, nano, lite, gpt-3.5, gemma |
| `cheap` | Input cost <= $0.50/M AND output cost <= $1.50/M |
| `premium` | Input cost >= $10/M OR output cost >= $30/M |
| `reasoning` | Name matches: o1, o3, o4, deepseek-r, qwq, reasoning, think |
| `coding` | Name matches: code, coder, codestral, starcoder, phind, codellama |
| `vision` | Input modalities include "image" |
| `long-context` | Context length >= 100,000 tokens |
| `structured-output` | Model supports JSON mode |
| `tool-capable` | Model supports function/tool calling |
| `best-for-rag` | Context >= 100K AND matches RAG-strong patterns (GPT-4, Claude 3+/4, Gemini 1.5+/2, Command-R) |
| `best-for-chat` | Matches chat-strong patterns (GPT-4, GPT-3.5, Claude, Gemini, Llama 3, Mistral Large, Mixtral) |
| `best-for-file-analysis` | Context >= 100K AND (vision OR RAG-strong) |

### Tag Derivation Priority

Tags are derived in this order:
1. Cost-based (cheap / premium)
2. Context window (long-context)
3. Modality (vision)
4. Feature flags (structured-output, tool-capable, reasoning)
5. Name-based patterns (coding, reasoning, fast)
6. Composite heuristics (best-for-rag, best-for-chat, best-for-file-analysis)

## Cache Management

### In-Memory Cache

The API service caches the model catalog in memory with a configurable TTL:
- **TTL:** `OPENROUTER_MODEL_CACHE_TTL_SECONDS` (default: 3600 = 1 hour)
- **Invalidation:** Cache is cleared after a successful sync

### JSON File Cache

The `sync-models` script writes a JSON cache file to `apps/api/src/demo/model-catalog-cache.json`. This file is used:
- In demo mode (when database is unavailable)
- As a fallback when the database query fails
- For offline development

### Database Cache

The `model_registry` table serves as the persistent cache. Records are upserted during sync, preserving data between restarts.

## Deprecation Handling

### Detection

Models are marked as deprecated when:
- The `deprecated` flag is set in the raw OpenRouter response
- The model has an `expires_at` date that has passed
- The model is no longer present in the OpenRouter catalog after multiple syncs

### Impact on Routing

- Deprecated models receive a -20 point penalty in the quality scoring algorithm
- The `validateModelChoice()` function rejects deprecated models unless `allowDeprecated` is explicitly set in the routing constraints
- Users can still select deprecated models directly (with a warning in the UI)

### Cleanup

Deprecated models are not automatically deleted from the registry. They remain visible in the catalog with a deprecation indicator for auditing purposes. A periodic cleanup job can be configured to remove models deprecated for more than 30 days.

## Related Tables

| Table | Purpose |
|---|---|
| `model_registry` | Model catalog (primary) |
| `model_sync_jobs` | Sync job history |
| `model_routing_policies` | Routing policy definitions |
| `model_usage_logs` | Per-request usage tracking |
| `model_benchmarks` | Benchmark scores per model/task |
| `model_task_scores` | Aggregated task performance scores |
| `model_fallback_events` | Fallback chain activations |
| `model_cost_daily` | Daily cost aggregates |
| `model_cost_monthly` | Monthly cost aggregates |
| `model_error_events` | Error tracking per model |
| `model_cache_metrics` | Prompt caching effectiveness |
