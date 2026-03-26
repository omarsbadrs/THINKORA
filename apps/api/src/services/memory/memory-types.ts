/**
 * Memory types — Shared type definitions for the memory subsystem.
 */

// ---------------------------------------------------------------------------
// Memory type discriminator
// ---------------------------------------------------------------------------

export type MemoryType =
  | "session"
  | "long_term"
  | "preference"
  | "indexed_knowledge"
  | "generated_summary";

// ---------------------------------------------------------------------------
// Core entity
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  /** Unique identifier (UUID). */
  id: string;
  /** Owner of this memory. */
  userId: string;
  /** Discriminator that controls retention and lookup behaviour. */
  type: MemoryType;
  /** The actual memory payload — plain text or structured JSON string. */
  content: string;
  /** Arbitrary key/value metadata attached to the entry. */
  metadata?: Record<string, unknown>;
  /** ISO-8601 timestamp after which the entry may be evicted. */
  expiresAt?: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Search result wrapper
// ---------------------------------------------------------------------------

export interface MemorySearchResult {
  entry: MemoryEntry;
  /** 0-1 relevance score (1 = perfect match). */
  relevance: number;
}

// ---------------------------------------------------------------------------
// Params used to create a new memory
// ---------------------------------------------------------------------------

export interface AddMemoryParams {
  userId: string;
  type: "session" | "long_term" | "preference";
  content: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  /** Required when type === 'session'. */
  conversationId?: string;
}
