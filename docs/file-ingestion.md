# File Ingestion Pipeline

The file ingestion pipeline handles uploading, parsing, chunking, embedding, and indexing user files so they can be retrieved during chat conversations. The pipeline spans the web app, API service, and worker.

## Supported Formats

| Format | Extension(s) | MIME Type | Parser | Notes |
|---|---|---|---|---|
| PDF | `.pdf` | `application/pdf` | `pdf.ts` | Text extraction; may miss scanned-image PDFs without OCR |
| DOCX | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `docx.ts` | Extracts text, headings, tables |
| Plain Text | `.txt` | `text/plain` | `txt.ts` | Direct text, no parsing needed |
| Markdown | `.md` | `text/markdown` | `md.ts` | Preserves heading structure |
| CSV | `.csv` | `text/csv` | `csv.ts` | Tabular data with headers |
| Excel | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `xlsx.ts` | Multi-sheet support |
| JSON | `.json` | `application/json` | `json.ts` | Flattened and structured |
| HTML | `.html` | `text/html` | `html.ts` | Strips tags, extracts text |
| XML | `.xml` | `text/xml` | `xml.ts` | Tag-aware text extraction |
| Code files | various | various | `code.ts` | Language-aware parsing |
| Images | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | `image/*` | `image.ts` | OCR when `OCR_ENABLED=true` |
| Archives | `.zip`, etc. | various | `archive.ts` | Extracts and processes contained files |

### Limitations

- **Maximum file size:** 50 MB (configurable via `MAX_UPLOAD_MB`)
- **Maximum files per upload:** 10 (configured in Fastify multipart plugin)
- **Scanned PDFs:** Require `OCR_ENABLED=true` for text extraction from images
- **Password-protected files:** Not supported
- **Very large spreadsheets:** May be slow to parse; consider splitting
- **Binary formats** (e.g., `.doc`, `.xls`, `.ppt`): Not supported; use modern equivalents

## Upload Flow

```
User selects file(s) in the Files page or chat attachment
        |
        v
  Client-side validation:
    - File size <= MAX_UPLOAD_MB
    - File extension is in the allowed list
    - MIME type is in the allowed list
        |
        v
  POST /files/upload (multipart/form-data)
        |
        v
  API server-side validation (packages/security/upload-validation.ts):
    1. Size check (<=50MB, >0 bytes)
    2. MIME type check against allowlist
    3. Extension check against allowlist
    4. Double extension detection (e.g., "report.pdf.exe")
    5. Null byte detection in filename
    6. Path traversal character detection (/ or \)
        |
        v
  If validation fails -> 400 Bad Request with error details
        |
        v
  Upload file blob to Supabase Storage (bucket: "uploads")
    Storage key: "{userId}/{fileId}/{filename}"
        |
        v
  Insert file record into `files` table:
    - user_id, name, mime_type, size_bytes
    - storage_key (path in Supabase Storage)
    - status: "uploaded"
    - version: 1
        |
        v
  Enqueue "file-ingest" job to worker queue
    Payload: { fileId, jobId, userId, fileName, mimeType, storageKey }
        |
        v
  Return file metadata to client (id, name, status, created_at)
```

## Parsing Stage

The worker's `file-ingest` job processor handles parsing.

### File Type Detection

`detectFileType(fileName, mimeType)` in `packages/parsers/src/detect-file-type.ts`:
- Checks file extension first
- Falls back to MIME type if extension is ambiguous
- Returns a normalized type string (e.g., "pdf", "docx", "csv")
- Returns "unknown" for unsupported formats

### Parser Selection

`getParser(fileType)` returns the appropriate parser instance. Each parser implements a common interface:

```typescript
interface BaseParser {
  parse(buffer: Buffer, fileName: string): Promise<ParseResult>;
}

interface ParseResult {
  text: string;              // Full extracted text
  sections: Section[];       // Heading-based sections
  tables: Table[];           // Extracted tables (CSV, XLSX, DOCX tables)
  metadata: Record<string, unknown>;  // Format-specific metadata
  warnings: string[];        // Non-fatal issues during parsing
}
```

### Normalization

After parsing, `normalizeParseResult(parseResult)` produces a standardized output:

```typescript
interface NormalizedResult {
  text: string;          // Combined text from all sections
  sections: Section[];   // Sections with title, content, level
  tables: Table[];       // Structured table data
  wordCount: number;     // Estimated word count
  sectionCount: number;
  tableCount: number;
  pageCount: number | null;
  confidence: number;    // Parse quality score (0-1)
  warnings: string[];
}
```

## Chunking Strategy

Text chunking is handled by `packages/rag-core/src/chunking/chunk-text.ts`.

### Default Configuration

