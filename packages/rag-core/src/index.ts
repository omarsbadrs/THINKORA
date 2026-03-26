/**
 * @thinkora/rag-core — RAG pipeline: chunking, embedding, indexing,
 * retrieval, citations, and confidence scoring.
 */

// ── Chunking ───────────────────────────────────────────────────────
export { chunkText } from "./chunking/chunk-text";
export type { Chunk, ChunkTextOptions } from "./chunking/chunk-text";

export { chunkTable, chunkSpreadsheet } from "./chunking/chunk-tables";
export type { TableData } from "./chunking/chunk-tables";

export { buildAdjacencyMap, getAdjacentChunks } from "./chunking/adjacency";

// ── Embeddings ─────────────────────────────────────────────────────
export { embedText } from "./embeddings/embed";
export type { EmbeddingConfig, EmbedTextOptions } from "./embeddings/embed";

export { batchEmbed } from "./embeddings/batch-embed";

// ── Indexing ───────────────────────────────────────────────────────
export { indexDocument } from "./indexing/index-document";
export type {
  IndexDocumentParams,
  IndexResult,
} from "./indexing/index-document";

export { indexFileVersion } from "./indexing/index-file-version";
export type { IndexFileVersionParams } from "./indexing/index-file-version";

// ── Retrieval ──────────────────────────────────────────────────────
export { semanticSearch } from "./retrieval/semantic-search";
export type {
  SearchResult,
  SemanticSearchOptions,
  SemanticSearchDeps,
} from "./retrieval/semantic-search";

export { metadataSearch } from "./retrieval/metadata-search";
export type {
  MetadataFilters,
  MetadataSearchDeps,
} from "./retrieval/metadata-search";

export { hybridSearch } from "./retrieval/hybrid-search";
export type {
  HybridSearchOptions,
  HybridSearchDeps,
} from "./retrieval/hybrid-search";

export { rerankResults } from "./retrieval/rerank";
export type { RerankOptions } from "./retrieval/rerank";

export { deduplicateResults } from "./retrieval/dedup";

export { reconstructContext } from "./retrieval/reconstruct-context";
export type {
  SourceSummary,
  ReconstructedContext,
} from "./retrieval/reconstruct-context";

// ── Citations ──────────────────────────────────────────────────────
export { buildCitations } from "./citations/build-citations";
export type { Citation } from "./citations/types";

// ── Confidence ─────────────────────────────────────────────────────
export { computeConfidence } from "./confidence/score";
export type {
  ConfidenceScore,
  ComputeConfidenceParams,
} from "./confidence/score";
