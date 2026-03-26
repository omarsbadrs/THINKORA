/**
 * MemoryService — Manages session and long-term memory for users.
 *
 * Responsibilities:
 *  - Store and retrieve per-conversation session context
 *  - Maintain long-term user memories (preferences, facts)
 *  - Relevance-based search across all memory entries
 *  - Export / clear / disable memory per user
 *  - In demo mode, return static sample memories
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "../../config";
import type {
  MemoryEntry,
  MemorySearchResult,
  AddMemoryParams,
} from "./memory-types";
import {
  MAX_SESSION_ENTRIES,
  MAX_LONG_TERM_ENTRIES,
  shouldEvict,
  prioritizeMemories,
} from "./memory-policies";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_MEMORIES: MemoryEntry[] = [
  {
    id: "demo-mem-001",
    userId: "demo-user-001",
    type: "preference",
    content: "Prefers concise answers with code examples",
    metadata: { source: "explicit" },
    createdAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "demo-mem-002",
    userId: "demo-user-001",
    type: "preference",
    content: "Favorite language: TypeScript",
    metadata: { source: "inferred" },
    createdAt: "2026-03-18T14:30:00Z",
  },
  {
    id: "demo-mem-003",
    userId: "demo-user-001",
    type: "long_term",
    content: "Working on a project called Thinkora — an AI command center with RAG and MCP integrations",
    metadata: { source: "conversation" },
    createdAt: "2026-03-15T09:00:00Z",
  },
  {
    id: "demo-mem-004",
    userId: "demo-user-001",
    type: "session",
    content: "Last asked about model routing strategies",
    metadata: { conversationId: "demo-conv-001" },
    expiresAt: "2026-12-31T23:59:59Z",
    createdAt: "2026-03-25T18:00:00Z",
  },
  {
    id: "demo-mem-005",
    userId: "demo-user-001",
    type: "long_term",
    content: "Uses Supabase as primary database and vector store",
    metadata: { source: "conversation" },
    createdAt: "2026-03-12T11:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Table name
// ---------------------------------------------------------------------------

const TABLE = "memories";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class MemoryService {
  constructor(private readonly db: SupabaseClient) {}

  // -----------------------------------------------------------------------
  // Reads
  // -----------------------------------------------------------------------

  /**
   * Return the most recent session-scoped memory entries for a conversation.
   */
  async getSessionMemory(conversationId: string): Promise<MemoryEntry[]> {
    if (isDemoMode()) {
      return DEMO_MEMORIES.filter(
        (m) =>
          m.type === "session" &&
          (m.metadata as Record<string, unknown>)?.conversationId === conversationId,
      );
    }

    const { data, error } = await this.db
      .from(TABLE)
      .select("*")
      .eq("type", "session")
      .eq("metadata->>conversationId", conversationId)
      .order("created_at", { ascending: false })
      .limit(MAX_SESSION_ENTRIES);

    if (error) throw new Error(`getSessionMemory failed: ${error.message}`);
    return (data ?? []).map(rowToEntry).filter((e) => !shouldEvict(e));
  }

  /**
   * Return long-term memories (preferences, facts) for a user.
   */
  async getLongTermMemory(userId: string): Promise<MemoryEntry[]> {
    if (isDemoMode()) {
      return DEMO_MEMORIES.filter(
        (m) => m.userId === userId && (m.type === "long_term" || m.type === "preference"),
      );
    }

    const { data, error } = await this.db
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .in("type", ["long_term", "preference"])
      .order("created_at", { ascending: false })
      .limit(MAX_LONG_TERM_ENTRIES);

    if (error) throw new Error(`getLongTermMemory failed: ${error.message}`);
    return (data ?? []).map(rowToEntry);
  }

  /**
   * Search across all of a user's memories using simple keyword relevance.
   */
  async searchMemory(
    userId: string,
    query: string,
  ): Promise<MemorySearchResult[]> {
    if (isDemoMode()) {
      return scoreDemoResults(userId, query);
    }

    // Full-text or vector search would be preferred in production;
    // this falls back to ilike for simplicity.
    const { data, error } = await this.db
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(`searchMemory failed: ${error.message}`);

    return (data ?? []).map((row) => {
      const entry = rowToEntry(row);
      const relevance = computeRelevance(entry.content, query);
      return { entry, relevance };
    });
  }

  // -----------------------------------------------------------------------
  // Writes
  // -----------------------------------------------------------------------

  /**
   * Add a new memory entry.
   */
  async addMemory(params: AddMemoryParams): Promise<MemoryEntry> {
    if (isDemoMode()) {
      const entry: MemoryEntry = {
        id: `demo-mem-${Date.now()}`,
        userId: params.userId,
        type: params.type,
        content: params.content,
        metadata: {
          ...params.metadata,
          ...(params.conversationId
            ? { conversationId: params.conversationId }
            : {}),
        },
        expiresAt: params.expiresAt,
        createdAt: new Date().toISOString(),
      };
      return entry;
    }

    const { data, error } = await this.db
      .from(TABLE)
      .insert({
        user_id: params.userId,
        type: params.type,
        content: params.content,
        metadata: {
          ...params.metadata,
          ...(params.conversationId
            ? { conversationId: params.conversationId }
            : {}),
        },
        expires_at: params.expiresAt ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`addMemory failed: ${error.message}`);
    return rowToEntry(data);
  }

  /**
   * Delete a specific memory entry belonging to a user.
   */
  async deleteMemory(userId: string, memoryId: string): Promise<void> {
    if (isDemoMode()) return;

    const { error } = await this.db
      .from(TABLE)
      .delete()
      .eq("id", memoryId)
      .eq("user_id", userId);

    if (error) throw new Error(`deleteMemory failed: ${error.message}`);
  }

  /**
   * Export all memories for a user as a JSON-serialisable array.
   */
  async exportMemory(userId: string): Promise<MemoryEntry[]> {
    if (isDemoMode()) {
      return DEMO_MEMORIES.filter((m) => m.userId === userId);
    }

    const { data, error } = await this.db
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`exportMemory failed: ${error.message}`);
    return (data ?? []).map(rowToEntry);
  }

  /**
   * Remove all session-scoped memory for a conversation.
   */
  async clearSessionMemory(conversationId: string): Promise<void> {
    if (isDemoMode()) return;

    const { error } = await this.db
      .from(TABLE)
      .delete()
      .eq("type", "session")
      .eq("metadata->>conversationId", conversationId);

    if (error) throw new Error(`clearSessionMemory failed: ${error.message}`);
  }

  /**
   * Disable all memory features for a user by setting a feature flag row.
   */
  async disableMemory(userId: string): Promise<void> {
    if (isDemoMode()) return;

    const { error } = await this.db
      .from("user_settings")
      .upsert(
        { user_id: userId, memory_enabled: false },
        { onConflict: "user_id" },
      );

    if (error) throw new Error(`disableMemory failed: ${error.message}`);
  }

  /**
   * Convenience: return the top-N most relevant memories for a context window.
   */
  async getContextWindow(
    userId: string,
    conversationId: string,
    limit = 10,
  ): Promise<MemoryEntry[]> {
    const [session, longTerm] = await Promise.all([
      this.getSessionMemory(conversationId),
      this.getLongTermMemory(userId),
    ]);

    return prioritizeMemories([...session, ...longTerm], limit);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Supabase row (snake_case) to a MemoryEntry (camelCase). */
function rowToEntry(row: Record<string, unknown>): MemoryEntry {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? "",
    type: row.type as MemoryEntry["type"],
    content: (row.content as string) ?? "",
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    expiresAt: (row.expires_at as string) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

/** Compute a simple 0-1 relevance score based on keyword overlap. */
function computeRelevance(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const matched = words.filter((w) => contentLower.includes(w)).length;
  return matched / words.length;
}

/** Score demo memories against a query. */
function scoreDemoResults(
  userId: string,
  query: string,
): MemorySearchResult[] {
  return DEMO_MEMORIES.filter((m) => m.userId === userId)
    .map((entry) => ({
      entry,
      relevance: computeRelevance(entry.content, query),
    }))
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
}
