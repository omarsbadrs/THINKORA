# RAG Retrieval System

The retrieval system in Thinkora is responsible for finding relevant information from indexed documents to provide as context to the LLM. It combines semantic vector search with metadata filtering, deduplication, re-ranking, context reconstruction, citation building, and confidence scoring. The implementation lives in `packages/rag-core/src/retrieval/`.

## Semantic Search

**File:** `packages/rag-core/src/retrieval/semantic-search.ts`

Semantic search finds chunks that are conceptually similar to the user's query, regardless of exact keyword matches.

### How It Works

1. **Embed the query:** The user's query is converted to a 1536-dimensional vector using the same embedding model used during indexing (`embedText(query)`)
2. **Vector similarity search:** The query embedding is compared against all chunk embeddings in the `chunks` table using pgvector's cosine similarity
3. **Filter and map:** Results are filtered by optional constraints and mapped to `SearchResult` objects

### Configuration

| Option | Default | Description |
|---|---|---|
| `limit` | 10 | Maximum results to return |
| `threshold` | 0.7 | Minimum cosine similarity (0-1) |
| `fileIds` | none | Restrict search to specific files |
| `sourceTypes` | none | Restrict to specific source types (checked in chunk metadata) |

### SearchResult Shape

```typescript
interface SearchResult {
  chunkId: string;
  content: string;      // The chunk text
  score: number;         // Similarity score (0-1)
  fileId: string;
  fileName: string;
  metadata: Record<string, unknown>;
  position: number;      // Chunk position within the document
}
```

## Metadata Search

**File:** `packages/rag-core/src/retrieval/metadata-search.ts`

Metadata search finds chunks based on structured metadata fields rather than content similarity. This is useful for filtering by source type, file name, date range, or other structured attributes.

### Supported Filters

Metadata filters query the `metadata` JSONB column on the `chunks` table. Common filters:
- Source type (file, notion, supabase)
- File name or ID
- Date ranges (created, modified)
- Section titles
- Page numbers
- Custom metadata keys

## Hybrid Search

**File:** `packages/rag-core/src/retrieval/hybrid-search.ts`

Hybrid search combines semantic and metadata search results with configurable weighting, then deduplicates and re-ranks the combined results.

### Pipeline

```
hybridSearch(query, options)
        |
        v
  1. Run semantic search and metadata search in parallel
        |
        v
  2. Merge results with weighted scores:
     - Semantic results weighted by semanticWeight (default 0.7)
     - Metadata results weighted by metadataWeight (default 0.3)
     - If a chunk appears in both, scores are summed
        |
        v
  3. Deduplicate near-identical chunks (Jaccard similarity)
        |
        v
  4. Re-rank with keyword overlap and diversity signals
        |
        v
  Return top-K results
```

### Configuration

| Option | Default | Description |
|---|---|---|
| `semanticWeight` | 0.7 | Weight applied to semantic search scores |
| `metadataWeight` | 0.3 | Weight applied to metadata search scores |
| `topK` | same as `limit` | Final number of results after merging |
| `metadataFilters` | none | Structured metadata filters |
| All `SemanticSearchOptions` | (inherited) | limit, threshold, fileIds, sourceTypes |

## Re-Ranking

**File:** `packages/rag-core/src/retrieval/rerank.ts`

After merging, results are re-ranked using lightweight heuristics to improve diversity and relevance.

### Three Signals

1. **Keyword overlap** (boost up to +0.2)
   - Tokenizes both the query and chunk content into lowercase alphanumeric words
   - Computes the fraction of query tokens that appear in the chunk
   - Higher overlap = larger boost

2. **Source diversity** (penalty of 0.05 per repeated source)
   - Tracks how many results have been seen per `fileId`
   - Penalizes subsequent chunks from the same file
   - Encourages results from multiple documents

3. **Position diversity** (penalty of 0.03 per repeated position bucket)
   - Groups chunk positions into buckets of 5
   - Penalizes clusters of chunks from the same document region
   - Encourages spread across the document

### Adjusted Score

```
adjustedScore = originalScore + keywordBoost - sourcePenalty - positionPenalty
```

Results are sorted by adjusted score and truncated to `topK`.

## Deduplication

