// ---------------------------------------------------------------------------
// File management types
// ---------------------------------------------------------------------------

/** Processing status of an uploaded file. */
export type FileStatus = "uploaded" | "processing" | "processed" | "failed";

/** A file record stored in the database. */
export interface FileRecord {
  id: string;
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  status: FileStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

/** A historical version of a file. */
export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  storageKey: string;
  createdAt: string;
}

/** Stage within the file processing pipeline. */
export type FileProcessingStage =
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexing";

/** Status of a processing job. */
export type FileProcessingJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

/** Tracks progress through the file processing pipeline. */
export interface FileProcessingJob {
  id: string;
  fileId: string;
  status: FileProcessingJobStatus;
  stage: FileProcessingStage;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  retryCount: number;
}

/** A parsed artefact extracted from a file (heading, table, image caption, etc.). */
export interface ParsedArtifact {
  id: string;
  fileId: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  pageNumber: number | null;
  sectionTitle: string | null;
}

/** A text chunk ready for embedding / retrieval. */
export interface Chunk {
  id: string;
  fileId: string;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  position: number;
  tokenCount: number;
}
