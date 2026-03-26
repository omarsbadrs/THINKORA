# Model Routing Policies

The model routing system determines which LLM model handles each request based on task type, user preferences, cost constraints, and provider availability. The implementation is in `packages/connectors/src/openrouter/router-policy.ts`.

## Routing Modes Explained

Users select a routing mode in the chat UI. Each mode maps to a routing strategy:

| Routing Mode | Strategy | Description |
|---|---|---|
| **Auto** | `auto` | System selects the best model by composite quality score |
| **Fast** | `cheap-first` | Cheapest valid model for quick responses |
| **Balanced** | `auto` | Same as Auto with moderate cost constraints |
| **Best Quality** | `quality-first` | Highest quality model regardless of cost |
| **Reasoning** | `task-based` | Models with reasoning/chain-of-thought support |
| **Coding** | `task-based` | Models specialized for code generation |
| **Vision** | `task-based` | Models supporting image input |
| **Data Analysis** | `task-based` | Models suited for structured data analysis |
| **Direct** | `direct` | User explicitly selects a specific model |

## Task Classification

Before routing, the system classifies the incoming request into a task type based on query content:

| Task Type | Detected When |
|---|---|
| `chat` | General conversation, no specific domain keywords |
| `rag` / `retrieval` | References to files, documents, uploaded content |
| `code` / `coding` | Programming questions, code generation requests |
| `reasoning` / `analysis` | Complex analysis, comparisons, logical deduction |
| `file-analysis` | References to specific uploaded files |
| `vision` | Image-related queries or requests involving visual content |

Task types are used by the `task-based` routing strategy to select models with matching capability tags.

## Policy Engine

### RoutingPolicy Structure

```typescript
interface RoutingPolicy {
  id: string;                 // Unique policy identifier
  name: string;               // Human-readable name
  strategy: RoutingStrategy;  // "direct" | "auto" | "task-based" | "cheap-first" | "quality-first"
  primaryModel: string | null; // Preferred model slug
  fallbackModels: string[];   // Ordered fallback slugs
  constraints: RoutingConstraints;  // Validation constraints
  taskTypes: string[];        // Task types this policy applies to (empty = all)
  priority: number;           // Higher number = higher priority
}
```

### Resolution Order

```
resolveModel(taskType, policies, catalog)
        |
        v
  1. Filter policies to those matching the task type
     (policies with empty taskTypes match all tasks)
        |
        v
  2. Sort by priority (descending -- highest first)
        |
        v
  3. For each policy, apply its strategy:
     |
     +-- direct:      Find the primary model in catalog, validate
     +-- auto:        Score all valid models, pick highest
     +-- task-based:  Derive capability requirements from task types,
     |                filter catalog, pick highest scoring
     +-- cheap-first: Filter valid models, sort by ascending cost
     +-- quality-first: Filter valid models, sort by descending quality score
        |
        v
  4. Return first successful resolution, or null if none qualify
```

### Model Scoring

The `scoreModel()` function computes a composite quality score:

```
Score Components:
  + Context length bonus: min(log2(contextLength/1000) * 3, 20)
  + Tool support: +10
  + Reasoning support: +8
  + Structured output: +5
  + "best-for-chat" tag: +5
  + "best-for-rag" tag: +5
  + "long-context" tag: +3
  + "vision" tag: +2
  - Expensive (avg cost > $30/M): -5
  - Moderate cost (avg cost > $15/M): -2
  - Deprecated: -20
```

## Fallback Chains

When fallbacks are enabled (`OPENROUTER_ENABLE_MODEL_FALLBACKS=true`), the system builds an ordered list of models to try if the primary model fails.

### buildFallbackChain() Logic

```
buildFallbackChain(primarySlug, policies, catalog)
        |
        v
  1. Find the policy that specifies the primary model
     Extract constraints from that policy
        |
        v
  2. Add primary model (if it exists and passes validation)
        |
        v
  3. Add explicit fallback models from the policy
     (in order, validated against constraints)
        |
        v
  4. Fill remaining slots from catalog
     (sorted by descending quality score, validated)
        |
        v
  Return: ModelMetadata[] (ordered fallback chain)
```

### How Fallbacks Are Used

The fallback chain is sent to OpenRouter via the `provider.order` parameter:

```typescript
{
  model: "anthropic/claude-sonnet-4",
  route: "fallback",
  provider: {
    order: ["anthropic", "openai", "google"],
    allow_fallbacks: true,
  }
}
```

If the primary model is unavailable, OpenRouter automatically routes to the next model in the chain.

### Fallback Events

When a fallback occurs, it is logged in the `model_fallback_events` table:

| Column | Description |
|---|---|
| `request_id` | Correlates with the original request |
| `original_model` | Model that was requested |
| `fallback_model` | Model that actually served the request |
| `reason` | Why the fallback occurred (e.g., "model_unavailable", "rate_limited") |

