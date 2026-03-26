# Agent Orchestration System

The agent system is the brain of Thinkora's chat pipeline. It takes a user message, plans what actions to take, retrieves relevant data, invokes skills, calls the LLM, builds citations, and assembles a complete response. The implementation is in `packages/agent-core/` and `packages/agent-skills/`.

## Orchestrator Pipeline

**File:** `packages/agent-core/src/orchestrator.ts`

The `Orchestrator` class implements a 9-step pipeline for processing each user message:

```
Step 1: Plan Execution
  Planner.createPlan(context) -> AgentPlan with ordered steps

Step 2-5: Execute Plan Steps (in order)
  For each step in the plan:
    RETRIEVE -> call RetrievalService.retrieve()
    TOOL     -> call ToolRuntime.executeTool()
    ANALYZE  -> call SkillRegistry.execute()
    RESPOND  -> (handled in step 6)

Step 6: Call LLM
  Build system prompt with retrieved chunks + skill outputs
  ModelRouter.chat() -> content, model, tokens, latency

Step 7: Build Citations
  Map retrieved chunks to Citation objects

Step 8: Compute Confidence
  Multi-dimensional confidence score (retrieval quality,
  citation coverage, source diversity)

Step 9: Assemble Response
  ResponseBuilder.buildResponse() -> AgentResponse
```

### Streaming Variant

`processMessageStream()` follows the same pipeline but:
- Yields `StreamEvent` objects as they occur
- Emits `tool_start`/`tool_end` events during skill/tool execution
- Streams LLM tokens via `ModelRouter.chatStream()`
- Emits citations after the LLM stream completes
- Emits a `done` event with latency and tool call results

### Guardrails

- **Tool call budget:** Maximum 10 tool calls per request (`MAX_TOOL_CALLS_PER_REQUEST`)
- **Retrieval limit:** Maximum 20 chunks injected into the prompt (`MAX_RETRIEVAL_CHUNKS`)
- **Response token limit:** 4096 tokens maximum per LLM response (`MAX_RESPONSE_TOKENS`)
- **Tool timeout:** 30 seconds per tool invocation (`TOOL_TIMEOUT_MS`)

## Planner

**File:** `packages/agent-core/src/planner.ts`

The `Planner` is a deterministic, rule-based planner. It examines the user's query keywords and available sources to produce an ordered execution plan. It is intentionally not LLM-based so that planning incurs zero latency and zero cost.

### Planning Logic

The planner runs through these stages in order:

1. **Retrieval planning skill** -- If the `retrieval-planner` skill is registered, invoke it to decompose the query into sub-queries

2. **Source retrieval** -- Match query keywords against available sources:
   - File keywords ("file", "upload", "document", "pdf", etc.) -> search files
   - Notion keywords ("notion", "page", "wiki", etc.) -> search Notion
   - Database keywords ("database", "sql", "table", etc.) -> search Supabase
   - If no specific source matches but sources exist -> search all

3. **Specialist analysis skills** -- Match keywords to specialized skills:
   - Spreadsheet keywords -> `spreadsheet-analyst`
   - Notion keywords -> `notion-analyst`
   - Database keywords -> `supabase-analyst`
   - File keywords -> `file-analyst`
   - Model keywords -> `model-analyst`

4. **Cross-source synthesis** -- If multiple retrieval steps exist, invoke `research-synthesis`

5. **Report generation** -- If report keywords detected, invoke `report-generator` with appropriate mode (comparison, executive summary, or detailed analysis)

6. **Citation building** -- Always invoke `citation-builder` if registered

7. **Memory management** -- Always invoke `memory-manager` if registered

8. **Final LLM response** -- Always append a `respond` step

### Plan Output

```typescript
interface AgentPlan {
  steps: PlanStep[];     // Ordered list of steps
  reasoning: string;     // Human-readable explanation
}

interface PlanStep {
  type: "retrieve" | "tool" | "analyze" | "respond";
  source?: string;       // For retrieve steps
  query?: string;        // For retrieve steps
  skillId?: string;      // For analyze steps
  params?: Record<string, unknown>;
}
```

## Skill Registry

**File:** `packages/agent-core/src/skill-registry.ts`

The `SkillRegistry` is the central registry for agent skills. Skills are registered at application startup and invoked by the Orchestrator during plan execution.

### API

```typescript
class SkillRegistry {
  // Registration
  register(skill: SkillDefinition, handler: SkillHandler): void;

  // Lookups
  get(skillId: string): SkillDefinition | undefined;
  list(): SkillDefinition[];
  has(skillId: string): boolean;

  // Execution
  execute(skillId: string, input: unknown, context: AgentContext): Promise<SkillExecutionResult>;
}
```

### Skill Definition

Each skill has a static definition describing its capabilities:

```typescript
interface SkillDefinition {
  id: string;                  // e.g., "retrieval-planner"
  name: string;                // Human-readable name
  description: string;         // What the skill does
  inputSchema: object;         // JSON-Schema-like input description
  outputSchema: object;        // JSON-Schema-like output description
  toolDependencies: string[];  // Tools this skill may call
  failureModes: string[];      // Known failure scenarios
  observabilityMetadata: object;
}
```

### Execution

When a skill is executed:
1. The handler function is looked up by skill ID
2. The handler is called with `(input, context)`
3. Duration is measured
4. On success: returns `{ skillId, output, duration, success: true }`
5. On failure: catches the error and returns `{ skillId, output: null, duration, success: false, error }`

Skills never throw to the orchestrator -- failures are captured and logged.

## Tool Runtime

**File:** `packages/agent-core/src/tool-runtime.ts`

The `ToolRuntime` executes tools on behalf of the agent with permission checking, timeouts, and structured logging.