| Parameter | Default | Description |
|---|---|---|
| `maxTokens` | 512 | Maximum tokens per chunk |
| `overlap` | 50 | Overlap tokens between consecutive chunks |
| `splitBy` | `"paragraph"` | Primary split strategy |

### Chunking Algorithm

```
Input: raw text from parsed document
        |
        v
  1. Split by paragraph (double newline boundaries)
        |
        v
  2. For each paragraph:
     If paragraph > maxTokens:
       Split by sentence (period/exclamation/question + space)
     Else:
       Keep as-is
        |
        v
  3. Merge segments into chunks:
     - Accumulate segments in a buffer
     - When buffer exceeds maxTokens, flush as a chunk
     - Carry overlap from the end of previous chunk to start of next
     - If a single segment exceeds maxTokens, split by fixed token windows
        |
        v
  Output: Chunk[]
    Each chunk has: content, position (0-based), tokenCount, metadata
```

### Token Estimation

Tokens are estimated at ~4 characters per token (`text.length / 4`). This is a fast heuristic that avoids calling a tokenizer on every chunk.

### Table Chunking

Tables from spreadsheets and documents are chunked separately by `chunk-tables.ts`. Each table is serialized as a text block with column headers and row data, then chunked using the same algorithm.

## Embedding Process

After chunking, each chunk is embedded into a 1536-dimensional vector using the configured embedding model.

### Embedding Model

Default: `openai/text-embedding-3-small` (via OpenRouter)

Configured via: `OPENROUTER_DEFAULT_EMBEDDING_MODEL`

### Embedding Flow

```
For each chunk:
    |
    v
  embedText(chunk.content) in packages/rag-core/src/embeddings/embed.ts
    |
    v
  Calls OpenRouter API:
    POST /embeddings
    { model: "openai/text-embedding-3-small", input: chunk.content }
    |
    v
  Returns float[1536] embedding vector
```

### Batch Embedding

`batch-embed.ts` processes multiple chunks in parallel batches to improve throughput while respecting API rate limits.

## Indexing

`indexDocument()` in `packages/rag-core/src/indexing/index-document.ts` orchestrates the full chunking -> embedding -> storage pipeline.

### What Gets Stored

For each chunk, a row is inserted into the `chunks` table:

| Column | Value |
|---|---|
| `id` | Generated UUID |
| `file_id` | Reference to the source file |
| `content` | The chunk text |
| `embedding` | `vector(1536)` -- the embedding vector |
| `metadata` | JSON: fileName, sourceType, pageNumber, sectionTitle, etc. |
| `position` | 0-based ordinal within the document |
| `token_count` | Estimated token count |

### Parsed Artifacts

Separately from chunks, the full parsed text and individual sections are stored in `parsed_artifacts` for later inspection:

| Artifact Type | Content |
|---|---|
| `full_text` | Complete extracted text with metadata (word count, section count, confidence) |
| `section` | Individual section content with title and level |

## Reprocessing

Files can be reprocessed via the `reprocess-file` worker job. This is useful when:
- The parsing logic has been improved
- The embedding model has changed
- The chunking strategy has been updated

### Reprocessing Flow

```
"reprocess-file" job triggered (manual or automatic)
        |
        v
  1. Delete existing chunks for the file
  2. Delete existing parsed_artifacts for the file
  3. Reset file status to "uploaded"
  4. Delegate to the file-ingest pipeline
  5. File is re-parsed, re-chunked, re-embedded, re-indexed
```

## Error Handling

### Job-Level Error Handling

The worker job tracks progress through stages:

| Stage | Progress | Description |
|---|---|---|
| `downloading` | 0% | Downloading from Supabase Storage |
| `detecting` | 10% | File type detection |
| `parsing` | 20% | Running the file parser |
| `normalizing` | 40% | Normalizing parse results |
| `storing_artifacts` | 50% | Persisting parsed artifacts |
| `indexing` | 65% | Chunking, embedding, and storing vectors |
| `completed` | 100% | Done |

If any stage fails:
1. The job status is updated to `"failed"` with the error message and stage
2. The file status is updated to `"failed"`
3. The error is logged

### Retry Policy

Failed jobs are retried according to the worker's retry policy:
- **Max retries:** 3 (configurable via `WORKER_RETRY_ATTEMPTS`)
- **Backoff:** Exponential (configurable via `WORKER_RETRY_DELAY`)
- **Retry conditions:** Network errors, transient API failures, rate limits

### Non-Retriable Failures

Some failures are not retried:
- Unsupported file format (`UNSUPPORTED_FORMAT`)
- File not found in storage
- Validation failures (size, MIME type)

### Monitoring

Track ingestion status via:
- **Files page:** Shows file status (uploaded, processing, processed, failed)
- **Dashboard:** Ingestion monitoring panel with job counts, success rate, and error breakdown
- **Admin page:** `IngestionJobsPanel` with detailed job history and `FileParseInspector` for examining parse results