## Cost Constraints

### Per-Request Cost Ceiling

```bash
OPENROUTER_MAX_REQUEST_COST_USD=1.00
```

Before sending a request, the estimated cost is checked against this ceiling:
```
estimatedCost = (inputTokens / 1M) * inputCostPerM + (outputTokensEstimate / 1M) * outputCostPerM
if (estimatedCost > maxRequestCost) -> reject
```

### Per-Policy Cost Ceiling

Each routing policy can define `maxCostPerMTokens` in its constraints. This filters out models whose average cost-per-million-tokens exceeds the limit:

```typescript
const avgCost = (model.inputCostPerM + model.outputCostPerM) / 2;
if (avgCost > constraints.maxCostPerMTokens) -> reject model
```

### Daily and Monthly Budgets

```bash
OPENROUTER_BUDGET_DAILY_USD=10.00
OPENROUTER_BUDGET_MONTHLY_USD=200.00
```

Budget checks aggregate usage from the `model_usage_logs` table:
- If daily spending exceeds the daily limit, all requests are blocked until the next day
- If monthly spending exceeds the monthly limit, all requests are blocked until the next month

## Provider Preferences

### Preferred Providers

Specify preferred providers via routing policy constraints:

```typescript
constraints: {
  preferredProviders: ["anthropic", "openai"]
}
```

When set, only models from these providers are considered. All others are filtered out.

### Excluded Providers

Exclude specific providers:

```typescript
constraints: {
  excludeProviders: ["meta", "mistralai"]
}
```

Models from excluded providers are filtered out regardless of quality or cost.

### Global Configuration

```bash
OPENROUTER_DEFAULT_IGNORED_PROVIDERS=  # Comma-separated provider names
```

## ZDR Requirements

Zero Data Retention (ZDR) ensures that LLM providers do not store request/response data.

### Configuration

```bash
OPENROUTER_REQUIRE_ZDR=false
```

### How It Works

When `requireZdr: true` is set (either globally or per-policy):
- Only models where `is_moderated: true` are considered
- This maps to providers that enforce content moderation and data handling policies
- The `data_collection: "deny"` parameter is sent in every request

### Per-Policy ZDR

```typescript
// In a routing policy:
constraints: {
  requireZdr: true
}
```

## Custom Policies

### Creating a Custom Policy

Policies are stored in the `model_routing_policies` table:

```sql
INSERT INTO model_routing_policies (
  name,
  routing_mode,
  primary_model,
  fallback_models,
  provider_preferences,
  max_cost_per_request,
  require_zdr,
  task_types,
  priority
) VALUES (
  'Budget RAG',
  'cheap-first',
  'anthropic/claude-haiku-4',
  ARRAY['openai/gpt-4o-mini', 'google/gemini-flash-1.5'],
  '{"preferredProviders": ["anthropic", "openai", "google"]}'::jsonb,
  0.50,
  false,
  ARRAY['rag', 'retrieval'],
  10
);
```

### Policy Examples

**Budget-friendly chat:**
```
strategy: cheap-first
constraints: { maxCostPerMTokens: 2.0 }
taskTypes: ["chat"]
priority: 5
```

**Premium analysis:**
```
strategy: quality-first
primaryModel: anthropic/claude-sonnet-4
constraints: { requiredCapabilities: ["reasoning", "long-context"] }
taskTypes: ["analysis", "reasoning"]
priority: 10
```

**Secure enterprise:**
```
strategy: auto
constraints: {
  requireZdr: true,
  preferredProviders: ["anthropic", "openai"],
  minContextLength: 100000
}
taskTypes: []  // All tasks
priority: 20
```

**Code-only fast:**
```
strategy: task-based
primaryModel: anthropic/claude-sonnet-4
fallbackModels: ["deepseek/deepseek-coder", "openai/gpt-4o"]
constraints: { requiredCapabilities: ["coding"] }
taskTypes: ["code", "coding"]
priority: 15
```

### Constraint Reference

| Constraint | Type | Description |
|---|---|---|
| `maxCostPerMTokens` | `number` | Max average cost per million tokens |
| `requireZdr` | `boolean` | Require zero data retention / moderation |
| `requireParametersMatch` | `boolean` | Require provider supports all request params |
| `requiredModalities` | `string[]` | Must support these input/output modalities |
| `requiredCapabilities` | `string[]` | Must have these capability tags |
| `preferredProviders` | `string[]` | Only consider models from these providers |
| `excludeProviders` | `string[]` | Exclude models from these providers |
| `minContextLength` | `number` | Minimum context window in tokens |
| `allowDeprecated` | `boolean` | Allow deprecated models (default: false) |
