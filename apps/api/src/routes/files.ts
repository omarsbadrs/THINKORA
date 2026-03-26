import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateParams, validateQuery, idParamSchema, paginationSchema } from '../lib/request-validation.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const filesQuerySchema = paginationSchema.extend({
  type: z.string().optional(),
  status: z.enum(['pending', 'processing', 'ready', 'error']).optional(),
  search: z.string().optional(),
});

// ---------- Demo data ----------

function demoFile(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    name: 'research-paper.pdf',
    mimeType: 'application/pdf',
    size: 1_245_678,
    status: 'ready' as const,
    chunks: 42,
    userId: 'demo-user-001',
    createdAt: '2026-03-24T09:00:00Z',
    updatedAt: '2026-03-24T09:05:00Z',
    metadata: {},
    ...overrides,
  };
}

// ---------- Routes ----------

export default async function filesRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /files/upload — multipart file upload
  fastify.post('/files/upload', async (request, reply) => {
    if (isDemoMode()) {
      // In demo mode, accept the upload but return mock data
      const id = crypto.randomUUID();
      return reply.code(201).send(
        demoFile(id, {
          name: 'uploaded-file.pdf',
          status: 'processing',
          chunks: 0,
        })
      );
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          error: 'No file provided',
          code: 'BAD_REQUEST',
          status: 400,
        });
      }

      // TODO: process the uploaded file through the ingestion pipeline
      const id = crypto.randomUUID();
      return reply.code(201).send({
        id,
        name: data.filename,
        mimeType: data.mimetype,
        size: 0,
        status: 'pending',
        chunks: 0,
        userId: request.user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      });
    } catch {
      return reply.code(500).send({
        error: 'File upload failed',
        code: 'UPLOAD_FAILED',
        status: 500,
      });
    }
  });

  // GET /files — list files
  fastify.get('/files', async (request, reply) => {
    const query = validateQuery(filesQuerySchema, request.query);

    if (isDemoMode()) {
      return reply.send({
        files: [
          demoFile('file-001'),
          demoFile('file-002', { name: 'meeting-notes.md', mimeType: 'text/markdown', size: 34_567, chunks: 8 }),
          demoFile('file-003', { name: 'api-spec.json', mimeType: 'application/json', size: 89_012, chunks: 15 }),
        ],
        total: 3,
        page: query.page,
        limit: query.limit,
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // GET /files/:id — get file details
  fastify.get('/files/:id', async (request, reply) => {
    const { id } = validateParams(idParamSchema, request.params);

    if (isDemoMode()) {
      return reply.send(demoFile(id));
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /files/:id/reprocess — trigger reprocessing of a file
  fastify.post('/files/:id/reprocess', async (request, reply) => {
    const { id } = validateParams(idParamSchema, request.params);

    if (isDemoMode()) {
      return reply.send({
        ...demoFile(id),
        status: 'processing',
        updatedAt: new Date().toISOString(),
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // DELETE /files/:id — delete a file
  fastify.delete('/files/:id', async (request, reply) => {
    const { id } = validateParams(idParamSchema, request.params);

    if (isDemoMode()) {
      return reply.code(204).send();
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });
}
