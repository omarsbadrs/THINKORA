import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import healthRoutes from '../routes/health.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(healthRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
    });

    it('should include a timestamp in ISO format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = response.json();
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).getTime()).not.toBeNaN();
    });

    it('should include the app version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = response.json();
      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe('string');
    });
  });

  describe('GET /ready', () => {
    it('should return a readiness response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      // May be 200 or 503 depending on DB/OpenRouter availability
      expect([200, 503]).toContain(response.statusCode);

      const body = response.json();
      expect(body.status).toMatch(/^(ready|not_ready)$/);
      expect(body.timestamp).toBeDefined();
      expect(body.checks).toBeDefined();
    });

    it('should include database check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      const body = response.json();
      expect(body.checks.database).toBeDefined();
      expect(body.checks.database.status).toBeDefined();
    });

    it('should include openrouter check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      const body = response.json();
      expect(body.checks.openrouter).toBeDefined();
      expect(body.checks.openrouter.status).toBeDefined();
    });

    it('should include latency measurements', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      const body = response.json();
      for (const check of Object.values(body.checks) as Array<{ latencyMs?: number }>) {
        expect(check.latencyMs).toBeDefined();
        expect(typeof check.latencyMs).toBe('number');
      }
    });
  });

  describe('GET /version', () => {
    it('should return 200 with version info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.version).toBeDefined();
    });

    it('should include Node.js version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version',
      });

      const body = response.json();
      expect(body.nodeVersion).toBeDefined();
      expect(body.nodeVersion).toMatch(/^v\d+/);
    });

    it('should include the environment name', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version',
      });

      const body = response.json();
      expect(body.environment).toBeDefined();
      expect(typeof body.environment).toBe('string');
    });

    it('should include demoMode flag', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/version',
      });

      const body = response.json();
      expect(typeof body.demoMode).toBe('boolean');
    });
  });
});
