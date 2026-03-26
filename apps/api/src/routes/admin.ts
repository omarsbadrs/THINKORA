import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateBody } from '../lib/request-validation.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const featureFlagsSchema = z.object({
  flags: z.record(z.boolean()),
});

// ---------- Routes ----------

export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /admin/system-health — detailed system health for admins
  fastify.get('/admin/system-health', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        status: 'healthy',
        uptime: process.uptime(),
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          unit: 'MB',
        },
        cpu: process.cpuUsage(),
        services: {
          database: { status: 'healthy', latencyMs: 12 },
          openrouter: { status: 'healthy', latencyMs: 85 },
          notion: { status: 'connected', latencyMs: 120 },
          supabaseMcp: { status: 'disconnected' },
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /admin/jobs — list all background jobs with details
  fastify.get('/admin/jobs', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        jobs: [
          {
            id: 'job-001',
            type: 'file-processing',
            status: 'running',
            progress: 65,
            startedAt: '2026-03-25T15:28:00Z',
            attempts: 1,
            maxAttempts: 3,
            data: { fileId: 'file-042', fileName: 'research-paper.pdf' },
          },
          {
            id: 'job-002',
            type: 'notion-sync',
            status: 'completed',
            progress: 100,
            startedAt: '2026-03-25T08:00:00Z',
            completedAt: '2026-03-25T08:05:00Z',
            attempts: 1,
            maxAttempts: 3,
            data: { pagesUpdated: 3, pagesCreated: 1 },
          },
          {
            id: 'job-003',
            type: 'embedding-generation',
            status: 'queued',
            progress: 0,
            createdAt: '2026-03-25T15:30:00Z',
            attempts: 0,
            maxAttempts: 3,
            data: { chunkCount: 42 },
          },
        ],
        summary: { running: 1, queued: 1, completed: 45, failed: 2, total: 49 },
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // POST /admin/feature-flags — update feature flags
  fastify.post('/admin/feature-flags', async (request, reply) => {
    const body = validateBody(featureFlagsSchema, request.body);

    if (isDemoMode()) {
      return reply.send({
        updated: true,
        flags: {
          enableStreaming: true,
          enableNotion: true,
          enableSupabaseMcp: false,
          enableEvals: false,
          enableCostOptimization: true,
          ...body.flags,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });
}
