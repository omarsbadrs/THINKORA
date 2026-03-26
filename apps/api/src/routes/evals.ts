import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateBody, validateQuery } from '../lib/request-validation.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const runEvalSchema = z.object({
  name: z.string().min(1).max(200),
  models: z.array(z.string().min(1)).min(1).max(10),
  dataset: z.array(
    z.object({
      input: z.string().min(1),
      expectedOutput: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
  ).min(1).max(100),
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).max(100_000).default(2000),
  }).optional(),
  metrics: z.array(z.enum(['accuracy', 'relevance', 'coherence', 'latency', 'cost'])).default(['accuracy', 'relevance', 'latency', 'cost']),
});

const evalResultsQuerySchema = z.object({
  evalId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---------- Routes ----------

export default async function evalsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /evals/run — start an evaluation run
  fastify.post('/evals/run', async (request, reply) => {
    const body = validateBody(runEvalSchema, request.body);

    if (isDemoMode()) {
      const evalId = crypto.randomUUID();
      return reply.code(202).send({
        evalId,
        name: body.name,
        status: 'running',
        models: body.models,
        datasetSize: body.dataset.length,
        metrics: body.metrics,
        startedAt: new Date().toISOString(),
        estimatedCompletionMs: body.dataset.length * body.models.length * 2000,
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /evals/results — get evaluation results
  fastify.get('/evals/results', async (request, reply) => {
    const query = validateQuery(evalResultsQuerySchema, request.query);

    if (isDemoMode()) {
      return reply.send({
        results: [
          {
            evalId: 'eval-demo-001',
            name: 'RAG Quality Benchmark',
            status: 'completed',
            startedAt: '2026-03-24T10:00:00Z',
            completedAt: '2026-03-24T10:15:00Z',
            models: ['anthropic/claude-sonnet-4', 'openai/gpt-4o'],
            datasetSize: 20,
            scores: {
              'anthropic/claude-sonnet-4': {
                accuracy: 0.91,
                relevance: 0.93,
                coherence: 0.95,
                avgLatencyMs: 1_850,
                totalCost: 0.085,
              },
              'openai/gpt-4o': {
                accuracy: 0.88,
                relevance: 0.90,
                coherence: 0.92,
                avgLatencyMs: 2_200,
                totalCost: 0.110,
              },
            },
            winner: 'anthropic/claude-sonnet-4',
          },
          {
            evalId: 'eval-demo-002',
            name: 'Code Generation Test',
            status: 'completed',
            startedAt: '2026-03-23T14:00:00Z',
            completedAt: '2026-03-23T14:30:00Z',
            models: ['anthropic/claude-sonnet-4', 'google/gemini-2.0-flash'],
            datasetSize: 15,
            scores: {
              'anthropic/claude-sonnet-4': {
                accuracy: 0.87,
                relevance: 0.89,
                coherence: 0.91,
                avgLatencyMs: 2_100,
                totalCost: 0.072,
              },
              'google/gemini-2.0-flash': {
                accuracy: 0.80,
                relevance: 0.83,
                coherence: 0.85,
                avgLatencyMs: 950,
                totalCost: 0.008,
              },
            },
            winner: 'anthropic/claude-sonnet-4',
          },
        ],
        total: 2,
        page: query.page,
        limit: query.limit,
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });
}
