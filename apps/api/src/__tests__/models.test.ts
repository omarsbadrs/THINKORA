import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// ---------------------------------------------------------------------------
// Mock demo mode
// ---------------------------------------------------------------------------

vi.mock('../config.js', () => ({
  config: {
    server: { port: 4000, host: '0.0.0.0', logLevel: 'silent', nodeEnv: 'test' },
    supabase: { url: 'http://localhost:54321', anonKey: '', serviceRoleKey: '' },
    openrouter: { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-sonnet-4' },
    notion: { clientId: '', clientSecret: '', redirectUri: '' },
    supabaseMcp: { url: '', token: '' },
    storage: { uploadDir: './uploads', maxFileSize: 52428800, allowedMimeTypes: ['application/pdf'] },
    security: { rateLimitMax: 100, rateLimitWindow: '1 minute', corsOrigins: ['http://localhost:3000'] },
    demo: { enabled: true, userId: 'demo-user-001', userName: 'Demo User', userEmail: 'demo@thinkora.dev' },
    worker: { concurrency: 5, pollInterval: 5000, retryAttempts: 3, retryDelay: 1000 },
  },
  isDemoMode: () => true,
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: modelsRoutes } = await import('../routes/models.js');
  await app.register(modelsRoutes, { prefix: '/models' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Models Routes', () => {
  describe('GET /models — list models', () => {
    it('should return a list of models', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.models).toBeDefined();
      expect(Array.isArray(body.models)).toBe(true);
      expect(body.models.length).toBeGreaterThan(0);
    });

    it('should include model details for each entry', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models',
      });

      const body = response.json();
      const model = body.models[0];
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.contextWindow).toBeGreaterThan(0);
      expect(model.capabilities).toBeDefined();
      expect(Array.isArray(model.capabilities)).toBe(true);
    });

    it('should include pagination info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models?page=1&limit=10',
      });

      const body = response.json();
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
      expect(body.total).toBeDefined();
    });
  });

  describe('GET /models — filter models', () => {
    it('should filter by provider', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models?provider=anthropic',
      });

      const body = response.json();
      for (const model of body.models) {
        expect(model.provider).toBe('anthropic');
      }
    });

    it('should filter by capability', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models?capability=code',
      });

      const body = response.json();
      for (const model of body.models) {
        expect(model.capabilities).toContain('code');
      }
    });

    it('should filter by max cost', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models?maxCost=0.001',
      });

      const body = response.json();
      for (const model of body.models) {
        expect(model.inputCostPer1k).toBeLessThanOrEqual(0.001);
      }
    });

    it('should filter by search term', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models?search=claude',
      });

      const body = response.json();
      expect(body.models.length).toBeGreaterThan(0);
      for (const model of body.models) {
        const match =
          model.name.toLowerCase().includes('claude') ||
          model.id.toLowerCase().includes('claude');
        expect(match).toBe(true);
      }
    });
  });

  describe('GET /models/:id — get model by slug', () => {
    it('should return a model by its ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models/anthropic/claude-sonnet-4',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('anthropic/claude-sonnet-4');
      expect(body.name).toBe('Claude Sonnet 4');
    });

    it('should return 404 for an unknown model', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/models/nonexistent/model-xyz',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toContain('not found');
    });
  });

  describe('POST /models/refresh — refresh model list', () => {
    it('should return a success response with model count', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/models/refresh',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.refreshed).toBe(true);
      expect(body.modelsCount).toBeGreaterThan(0);
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('POST /models/analyze — analyze prompt for model selection', () => {
    it('should analyze a prompt and return recommendations', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/models/analyze',
        payload: {
          prompt: 'Analyze this complex dataset and identify trends in user behavior over time',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.analysis).toBeDefined();
      expect(body.analysis.promptLength).toBeGreaterThan(0);
      expect(body.analysis.estimatedTokens).toBeGreaterThan(0);
      expect(body.analysis.complexity).toBeDefined();
      expect(body.recommendations).toBeDefined();
      expect(Array.isArray(body.recommendations)).toBe(true);
    });

    it('should include detected capabilities', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/models/analyze',
        payload: { prompt: 'Write a function to sort an array' },
      });

      const body = response.json();
      expect(body.analysis.detectedCapabilities).toBeDefined();
      expect(Array.isArray(body.analysis.detectedCapabilities)).toBe(true);
    });

    it('should include model score and estimated cost in recommendations', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/models/analyze',
        payload: { prompt: 'Explain distributed systems' },
      });

      const body = response.json();
      const rec = body.recommendations[0];
      expect(rec.modelId).toBeDefined();
      expect(rec.score).toBeGreaterThan(0);
      expect(rec.estimatedCost).toBeGreaterThan(0);
    });
  });
});
