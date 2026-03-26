import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateParams, validateQuery, idParamStringSchema } from '../lib/request-validation.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const timeRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  period: z.enum(['1h', '6h', '24h', '7d', '30d', '90d']).default('24h'),
});

const logsQuerySchema = timeRangeSchema.extend({
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ---------- Routes ----------

export default async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /dashboard/overview — high-level system overview
  fastify.get('/dashboard/overview', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        conversations: { total: 156, active: 23, today: 8 },
        files: { total: 42, processing: 2, ready: 38, error: 2 },
        models: { available: 4, activeToday: 3, avgLatencyMs: 1_580 },
        costs: { today: 0.42, week: 2.87, month: 4.82 },
        connectors: { notion: 'connected', supabaseMcp: 'disconnected' },
        memory: { entries: 89, lastUpdated: '2026-03-25T14:00:00Z' },
        uptime: '72h 14m',
        timestamp: new Date().toISOString(),
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/logs — recent application logs
  fastify.get('/dashboard/logs', async (request, reply) => {
    const query = validateQuery(logsQuerySchema, request.query);

    if (isDemoMode()) {
      return reply.send({
        logs: [
          { timestamp: '2026-03-25T15:30:00Z', level: 'info', message: 'Chat request processed', meta: { model: 'anthropic/claude-sonnet-4', latencyMs: 1_800 } },
          { timestamp: '2026-03-25T15:28:00Z', level: 'info', message: 'File uploaded and queued for processing', meta: { fileId: 'file-042' } },
          { timestamp: '2026-03-25T15:25:00Z', level: 'warn', message: 'OpenRouter rate limit approaching', meta: { remaining: 12 } },
          { timestamp: '2026-03-25T15:20:00Z', level: 'error', message: 'File processing failed', meta: { fileId: 'file-041', error: 'Unsupported format' } },
          { timestamp: '2026-03-25T15:15:00Z', level: 'info', message: 'Notion sync completed', meta: { pagesUpdated: 3 } },
        ],
        total: 5,
        page: query.page,
        limit: query.limit,
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/errors — recent errors
  fastify.get('/dashboard/errors', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        errors: [
          { timestamp: '2026-03-25T15:20:00Z', code: 'FILE_PROCESSING_FAILED', message: 'Unsupported format: .docx', count: 2, lastOccurrence: '2026-03-25T15:20:00Z' },
          { timestamp: '2026-03-25T12:00:00Z', code: 'MODEL_TIMEOUT', message: 'Request to openai/gpt-4o timed out after 30s', count: 1, lastOccurrence: '2026-03-25T12:00:00Z' },
        ],
        total: 2,
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/costs — cost breakdown
  fastify.get('/dashboard/costs', async (request, reply) => {
    const query = validateQuery(timeRangeSchema, request.query);

    if (isDemoMode()) {
      return reply.send({
        period: query.period,
        totalCost: 4.82,
        breakdown: [
          { model: 'anthropic/claude-sonnet-4', cost: 2.45, requests: 623, percentage: 50.8 },
          { model: 'openai/gpt-4o', cost: 2.19, requests: 212, percentage: 45.4 },
          { model: 'google/gemini-2.0-flash', cost: 0.18, requests: 412, percentage: 3.7 },
        ],
        trend: { direction: 'stable', changePercent: -2.1 },
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/models — model usage overview
  fastify.get('/dashboard/models', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        models: [
          { id: 'anthropic/claude-sonnet-4', requests: 623, avgLatencyMs: 1_800, errorRate: 0.005, successRate: 0.995 },
          { id: 'google/gemini-2.0-flash', requests: 412, avgLatencyMs: 890, errorRate: 0.002, successRate: 0.998 },
          { id: 'openai/gpt-4o', requests: 212, avgLatencyMs: 2_100, errorRate: 0.01, successRate: 0.99 },
        ],
        totalRequests: 1_247,
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/retrieval — RAG retrieval stats
  fastify.get('/dashboard/retrieval', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        totalSearches: 834,
        avgResultsPerQuery: 4.2,
        avgRelevanceScore: 0.84,
        sourcesBreakdown: {
          files: { searches: 420, avgScore: 0.86 },
          notion: { searches: 312, avgScore: 0.82 },
          memory: { searches: 102, avgScore: 0.79 },
        },
        avgSearchTimeMs: 145,
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/connectors — connector status dashboard
  fastify.get('/dashboard/connectors', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        connectors: [
          { id: 'notion', status: 'connected', lastSync: '2026-03-25T08:00:00Z', pagesIndexed: 47, errors: 0 },
          { id: 'supabase-mcp', status: 'disconnected', lastSync: null, pagesIndexed: 0, errors: 0 },
        ],
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/jobs — background job status
  fastify.get('/dashboard/jobs', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        jobs: [
          { id: 'job-001', type: 'file-processing', status: 'running', progress: 65, startedAt: '2026-03-25T15:28:00Z' },
          { id: 'job-002', type: 'notion-sync', status: 'completed', progress: 100, startedAt: '2026-03-25T08:00:00Z', completedAt: '2026-03-25T08:05:00Z' },
          { id: 'job-003', type: 'embedding-generation', status: 'queued', progress: 0, createdAt: '2026-03-25T15:30:00Z' },
        ],
        summary: { running: 1, queued: 1, completed: 45, failed: 2 },
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/usage-timeseries — time-series usage data
  fastify.get('/dashboard/usage-timeseries', async (request, reply) => {
    const query = validateQuery(timeRangeSchema, request.query);

    if (isDemoMode()) {
      const points = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3600_000);
        points.push({
          timestamp: t.toISOString(),
          requests: Math.floor(Math.random() * 50) + 10,
          cost: Math.round((Math.random() * 0.3 + 0.05) * 1000) / 1000,
          avgLatencyMs: Math.floor(Math.random() * 1500) + 500,
        });
      }

      return reply.send({ period: query.period, dataPoints: points, granularity: '1h' });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/model-compare — compare models side by side
  fastify.get('/dashboard/model-compare', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        comparison: [
          {
            modelId: 'anthropic/claude-sonnet-4',
            metrics: { quality: 0.92, speed: 0.85, costEfficiency: 0.70, reliability: 0.995 },
          },
          {
            modelId: 'openai/gpt-4o',
            metrics: { quality: 0.90, speed: 0.88, costEfficiency: 0.65, reliability: 0.99 },
          },
          {
            modelId: 'google/gemini-2.0-flash',
            metrics: { quality: 0.82, speed: 0.95, costEfficiency: 0.98, reliability: 0.998 },
          },
        ],
        period: '30d',
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /dashboard/model/:id/performance — detailed model performance
  fastify.get('/dashboard/model/:id/performance', async (request, reply) => {
    const { id } = validateParams(idParamStringSchema, request.params);

    if (isDemoMode()) {
      return reply.send({
        modelId: id,
        performance: {
          totalRequests: 623,
          successRate: 0.995,
          avgLatencyMs: 1_800,
          p50LatencyMs: 1_500,
          p95LatencyMs: 3_200,
          p99LatencyMs: 5_100,
          avgTokensPerRequest: { prompt: 850, completion: 420 },
          totalCost: 2.45,
          errorBreakdown: { timeout: 1, rateLimit: 2, serverError: 0 },
        },
        period: { from: '2026-03-01T00:00:00Z', to: '2026-03-26T00:00:00Z' },
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });
}