### Available Tools

| Tool Name | Connector | Description |
|---|---|---|
| `search_files` | `searchFiles` | Search indexed file chunks |
| `search_notion` | `searchNotion` | Search Notion pages/databases |
| `query_database` | `queryDatabase` | Run read-only SQL query |
| `upload_file` | `uploadFile` | Upload a file to storage |
| `get_model_info` | `getModelInfo` | Get model metadata from catalog |

### Execution Flow

```
executeTool(toolName, input, context)
        |
        v
  1. Permission check:
     ToolSecurity.isAllowed(toolName, context)
     - Public tools: any authenticated user
     - Admin tools: requires context.sessionMemory.isAdmin === true
     - Unknown tools: rejected
     If denied -> return { status: "denied" }
        |
        v
  2. Dispatch to connector:
     dispatch(toolName, input, context)
     Routes to the correct connector method
        |
        v
  3. Timeout guard:
     withTimeout(promise, 30000ms)
     Races the connector call against a timer
        |
        v
  4. Return result:
     { toolName, status, input, output, durationMs }
     Status: "completed" | "failed" | "timeout" | "denied"
```

## Response Builder

**File:** `packages/agent-core/src/response-builder.ts`

The `ResponseBuilder` assembles the final `AgentResponse` from all artifacts produced during plan execution.

### What It Does

1. **Citation markers:** Scans the LLM output for references to source names or section titles and inserts `[1]`, `[2]`, etc. markers after the relevant sentences

2. **Follow-up suggestions:** Generates suggested next steps:
   - If some sources were not queried -> "Search additional sources: ..."
   - If citations exist -> "Ask for a more detailed analysis"
   - If tool calls failed -> "Retry failed operations: ..."

3. **Truncation flag:** Marks the response as truncated if `tokensOutput >= MAX_RESPONSE_TOKENS`

4. **Factual content flag:** Sets `metadata.hasFactualContent` based on whether citations exist

### Response Shape

```typescript
interface AgentResponse {
  content: string;               // LLM output with citation markers
  citations: Citation[];         // Source citations
  toolCalls: ToolCallResult[];   // Tool invocation results
  confidence: ConfidenceScore;   // Multi-dimensional confidence
  modelUsed: string;             // User-selected model slug
  actualModel: string;           // Actual model that served the request
  tokensUsed: { input, output }; // Token counts
  latencyMs: number;             // End-to-end wall-clock time
  metadata: {
    suggestedFollowUps?: string[];
    truncated?: boolean;
    hasFactualContent: boolean;
    inferredOnly: boolean;
  };
}
```

## Available Skills

All skills are in `packages/agent-skills/src/`:

| Skill ID | File | Description |
|---|---|---|
| `retrieval-planner` | `retrieval-planner.skill.ts` | Decomposes complex queries into sub-queries for multi-source retrieval |
| `file-analyst` | `file-analyst.skill.ts` | Analyzes uploaded file content, extracts key information |
| `spreadsheet-analyst` | `spreadsheet-analyst.skill.ts` | Analyzes tabular data from CSV/XLSX files |
| `notion-analyst` | `notion-analyst.skill.ts` | Analyzes Notion page content and database entries |
| `supabase-analyst` | `supabase-analyst.skill.ts` | Analyzes database schema and query results |
| `model-analyst` | `model-analyst.skill.ts` | Compares and recommends models from the catalog |
| `research-synthesis` | `research-synthesis.skill.ts` | Synthesizes findings from multiple retrieval sources |
| `report-generator` | `report-generator.skill.ts` | Generates structured reports (comparison, executive summary, detailed analysis) |
| `citation-builder` | `citation-builder.skill.ts` | Builds and validates citations from retrieved sources |
| `memory-manager` | `memory-manager.skill.ts` | Manages session memory (store, recall, expire) |
| `admin-diagnostics` | `admin-diagnostics.skill.ts` | System health and diagnostic information (admin only) |

## Adding New Skills

### 1. Create the skill file

Create a new file in `packages/agent-skills/src/`:

```typescript
// my-skill.skill.ts
import type { SkillDefinition, SkillHandler, AgentContext } from "@thinkora/agent-core";

export const MY_SKILL_DEFINITION: SkillDefinition = {
  id: "my-skill",
  name: "My Custom Skill",
  description: "Does something useful",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      result: { type: "string" },
    },
  },
  toolDependencies: [],         // Tools this skill uses
  failureModes: ["timeout"],    // Known failure types
  observabilityMetadata: {},
};

export const mySkillHandler: SkillHandler = async (
  input: unknown,
  context: AgentContext,
): Promise<unknown> => {
  const params = input as { query: string };
  // ... do work ...
  return { result: "..." };
};
```

### 2. Export from index

Add to `packages/agent-skills/src/index.ts`:

```typescript
export { MY_SKILL_DEFINITION, mySkillHandler } from "./my-skill.skill.js";
```

### 3. Register in the API service

In the API startup, register the skill with the SkillRegistry:

```typescript
import { MY_SKILL_DEFINITION, mySkillHandler } from "@thinkora/agent-skills";

skillRegistry.register(MY_SKILL_DEFINITION, mySkillHandler);
```

### 4. Add planner keywords (optional)

If you want the planner to automatically invoke your skill, add keyword matching logic in `packages/agent-core/src/planner.ts`:

```typescript
const MY_KEYWORDS = ["my-topic", "my-domain"];

// In createPlan():
if (containsAny(query, MY_KEYWORDS) && this.skillRegistry.has("my-skill")) {
  steps.push({
    type: "analyze",
    skillId: "my-skill",
    params: { query },
  });
  reasons.push("Invoking my custom skill");
}
```
