# OpenRouter Integration

Thinkora uses [OpenRouter](https://openrouter.ai) as its LLM gateway, providing access to 200+ models from multiple providers through a single API. The integration is implemented in `packages/connectors/src/openrouter/`.

## API Configuration

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | API key from [openrouter.ai/keys](https://openrouter.ai/keys) | (required) |
| `OPENROUTER_BASE_URL` | API base URL | `https://openrouter.ai/api/v1` |
| `OPENROUTER_SITE_URL` | Your site URL, sent as `HTTP-Referer` | `http://localhost:3000` |
| `OPENROUTER_APP_NAME` | Your app name, sent as `X-Title` | `Thinkora` |

### Client Configuration

```typescript
interface OpenRouterConfig {
  apiKey: string;       // Required
  baseUrl?: string;     // Default: "https://openrouter.ai/api/v1"
  siteName?: string;    // Sent as X-Title header
  siteUrl?: string;     // Sent as HTTP-Referer header
  timeoutMs?: number;   // Default: 60000 (60 seconds)
  maxRetries?: number;  // Default: 3
}
```

### Request Headers

Every request to OpenRouter includes:

| Header | Value | Purpose |
|---|---|---|
| `Authorization` | `Bearer <apiKey>` | Authentication |
| `Content-Type` | `application/json` | Request format |
| `X-Request-Id` | `thinkora-<timestamp>-<random>` | Request tracing |
| `HTTP-Referer` | `OPENROUTER_SITE_URL` | App identification |
| `X-Title` | `OPENROUTER_APP_NAME` | App identification |

## Model Catalog Sync

### Sync Process

The model catalog is synced from OpenRouter's `/models` endpoint. This can be triggered:
- Manually: `pnpm sync-models`
- Automatically: via the `model-sync` worker job on a cron schedule (`OPENROUTER_MODELS_SYNC_CRON`)
- On demand: via the API's model management endpoints

### Sync Flow

```
GET /models (OpenRouter API)
        |
        v
  Returns { data: OpenRouterModel[] }
  Each model includes: id, name, description, context_length,
  pricing, architecture, top_provider, per_request_limits
        |
        v
  For each model:
    normalizeModel(raw) -> ModelRecord
      - Split slug into provider/canonical parts
      - Parse pricing strings to cost-per-million-tokens
      - Parse modality string (e.g., "text+image->text")
      - Detect feature support (structured output, tools, reasoning)
      - Derive capability tags
        |
        v
  Two storage targets:
    1. JSON cache file (apps/api/src/demo/model-catalog-cache.json)
       Used when database is unavailable (demo mode)

    2. model_registry database table
       UPSERT on slug (INSERT ... ON CONFLICT DO UPDATE)
       Updates: display_name, pricing, tags, synced_at
```

### Sync Output

After sync, the script reports:
- Total model count
- Models per provider (top 10)
- Tag distribution (cheap, premium, vision, reasoning, etc.)

## Chat Completions

### Blocking Request

```typescript
const response = await client.chatCompletion({
  model: "anthropic/claude-sonnet-4",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
  temperature: 0.7,
  max_tokens: 4096,
});
```

### Response Shape

```typescript
interface ChatCompletionResponse {
  id: string;
  model: string;           // Actual model used (may differ from requested)
  created: number;
  choices: [{
    index: number;
    message: { role: "assistant", content: "..." };
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter";
  }];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint: string | null;
}
```

### OpenRouter-Specific Parameters

Beyond the standard OpenAI-compatible parameters, Thinkora uses these OpenRouter-specific options:

```typescript
{
  // Enable fallback routing
  route: "fallback",

  // Provider preferences
  provider: {
    order: ["anthropic", "openai", "google"],    // Preferred provider order
    allow_fallbacks: true,                       // Allow fallback to other providers
    require_parameters: false,                   // Require provider supports all params
    data_collection: "deny",                     // Data retention policy
  },

  // Request transforms
  transforms: ["middle-out"],  // Token optimization
}
```

## Streaming

### Streaming Request

```typescript
const stream = client.streamChatCompletion({
  model: "anthropic/claude-sonnet-4",
  messages: [...],
  stream: true,  // Set automatically by the method
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process.stdout.write(content);
}
```

### Stream Chunk Shape

```typescript
interface StreamChunk {
  id: string;
  model: string;
  created: number;
  choices: [{
    index: number;
    delta: {
      role?: "assistant";
      content?: string;        // Incremental text token
      tool_calls?: ToolCallRequest[];
    };
    finish_reason: "stop" | "length" | null;
  }];
  usage?: TokenUsage | null;  // Included in final chunk
}
```

### SSE Processing

The streaming implementation:
1. Sends a POST request with `stream: true`
2. Reads the response body as a `ReadableStream`
3. Parses Server-Sent Events (SSE) line by line
4. Handles `data: [DONE]` as the stream terminator
5. Yields parsed `StreamChunk` objects via an async generator
6. Handles partial lines by buffering across read iterations

## Custom Headers

All requests include custom headers for identification and tracing:

```typescript
// In buildHeaders():
{
  "Content-Type": "application/json",
  "Authorization": "Bearer sk-or-v1-...",
  "X-Request-Id": "thinkora-<base36-timestamp>-<random>",
  "HTTP-Referer": "https://your-domain.com",  // OPENROUTER_SITE_URL
  "X-Title": "Thinkora",                      // OPENROUTER_APP_NAME
}
```

The `X-Request-Id` is generated uniquely per request using the current timestamp (base36) and a random suffix. It is included in error objects for debugging.

## Error Handling

### Error Classification

The `OpenRouterError` class provides structured error information:

```typescript
class OpenRouterError extends Error {
  code: string;            // Error classification
  status: number | null;   // HTTP status code
  retryable: boolean;      // Whether retry is appropriate
  requestId: string | null; // For debugging
}
```

### Error Codes

| Code | Status | Retryable | Meaning |
|---|---|---|---|
| `API_ERROR` | 4xx (not 429) | No | Client error (bad request, auth failure, etc.) |
| `RATE_LIMITED` | 429 | Yes | Too many requests |
| `SERVER_ERROR` | 5xx | Yes | OpenRouter server error |
| `TIMEOUT` | -- | Yes | Request exceeded timeout |
| `STREAM_ERROR` | -- | No | Streaming response had no body |
| `MAX_RETRIES_EXCEEDED` | -- | No | All retry attempts exhausted |

### Retry Logic

The client automatically retries on transient failures:

- **Retryable errors:** 429 (rate limit), 5xx (server error), timeouts
- **Non-retryable errors:** 4xx (except 429), stream errors
- **Max retries:** 3 (configurable)
- **Backoff:** Exponential with jitter
  ```
  delay = min(1000ms * 2^attempt + random(0-1000ms), 30000ms)
  ```

### Retry Timeline Example

```
Attempt 0: immediate
  -> 429 Rate Limited
  -> backoff: ~1500ms (1000 + jitter)

Attempt 1: after ~1.5s
  -> 503 Server Error
  -> backoff: ~2800ms (2000 + jitter)

Attempt 2: after ~2.8s
  -> 200 OK (success)
```

## Cost Calculation

**File:** `packages/connectors/src/openrouter/cost-estimator.ts`

### Pre-Request Estimation

Before sending a request, the estimated cost is calculated:

```typescript
const estimate = estimateRequestCost(model, inputTokens, outputTokensEstimate);
// Returns: { estimatedInputCost, estimatedOutputCost, estimatedTotalCost }
```

Pricing is in cost-per-million-tokens:
```
inputCost = (inputTokens / 1,000,000) * model.inputCostPerM
outputCost = (outputTokens / 1,000,000) * model.outputCostPerM
```

### Post-Request Calculation

After a response, the actual cost is calculated from the `usage` field:

```typescript
const actual = calculateActualCost(model, response.usage);
// Returns: { inputCost, outputCost, totalCost }
```

### Deviation Analysis

The `compareCosts()` function compares estimated vs actual costs:

```typescript
const deviation = compareCosts(estimate, actual);
// Returns: {
//   costDeviation: number,           // USD difference
//   costDeviationPercent: number,     // Percentage difference
//   inputTokenDeviation: number,      // Token count difference
//   outputTokenDeviation: number,
// }
```

This data feeds into the dashboard's cost accuracy monitoring.

## Prompt Caching

When `OPENROUTER_ENABLE_PROMPT_CACHING=true`, the system leverages provider-level prompt caching for supported models. This reduces costs and latency for repeated system prompts.

### How It Works

1. OpenRouter routes the request to a provider that supports caching
2. If the system prompt has been seen before (cache hit), the provider charges reduced input token costs
3. Cache metrics are tracked in the `model_cache_metrics` table:
   - `cache_hits` / `cache_misses`
   - `tokens_saved`
   - `cost_saved`

### Monitoring

Cache performance is visible on the dashboard and via the `model_cache_metrics` table.
