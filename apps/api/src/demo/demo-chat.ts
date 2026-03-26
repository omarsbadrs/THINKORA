/**
 * Demo chat responses — Canned replies and sample conversations for demo mode.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DemoConversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  messageCount: number;
}

interface DemoMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Topic detection
// ---------------------------------------------------------------------------

type Topic = "code" | "data" | "architecture" | "models" | "general";

const TOPIC_PATTERNS: [Topic, RegExp][] = [
  ["code", /\b(code|function|bug|error|typescript|javascript|react|api|endpoint|refactor|debug)\b/i],
  ["data", /\b(database|query|sql|supabase|table|schema|migration|vector|embedding)\b/i],
  ["architecture", /\b(architect|design|system|pattern|microservice|monolith|infra|deploy|docker)\b/i],
  ["models", /\b(model|llm|gpt|claude|openrouter|token|prompt|cost|routing|benchmark)\b/i],
];

function detectTopic(query: string): Topic {
  for (const [topic, pattern] of TOPIC_PATTERNS) {
    if (pattern.test(query)) return topic;
  }
  return "general";
}

// ---------------------------------------------------------------------------
// Demo responses
// ---------------------------------------------------------------------------

const TOPIC_RESPONSES: Record<Topic, string[]> = {
  code: [
    "Here is a concise approach: extract the shared logic into a utility function, then import it in both modules. This avoids duplication and keeps the surface area small.\n\n```typescript\nexport function parseInput(raw: string): ParsedInput {\n  // validate, normalise, return\n}\n```\n\nWould you like me to scaffold the full implementation?",
    "The error is likely caused by a missing null check before accessing the nested property. Adding an optional chain (`?.`) on line 42 should resolve it. Let me know if you want me to trace the full call stack.",
  ],
  data: [
    "Your Supabase schema looks well-structured. I would recommend adding a GIN index on the `metadata` JSONB column to speed up filtered queries:\n\n```sql\nCREATE INDEX idx_memories_metadata ON memories USING gin(metadata);\n```\n\nThis will significantly improve lookup times for metadata-based searches.",
    "The vector similarity search can be optimised by reducing the embedding dimension from 1536 to 512 with a projection layer. This trades a small amount of recall for a 3x speed improvement on large corpora.",
  ],
  architecture: [
    "For Thinkora's architecture, I recommend a layered approach:\n\n1. **API Gateway** — rate limiting, auth, routing\n2. **Service Layer** — business logic, orchestration\n3. **Connector Layer** — MCP adapters, external APIs\n4. **Data Layer** — Supabase, vector store, cache\n\nThis keeps each layer independently testable and deployable.",
    "The MCP connector pattern you're using is solid. Consider adding a circuit breaker around each connector so that a failing external service doesn't cascade into the rest of the system.",
  ],
  models: [
    "Based on your usage patterns, I'd recommend routing simple queries to `mistralai/mistral-small` ($0.001/1K tokens) and complex reasoning tasks to `anthropic/claude-sonnet-4` ($0.003/$0.015). This could reduce your monthly spend by approximately 40% while maintaining quality.\n\nWant me to analyse your last 30 days of usage to refine these thresholds?",
    "The current model catalog has 247 models synced from OpenRouter. The top performers for your use case (RAG + code generation) are Claude Sonnet, GPT-4o, and Gemini 2.0 Flash. I can run a benchmark comparison if you'd like.",
  ],
  general: [
    "I can help with that. Thinkora connects to your knowledge base via MCP connectors, indexes documents using RAG, and routes queries to the best-fit LLM. What specific aspect would you like to explore?",
    "Sure! Here's a quick summary of what I found in your connected sources. Let me know if you'd like to drill into any of these topics further.",
  ],
};

/**
 * Return a contextual demo response based on the query content.
 */
export function getDemoResponse(query: string): string {
  const topic = detectTopic(query);
  const responses = TOPIC_RESPONSES[topic];
  // Deterministic pick based on query length for consistency
  const index = query.length % responses.length;
  return responses[index];
}

// ---------------------------------------------------------------------------
// Sample conversations
// ---------------------------------------------------------------------------

const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: "demo-conv-001",
    title: "Model routing optimisation",
    model: "anthropic/claude-sonnet-4",
    createdAt: "2026-03-25T14:00:00Z",
    messageCount: 6,
  },
  {
    id: "demo-conv-002",
    title: "Supabase schema design",
    model: "anthropic/claude-sonnet-4",
    createdAt: "2026-03-24T10:00:00Z",
    messageCount: 4,
  },
  {
    id: "demo-conv-003",
    title: "RAG pipeline debugging",
    model: "google/gemini-2.0-flash-001",
    createdAt: "2026-03-23T16:30:00Z",
    messageCount: 8,
  },
];

const DEMO_MESSAGES: DemoMessage[] = [
  // Conversation 1
  {
    id: "demo-msg-001",
    conversationId: "demo-conv-001",
    role: "user",
    content: "How should I set up model routing for cost efficiency?",
    createdAt: "2026-03-25T14:00:00Z",
  },
  {
    id: "demo-msg-002",
    conversationId: "demo-conv-001",
    role: "assistant",
    content: TOPIC_RESPONSES.models[0],
    model: "anthropic/claude-sonnet-4",
    createdAt: "2026-03-25T14:00:05Z",
  },
  {
    id: "demo-msg-003",
    conversationId: "demo-conv-001",
    role: "user",
    content: "Yes, please analyse my usage and suggest thresholds.",
    createdAt: "2026-03-25T14:01:00Z",
  },
  {
    id: "demo-msg-004",
    conversationId: "demo-conv-001",
    role: "assistant",
    content:
      "Looking at your last 30 days: 78% of queries are < 200 tokens and classified as simple retrieval. Routing these to Mistral Small would save approximately $12.40/month. I recommend a token-length threshold of 150 tokens and a complexity score threshold of 0.4.",
    model: "anthropic/claude-sonnet-4",
    createdAt: "2026-03-25T14:01:10Z",
  },
  // Conversation 2
  {
    id: "demo-msg-005",
    conversationId: "demo-conv-002",
    role: "user",
    content: "What indexes should I add to my Supabase tables?",
    createdAt: "2026-03-24T10:00:00Z",
  },
  {
    id: "demo-msg-006",
    conversationId: "demo-conv-002",
    role: "assistant",
    content: TOPIC_RESPONSES.data[0],
    model: "anthropic/claude-sonnet-4",
    createdAt: "2026-03-24T10:00:08Z",
  },
  // Conversation 3
  {
    id: "demo-msg-007",
    conversationId: "demo-conv-003",
    role: "user",
    content: "My RAG pipeline is returning irrelevant code snippets. How can I debug this?",
    createdAt: "2026-03-23T16:30:00Z",
  },
  {
    id: "demo-msg-008",
    conversationId: "demo-conv-003",
    role: "assistant",
    content:
      "Start by inspecting the retrieved chunks before they reach the LLM. Log the similarity scores and check if your chunking strategy is splitting code blocks mid-function. A common fix is to use AST-aware chunking for code files.",
    model: "google/gemini-2.0-flash-001",
    createdAt: "2026-03-23T16:30:12Z",
  },
];

/**
 * Return the list of demo conversations.
 */
export function getDemoConversations(): DemoConversation[] {
  return DEMO_CONVERSATIONS;
}

/**
 * Return messages for a specific demo conversation.
 */
export function getDemoMessages(conversationId: string): DemoMessage[] {
  return DEMO_MESSAGES.filter((m) => m.conversationId === conversationId);
}
