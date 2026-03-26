# Dashboard and Analytics

The Thinkora dashboard provides real-time operational visibility into request volume, token usage, cost tracking, model performance, connector health, ingestion status, and retrieval quality. The dashboard frontend is in `apps/web/components/dashboard/` and the API endpoints are under `apps/api/src/routes/dashboard.ts`.

## Overview Metrics

**Component:** `OverviewCards.tsx`

The top-level overview shows key metrics at a glance:

| Metric | Source | Description |
|---|---|---|
| **Total Requests** | `model_usage_logs` | Count of all LLM requests in the selected time range |
| **Total Tokens** | `model_usage_logs` | Sum of `tokens_input + tokens_output` |
| **Total Cost** | `model_usage_logs` | Sum of `cost_usd` |
| **Average Latency** | `model_usage_logs` | Mean `latency_ms` across all requests |
| **Error Rate** | `model_error_events` | Percentage of requests that resulted in errors |
| **Active Models** | `model_usage_logs` | Count of distinct `actual_model` values used |

Each card shows the current value and a trend indicator (percentage change vs. the previous period).

## Usage Timeseries

**Component:** `UsageTimeseries.tsx`

An interactive line/area chart showing metrics over time. Built with Recharts.

### Available Views

| View | Y-Axis | Description |
|---|---|---|
| Requests | Count | Number of requests per time bucket |
| Tokens | Count | Total tokens (input + output) per time bucket |
| Cost | USD | Total spending per time bucket |
| Latency | ms | Average response latency per time bucket |
| Errors | Count | Error events per time bucket |

### Time Ranges

- Last 1 hour
- Last 24 hours
- Last 7 days
- Last 30 days
- Custom range

### Data Sources

- `model_usage_logs` for request/token/cost/latency data
- `model_error_events` for error data
- `model_cost_daily` and `model_cost_monthly` for pre-aggregated cost data

## Cost Breakdown

**Component:** `CostPanel.tsx`

Breaks down spending by model, provider, and time period.

### Views

1. **By Model:** Table showing each model's total cost, request count, and average cost per request
2. **By Provider:** Aggregated cost per provider family (Anthropic, OpenAI, Google, etc.)
3. **Daily Trend:** Bar chart of daily spending from `model_cost_daily`
4. **Monthly Summary:** Summary from `model_cost_monthly`
5. **Budget Status:** Current daily and monthly spending vs. configured limits

### Data Sources

| Table | Purpose |
|---|---|
| `model_usage_logs` | Per-request cost data |
| `model_cost_daily` | Pre-aggregated daily costs per model |
| `model_cost_monthly` | Pre-aggregated monthly costs per model |

## Model Performance

**Components:** `ModelUsageTable.tsx`, `ModelComparePanel.tsx`, `ModelDetailPanel.tsx`

### Usage Table

Sortable table of all models used in the selected time range:

| Column | Description |
|---|---|
| Model | Display name and slug |
| Requests | Total request count |
| Tokens (In/Out) | Total input and output tokens |
| Cost | Total USD spent |
| Avg Latency | Mean response time in ms |
| Error Rate | Percentage of failed requests |
| Fallback Rate | Percentage of requests that triggered a fallback |
| Last Used | Timestamp of most recent request |

### Compare Panel

Side-by-side comparison of 2-4 selected models:
- Latency distribution (p50, p95, p99)
- Cost per request comparison
- Error rate comparison
- Token efficiency (output/input ratio)
- Task type breakdown

### Detail Panel

Deep dive into a single model's performance:
- Request volume over time
- Latency distribution histogram
- Error breakdown by type
- Fallback events (when this model was the source or target)
- Task type usage breakdown
- Cache hit rate and savings

### Data Sources

| Table | Purpose |
|---|---|
| `model_usage_logs` | Per-request metrics |
| `model_benchmarks` | Benchmark scores |
| `model_task_scores` | Aggregated task performance |
| `model_fallback_events` | Fallback chain activations |
| `model_error_events` | Error events per model |
| `model_cache_metrics` | Prompt caching effectiveness |

## Model Catalog Explorer

**Components:** `ModelCatalogExplorer.tsx`, `ModelFilters.tsx`

Browse and filter the complete model catalog:

### Filter Dimensions

| Filter | Options |
|---|---|
| Provider | Anthropic, OpenAI, Google, Meta, Mistral, etc. |
| Capability Tags | fast, cheap, premium, reasoning, coding, vision, long-context, etc. |
| Context Length | Min/max range slider |
| Cost Range | Min/max cost per million tokens |
| Features | Structured output, tool calling, reasoning support |
| Status | Active, deprecated |
| Search | Free-text search on name and description |

### Sorting Options

- Cost (ascending/descending)
- Context length
- Name (alphabetical)
- Provider
- Last synced

## Request Logs

**Component:** `LogsPanel.tsx`

Searchable, filterable table of individual requests:

