// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Memory Manager Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const MemoryManagerDefinition: SkillDefinition = {
  id: "memory-manager",
  name: "Memory Manager",
  description:
    "Manages session and long-term memory. Extracts key facts from " +
    "conversations and retrieves relevant memories for the current context.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Current user query" },
      sessionMemory: {
        type: "object",
        description: "Current session memory state",
      },
      conversationHistory: {
        type: "array",
        description: "Recent conversation messages for fact extraction",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      relevantMemories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "unknown" },
            source: { type: "string" },
            timestamp: { type: "string" },
          },
        },
      },
      extractedFacts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" },
            confidence: { type: "number" },
          },
        },
      },
      memoryUpdates: {
        type: "object",
        description: "Key-value pairs to merge into session memory",
      },
    },
  },
  toolDependencies: [],
  failureModes: [
    "Fact extraction may miss implicit information",
    "Session memory may grow unbounded without eviction",
    "Relevance matching against memory is keyword-based only",
  ],
  observabilityMetadata: {
    category: "memory",
    costTier: "none",
    typicalLatencyMs: 5,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoryEntry {
  key: string;
  value: unknown;
  source: string;
  timestamp: string;
}

interface ExtractedFact {
  key: string;
  value: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const MemoryManagerHandler: SkillHandler = async (
  input: unknown,
  context: AgentContext,
): Promise<unknown> => {
  const {
    query,
    sessionMemory = context.sessionMemory ?? {},
    conversationHistory = [],
  } = input as {
    query: string;
    sessionMemory?: Record<string, unknown>;
    conversationHistory?: { role: string; content: string }[];
  };

  // --- 1. Retrieve relevant memories ---
  const relevantMemories = findRelevantMemories(query, sessionMemory);

  // --- 2. Extract facts from conversation history ---
  const extractedFacts = extractFacts(conversationHistory);

  // --- 3. Determine memory updates ---
  const memoryUpdates: Record<string, unknown> = {};

  // Store extracted facts
  for (const fact of extractedFacts) {
    if (fact.confidence >= 0.7) {
      memoryUpdates[fact.key] = fact.value;
    }
  }

  // Track query topics for future relevance
  const topics = extractTopics(query);
  const previousTopics = (sessionMemory.recentTopics as string[]) ?? [];
  memoryUpdates.recentTopics = [...new Set([...topics, ...previousTopics])].slice(0, 20);

  // Increment interaction count
  const interactionCount = ((sessionMemory.interactionCount as number) ?? 0) + 1;
  memoryUpdates.interactionCount = interactionCount;

  return {
    relevantMemories,
    extractedFacts,
    memoryUpdates,
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findRelevantMemories(
  query: string,
  sessionMemory: Record<string, unknown>,
): MemoryEntry[] {
  const results: MemoryEntry[] = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\W+/).filter((t) => t.length > 3);

  for (const [key, value] of Object.entries(sessionMemory)) {
    // Skip internal keys
    if (key.startsWith("_")) continue;

    // Check if the key or stringified value overlaps with query terms
    const keyLower = key.toLowerCase();
    const valueLower = String(value).toLowerCase();

    const isRelevant = queryTerms.some(
      (term) => keyLower.includes(term) || valueLower.includes(term),
    );

    if (isRelevant) {
      results.push({
        key,
        value,
        source: "session",
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

function extractFacts(
  history: { role: string; content: string }[],
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  for (const msg of history) {
    // Only extract facts from user messages
    if (msg.role !== "user") continue;

    const content = msg.content;

    // --- Pattern: "my name is X" ---
    const nameMatch = content.match(/my name is (\w+)/i);
    if (nameMatch) {
      facts.push({
        key: "userName",
        value: nameMatch[1],
        confidence: 0.9,
      });
    }

    // --- Pattern: "I work at X" / "I'm from X" ---
    const workMatch = content.match(/I (?:work|am working) (?:at|for) (.+?)(?:\.|,|$)/i);
    if (workMatch) {
      facts.push({
        key: "userOrganization",
        value: workMatch[1].trim(),
        confidence: 0.8,
      });
    }

    // --- Pattern: "I need X" / "I want X" (preference) ---
    const preferenceMatch = content.match(
      /I (?:need|want|prefer|like|am looking for) (.+?)(?:\.|,|$)/i,
    );
    if (preferenceMatch) {
      facts.push({
        key: "userPreference",
        value: preferenceMatch[1].trim(),
        confidence: 0.6,
      });
    }

    // --- Pattern: "the project is called X" ---
    const projectMatch = content.match(
      /(?:the )?project (?:is )?(?:called|named) (.+?)(?:\.|,|$)/i,
    );
    if (projectMatch) {
      facts.push({
        key: "projectName",
        value: projectMatch[1].trim(),
        confidence: 0.85,
      });
    }
  }

  return facts;
}

function extractTopics(query: string): string[] {
  // Extract meaningful terms as topics
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4)
    .filter(
      (word) =>
        ![
          "about", "would", "could", "should", "please", "there",
          "their", "which", "where", "these", "those", "being",
        ].includes(word),
    )
    .slice(0, 5);
}
