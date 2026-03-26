import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateBody } from '../lib/request-validation.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const searchQuerySchema = z.object({
  query: z.string().min(1).max(10_000),
  sources: z.array(z.enum(['files', 'notion', 'memory', 'all'])).default(['all']),
  limit: z.number().int().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  includeMetadata: z.boolean().default(true),
  filters: z.record(z.unknown()).optional(),
});

const searchDebugSchema = z.object({
  query: z.string().min(1).max(10_000),
  sources: z.array(z.enum(['files', 'notion', 'memory', 'all'])).default(['all']),
  limit: z.number().int().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.5),
  showEmbeddings: z.boolean().default(false),
  showScoring: z.boolean().default(true),
});

// ---------- Demo data ----------

function demoSearchResults(query: string) {
  return {
    results: [
      {
        id: 'chunk-001',
        content: `Relevant passage about "${query}" from research paper on AI architectures...`,
        source: 'files',
        sourceId: 'file-001',
        sourceName: 'research-paper.pdf',
        score: 0.92,
        metadata: { page: 3, section: 'Introduction' },
      },
      {
        id: 'chunk-002',
        content: `Notes discussing "${query}" and its implications for knowledge management systems...`,
        source: 'notion',
        sourceId: 'notion-page-042',
        sourceName: 'Project Architecture Notes',
        score: 0.87,
        metadata: { lastEdited: '2026-03-20T14:00:00Z' },
      },
      {
        id: 'chunk-003',
        content: `Previously stored memory about "${query}" from earlier conversations...`,
        source: 'memory',
        sourceId: 'mem-012',
        sourceName: 'Conversation Memory',
        score: 0.78,
        metadata: { conversationId: 'conv-demo-001' },
      },
    ],
    query,
    totalResults: 3,
    searchTimeMs: 145,
    sourcesSearched: ['files', 'notion', 'memory'],
  };
}

// ---------- Routes ----------

export default async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /search/query — perform a semantic search
  fastify.post('/search/query', async (request, reply) => {
    const body = validateBody(searchQuerySchema, request.body);

    if (isDemoMode()) {
      const results = demoSearchResults(body.query);
      results.results = results.results.slice(0, body.limit);
      return reply.send(results);
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /search/debug — perform a search with debug/scoring details
  fastify.post('/search/debug', async (request, reply) => {
    const body = validateBody(searchDebugSchema, request.body);

    if (isDemoMode()) {
      return reply.send({
        ...demoSearchResults(body.query),
        debug: {
          embeddingModel: 'text-embedding-3-small',
          embeddingDimensions: 1536,
          indexType: 'ivfflat',
          queryVector: body.showEmbeddings ? [0.012, -0.034, 0.056] : undefined,
          scoring: body.showScoring
            ? {
                method: 'cosine_similarity',
                reranking: true,
                rerankModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
              }
            : undefined,
          timings: {
            embeddingMs: 45,
            searchMs: 78,
            rerankMs: 22,
            totalMs: 145,
          },
        },
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });
}
