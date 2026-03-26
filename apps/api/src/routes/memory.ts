import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery, idParamSchema, paginationSchema } from '../lib/request-validation.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const memoryQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  type: z.enum(['fact', 'preference', 'context', 'all']).default('all'),
});

const createMemorySchema = z.object({
  content: z.string().min(1).max(10_000),
  type: z.enum(['fact', 'preference', 'context']).default('fact'),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ---------- Demo data ----------

function demoMemories() {
  return [
    {
      id: 'mem-001',
      content: 'User prefers concise, technical explanations with code examples.',
      type: 'preference',
      source: 'conversation',
      userId: 'demo-user-001',
      createdAt: '2026-03-20T10:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z',
      metadata: { conversationId: 'conv-demo-001' },
    },
    {
      id: 'mem-002',
      content: 'The project uses Fastify for the API layer and Supabase for the database.',
      type: 'fact',
      source: 'file',
      userId: 'demo-user-001',
      createdAt: '2026-03-22T14:00:00Z',
      updatedAt: '2026-03-22T14:00:00Z',
      metadata: { fileId: 'file-001' },
    },
    {
      id: 'mem-003',
      content: 'Current sprint focuses on the RAG pipeline and model routing features.',
      type: 'context',
      source: 'notion',
      userId: 'demo-user-001',
      createdAt: '2026-03-24T09:00:00Z',
      updatedAt: '2026-03-24T09:00:00Z',
      metadata: { notionPageId: 'notion-page-015' },
    },
  ];
}

// ---------- Routes ----------

export default async function memoryRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /memory — list memory entries
  fastify.get('/memory', async (request, reply) => {
    const query = validateQuery(memoryQuerySchema, request.query);

    if (isDemoMode()) {
      let memories = demoMemories();

      if (query.type && query.type !== 'all') {
        memories = memories.filter((m) => m.type === query.type);
      }
      if (query.search) {
        const s = query.search.toLowerCase();
        memories = memories.filter((m) => m.content.toLowerCase().includes(s));
      }

      const start = (query.page - 1) * query.limit;
      const paged = memories.slice(start, start + query.limit);

      return reply.send({
        memories: paged,
        total: memories.length,
        page: query.page,
        limit: query.limit,
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // POST /memory — create a new memory entry
  fastify.post('/memory', async (request, reply) => {
    const body = validateBody(createMemorySchema, request.body);

    if (isDemoMode()) {
      const id = crypto.randomUUID();
      return reply.code(201).send({
        id,
        content: body.content,
        type: body.type,
        source: body.source || 'manual',
        userId: 'demo-user-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: body.metadata || {},
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // DELETE /memory/:id — delete a memory entry
  fastify.delete('/memory/:id', async (request, reply) => {
    const { id } = validateParams(idParamSchema, request.params);

    if (isDemoMode()) {
      return reply.code(204).send();
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });
}