| Column | Description |
|---|---|
| Timestamp | When the request was made |
| Request ID | Unique identifier for tracing |
| User | Who made the request |
| Model (Selected) | Model the user chose |
| Model (Actual) | Model that served the request |
| Routing Mode | Auto, Fast, Quality, etc. |
| Tokens (In/Out) | Token counts |
| Cost | USD cost |
| Latency | Response time in ms |
| Status | Success, error, timeout |
| Task Type | Classified task type |
| Fallback | Whether a fallback was used |

### Filters

- Time range
- Model
- Routing mode
- Status (success/error)
- Task type
- User
- Minimum/maximum cost
- Minimum/maximum latency

## Error Tracking

**Component:** `ErrorPanel.tsx`

Monitors and categorizes errors across the system:

### Error Categories

| Category | Source | Examples |
|---|---|---|
| **LLM Errors** | `model_error_events` | Rate limits, timeouts, model unavailable |
| **Connector Errors** | `connector_accounts` | Notion auth expired, Supabase connection failed |
| **Ingestion Errors** | `file_processing_jobs` | Parse failures, unsupported formats |
| **System Errors** | Application logs | Unhandled exceptions, database errors |

### Error Event Schema

```typescript
interface ModelErrorEventRow {
  id: string;
  model_slug: string;
  error_type: string;       // e.g., "RATE_LIMITED", "TIMEOUT", "API_ERROR"
  error_message: string;
  request_id: string;       // For correlation with request logs
  created_at: string;
}
```

### Visualization

- Error rate over time (line chart)
- Error breakdown by type (pie/donut chart)
- Error breakdown by model (bar chart)
- Recent errors table with details

## Connector Health

**Component:** `ConnectorStatusPanel.tsx`

Displays the status of all configured connectors:

| Field | Description |
|---|---|
| Connector Type | Notion, Supabase MCP |
| Status | connected, disconnected, error |
| Last Sync | When the connector was last synced |
| Documents | Number of indexed documents |
| Error | Error message if status is "error" |

### Health Checks

The `connector-health` worker job periodically tests connectivity:
- Notion: Attempts a lightweight search query
- Supabase MCP: Attempts a connectivity check
- Results update the `connector_accounts` table

## Ingestion Monitoring

**Component:** `IngestionStatusPanel.tsx`

Tracks the file ingestion pipeline:

### Metrics

| Metric | Source | Description |
|---|---|---|
| Files Uploaded | `files` table | Total files uploaded |
| Files Processed | `files` where status = 'processed' | Successfully ingested files |
| Files Failed | `files` where status = 'failed' | Failed ingestion |
| Files Processing | `files` where status = 'processing' | Currently being processed |
| Total Chunks | `chunks` table | Total indexed chunks across all files |
| Avg Chunks/File | Computed | Average chunks produced per file |

### Job History

Table of recent `file_processing_jobs` with:
- File name
- Status (pending, running, completed, failed)
- Current stage (downloading, parsing, indexing, etc.)
- Progress percentage
- Duration
- Error message (if failed)
- Retry count

### Admin Tools

The admin page (`/admin`) provides additional ingestion tools:

- **IngestionJobsPanel:** Detailed job history with filtering and retry controls
- **FileParseInspector:** Examine parsed artifacts, sections, and metadata for any file

## Retrieval Health

**Component:** `RetrievalHealthPanel.tsx`

Monitors the quality and performance of the RAG retrieval system:

### Metrics

| Metric | Source | Description |
|---|---|---|
| Retrieval Queries | `retrieval_logs` | Total retrieval queries executed |
| Avg Chunks Retrieved | `retrieval_logs.chunks_retrieved` | Average chunks per query |
| Avg Relevance | `retrieval_logs.avg_relevance` | Average similarity score |
| Cache Hit Rate | `retrieval_logs.cache_hit` | Percentage of queries served from cache |
| Avg Retrieval Time | `retrieval_logs.duration_ms` | Average retrieval latency |

### Quality Indicators

- **Relevance distribution:** Histogram of average relevance scores across queries
- **Chunk count distribution:** How many chunks are typically retrieved
- **Source diversity:** How many distinct files/sources contribute to answers
- **Citation coverage:** What fraction of answers include citations

## Request Traces

**Component:** `RequestTraceDrawer.tsx`

Drill-down view for a single request, showing the complete execution trace:

### Trace Contents

1. **Request metadata:** timestamp, user, model, routing mode
2. **Planning:** Planner output (steps and reasoning)
3. **Retrieval:** Which sources were queried, how many chunks returned, relevance scores
4. **Tool calls:** Each tool invocation with input, output, duration, and status
5. **Skill executions:** Which skills ran, their outputs, and duration
6. **LLM call:** Model used, tokens consumed, latency
7. **Response:** Citations generated, confidence score, follow-up suggestions
8. **Cost:** Estimated vs actual cost, deviation

### Data Sources

| Table | Information |
|---|---|
| `model_usage_logs` | Request-level metrics |
| `tool_execution_logs` | Tool call details |
| `retrieval_logs` | Retrieval query details |
| `message_citations` | Citations generated |
| `model_fallback_events` | Fallback chain activations |

The admin page also includes a `RetrievalTracePanel` component for examining retrieval-specific traces with query decomposition and chunk details.
