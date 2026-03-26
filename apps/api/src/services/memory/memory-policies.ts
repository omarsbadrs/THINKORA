/**
 * Memory policies — Retention limits, eviction rules, and prioritisation.
 */

import type { MemoryEntry } from "./memory-types";

// ---------------------------------------------------------------------------
// Hard limits
// ---------------------------------------------------------------------------

/** Maximum number of session memory entries per conversation. */
export const MAX_SESSION_ENTRIES = 50;

/** Maximum number of long-term memory entries per user. */
export const MAX_LONG_TERM_ENTRIES = 500;

/** Number of hours before a session memory entry is eligible for eviction. */
export const SESSION_EXPIRY_HOURS = 24;

// ---------------------------------------------------------------------------
// Eviction
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the entry has outlived its retention window.
 *
 * - Entries with an explicit `expiresAt` are evicted once that timestamp has
 *   passed.
 * - Session entries without `expiresAt` fall back to `SESSION_EXPIRY_HOURS`.
 * - Long-term / preference entries without `expiresAt` are never auto-evicted.
 */
export function shouldEvict(entry: MemoryEntry): boolean {
  const now = Date.now();

  if (entry.expiresAt) {
    return new Date(entry.expiresAt).getTime() <= now;
  }

  if (entry.type === "session") {
    const createdMs = new Date(entry.createdAt).getTime();
    const expiryMs = createdMs + SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
    return expiryMs <= now;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Prioritisation
// ---------------------------------------------------------------------------

/**
 * Return the top `limit` entries ranked by a composite score of
 * recency and type importance.
 *
 * The ranking heuristic:
 *  1. Preference entries are always surfaced first (they are small & critical).
 *  2. Among other entries, newer entries rank higher.
 *  3. Entries with metadata.pinned === true get a boost.
 */
export function prioritizeMemories(
  entries: MemoryEntry[],
  limit: number,
): MemoryEntry[] {
  const TYPE_WEIGHT: Record<string, number> = {
    preference: 100,
    generated_summary: 50,
    indexed_knowledge: 30,
    long_term: 20,
    session: 10,
  };

  const scored = entries.map((entry) => {
    const typeScore = TYPE_WEIGHT[entry.type] ?? 0;
    const recencyScore =
      (new Date(entry.createdAt).getTime() - Date.UTC(2024, 0, 1)) / 1e9;
    const pinnedBonus =
      entry.metadata && (entry.metadata as Record<string, unknown>).pinned === true
        ? 200
        : 0;
    return { entry, score: typeScore + recencyScore + pinnedBonus };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.entry);
}
