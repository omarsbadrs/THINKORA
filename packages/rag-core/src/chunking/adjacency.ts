/**
 * Chunk adjacency utilities — enables context expansion by mapping
 * each chunk to its neighbours.
 */

import type { Chunk } from "./chunk-text";

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Build a map from each chunk position to an ordered array of its
 * immediate neighbour positions (previous and next).
 *
 * For a chunk at position `p` the neighbours are `[p-1, p+1]`
 * (filtered to positions that actually exist in the chunk list).
 */
export function buildAdjacencyMap(
  chunks: Chunk[]
): Map<number, number[]> {
  const positionSet = new Set(chunks.map((c) => c.position));
  const adjacency = new Map<number, number[]>();

  for (const chunk of chunks) {
    const neighbours: number[] = [];
    const prev = chunk.position - 1;
    const next = chunk.position + 1;

    if (positionSet.has(prev)) neighbours.push(prev);
    if (positionSet.has(next)) neighbours.push(next);

    adjacency.set(chunk.position, neighbours);
  }

  return adjacency;
}

/**
 * Return chunks that are within `windowSize` positions of the given
 * `position`, sorted by position.
 *
 * The target chunk at `position` is included in the result.
 *
 * @param chunks     The full chunk list.
 * @param position   The anchor position to expand around.
 * @param windowSize Number of chunks to include on each side (default 1).
 */
export function getAdjacentChunks(
  chunks: Chunk[],
  position: number,
  windowSize = 1
): Chunk[] {
  const lower = position - windowSize;
  const upper = position + windowSize;

  return chunks
    .filter((c) => c.position >= lower && c.position <= upper)
    .sort((a, b) => a.position - b.position);
}