**File:** `packages/rag-core/src/retrieval/dedup.ts`

Deduplication removes near-duplicate chunks that would waste context window tokens without adding information.

### Algorithm: Jaccard Similarity

1. Each chunk's content is tokenized into a set of lowercase alphanumeric words (length > 1)
2. For each new chunk, its token set is compared against all already-accepted chunks
3. Jaccard similarity = |intersection| / |union|
4. If similarity >= threshold (default 0.85), the chunk is discarded
5. The first (highest-scored) occurrence is always kept

### Why Jaccard?

- Fast: O(n) set operations per comparison
- Token-level: Handles paraphrasing and minor wording changes
- Threshold tunable: 0.85 catches near-exact duplicates without over-filtering

## Context Reconstruction

**File:** `packages/rag-core/src/retrieval/reconstruct-context.ts`

Context reconstruction takes the selected chunks and builds a coherent context block for the LLM prompt. The `adjacency.ts` module handles chunk adjacency detection, allowing the system to merge adjacent chunks back into contiguous passages when they appear together in the results.

### Reconstruction Strategy

1. Group chunks by source file
2. Sort by position within each file
3. Detect adjacent chunks (consecutive positions) and merge them
4. Format each group with source attribution headers
5. Assemble into a single context string with clear boundaries

## Citation Building

**File:** `packages/rag-core/src/citations/build-citations.ts`

Citations link segments of the LLM's answer back to the source chunks that support them.

### Algorithm

```
buildCitations(answer, sources)
        |
        v
  1. Split the answer into sentence-level segments
     (split on sentence-ending punctuation or newlines, min 10 chars)
        |
        v
  2. For each source chunk:
     a. Tokenize the chunk content into a set of lowercase words
     b. For each answer segment:
        - Tokenize the segment
        - Compute token overlap: fraction of segment tokens in chunk
        - Track the segment with highest overlap
     c. If best overlap >= 0.15 (threshold), create a citation
        |
        v
  3. Deduplicate: keep only the highest-relevance citation per source file
        |
        v
  4. Sort by relevance score (descending)
        |
        v
  Return Citation[]
```

### Citation Shape

```typescript
interface Citation {
  sourceId: string;       // File ID
  sourceName: string;     // File name
  sourceType: string;     // "document", "notion", "supabase", etc.
  text: string;           // The answer segment this citation supports
  relevanceScore: number; // 0-1 overlap score
  pageNumber?: number;    // Page number if available
  sectionTitle?: string;  // Section title if available
}
```

### Inline Citation Markers

The `ResponseBuilder` (in `agent-core`) inserts inline citation markers (`[1]`, `[2]`, etc.) into the LLM output. It finds references to source names or section titles in the text and places markers after the relevant sentences.

## Confidence Scoring

**File:** `packages/rag-core/src/confidence/score.ts`

Confidence scoring produces a multi-dimensional assessment of how well the answer is supported by evidence.

### Three Dimensions

1. **Source Quality** (weight: 0.4)
   - Source count score: `min(1, sourceCount / 5)` -- more sources = higher, cap at 5
   - Average relevance: mean similarity score of all sources
   - Combined: `sourceCountScore * 0.4 + avgRelevance * 0.6`

2. **Citation Coverage** (weight: 0.35)
   - What fraction of the answer's sentences are cited?
   - Checks exact match first, then partial token overlap (>40%)
   - `citedSentences / totalSentences`

3. **Answer Relevance** (weight: 0.25)
   - Token overlap between the original query and the generated answer
   - `queryHits / queryTokens`

### Overall Score

```
overall = sourceQuality * 0.4 + citationCoverage * 0.35 + answerRelevance * 0.25
```

All scores are clamped to [0, 1] and rounded to 3 decimal places.

### Interpretation

| Score Range | Meaning |
|---|---|
| 0.8 - 1.0 | High confidence -- well-supported by multiple relevant sources |
| 0.5 - 0.8 | Moderate confidence -- some source support, may include inference |
| 0.2 - 0.5 | Low confidence -- limited source support, mostly inferential |
| 0.0 - 0.2 | Very low -- little to no source support |

The confidence score is included in every agent response and displayed in the chat UI to help users gauge answer reliability.
