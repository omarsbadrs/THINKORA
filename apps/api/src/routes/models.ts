import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery, idParamStringSchema } from '../lib/request-validation.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const modelsQuerySchema = z.object({
  provider: z.string().optional(),
  capability: z.enum(['chat', 'code', 'analysis', 'creative', 'all']).optional(),
  maxCost: z.coerce.number().positive().optional(),
  minContext: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const analyzeSchema = z.object({
  prompt: z.string().min(1).max(50_000),
  requirements: z.object({
    maxCost: z.number().positive().optional(),
    minQuality: z.number().min(0).max(1).optional(),
    preferredProviders: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
  }).optional(),
});

const testRunSchema = z.object({
  modelId: z.string().min(1),
  prompt: z.string().min(1).max(10_000),
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).max(100_000).default(1000),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
});

// ---------- Demo data ----------

function demoModels() {
  return [
    {
      id: 'anthropic/claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      contextWindow: 200_000,
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
      capabilities: ['chat', 'code', 'analysis'],
      quality: 0.92,
      speed: 0.85,
      available: true,
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextWindow: 128_000,
      inputCostPer1k: 0.005,
      outputCostPer1k: 0.015,
      capabilities: ['chat', 'code', 'analysis', 'creative'],
      quality: 0.90,
      speed: 0.88,
      available: true,
    },
    {
      id: 'google/gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      contextWindow: 1_000_000,
      inputCostPer1k: 0.0001,
      outputCostPer1k: 0.0004,
      capabilities: ['chat', 'code', 'analysis'],
      quality: 0.82,
      speed: 0.95,
      available: true,
    },
    {
      id: 'meta/llama-3.3-70b',
      name: 'Llama 3.3 70B',
      provider: 'meta',
      contextWindow: 128_000,
      inputCostPer1k: 0.0008,
      outputCostPer1k: 0.0008,
      capabilities: ['chat', 'code'],
      quality: 0.78,
      speed: 0.90,
      available: true,
    },
  ];
}

// ---------- Routes ----------

export default async function modelsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /models — list available models with optional filters
  fastify.get('/models', async (request, reply) => {
    const query = validateQuery(modelsQuerySchema, request.query);

    if (isDemoMode()) {
      let models = demoModels();

      if (query.provider) {
        models = models.filter((m) => m.provider === query.provider);
      }
      if (query.capability && query.capability !== 'all') {
        models = models.filter((m) => m.capabilities.includes(query.capability!));
      }
      if (query.maxCost) {
        models = models.filter((m) => m.inputCostPer1k <= query.maxCost!);
      }
      if (query.minContext) {
        models = models.filter((m) => m.contextWindow >= query.minContext!);
      }
      if (query.search) {
        const s = query.search.toLowerCase();
        models = models.filter(
          (m) => m.name.toLowerCase().includes(s) || m.id.toLowerCase().includes(s)
        );
      }

      const start = (query.page - 1) * query.limit;
      const paged = models.slice(start, start + query.limit);

      return reply.send({ models: paged, total: models.length, page: query.page, limit: query.limit });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /models/:id — get a single model's details
  fastify.get('/models/:id', async (request, reply) => {
    const { id } = validateParams(idParamStringSchema, request.params);

    if (isDemoMode()) {
      const model = demoModels().find((m) => m.id === id);
      if (!model) {
        return reply.code(404).send({ error: 'Model not found', code: 'NOT_FOUND', status: 404 });
      }
      return reply.send(model);
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // POST /models/refresh — refresh model list from OpenRouter
  fastify.post('/models/refresh', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        refreshed: true,
        modelsCount: demoModels().length,
        timestamp: new Date().toISOString(),
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /models/recommendations — get model recommendations for current context
  fastify.get('/models/recommendations', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        recommendations: [
          {
            modelId: 'anthropic/claude-sonnet-4',
            reason: 'Best overall quality for complex reasoning tasks',
            score: 0.95,
            estimatedCost: 0.003,
          },
          {
            modelId: 'google/gemini-2.0-flash',
            reason: 'Most cost-effective for large-context workloads',
            score: 0.88,
            estimatedCost: 0.0002,
          },
        ],
        basedOn: { recentTasks: 12, avgComplexity: 'medium' },
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // POST /models/analyze — analyze a prompt and recommend models
  fastify.post('/models/analyze', async (request, reply) => {
    const body = validateBody(analyzeSchema, request.body);

    if (isDemoMode()) {
      return reply.send({
        analysis: {
          promptLength: body.prompt.length,
          estimatedTokens: Math.ceil(body.prompt.length / 4),
          complexity: 'medium',
          detectedCapabilities: ['chat', 'analysis'],
        },
        recommendations: [
          {
            modelId: 'anthropic/claude-sonnet-4',
            score: 0.94,
            estimatedCost: 0.0025,
            estimatedLatencyMs: 2000,
            reason: 'Strong analytical capabilities match detected prompt requirements',
          },
        ],
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // GET /models/stats — get model usage statistics
  fastify.get('/models/stats', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        stats: {
          totalRequests: 1_247,
          totalCost: 4.82,
          avgLatencyMs: 1_580,
          modelBreakdown: [
            { modelId: 'anthropic/claude-sonnet-4', requests: 623, cost: 2.45, avgLatencyMs: 1_800 },
            { modelId: 'google/gemini-2.0-flash', requests: 412, cost: 0.18, avgLatencyMs: 890 },
            { modelId: 'openai/gpt-4o', requests: 212, cost: 2.19, avgLatencyMs: 2_100 },
          ],
          period: { from: '2026-03-01T00:00:00Z', to: '2026-03-26T00:00:00Z' },
        },
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });

  // POST /models/test-run — run a test prompt against a specific model
  fastify.post('/models/test-run', async (request, reply) => {
    const body = validateBody(testRunSchema, request.body);

    if (isDemoMode()) {
      return reply.send({
        modelId: body.modelId,
        response: `Demo response from ${body.modelId}: This is a test response to your prompt.`,
        usage: { promptTokens: 42, completionTokens: 28, totalTokens: 70 },
        cost: 0.0003,
        latencyMs: 1_120,
        parameters: body.parameters || { temperature: 0.7, maxTokens: 1000 },
      });
    }

    return reply.code(501).send({ error: 'Not implemented', code: 'NOT_IMPLEMENTED', status: 501 });
  });
}
