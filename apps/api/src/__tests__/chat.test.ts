import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// ---------------------------------------------------------------------------
// Mock demo mode to be enabled for all tests
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

  // Register minimal plugins needed
  const { default: chatRoutes } = await import('../routes/chat.js');
  await app.register(chatRoutes, { prefix: '/chat' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Chat Routes', () => {
  describe('POST /chat/conversations — create conversation', () => {
    it('should create a new conversation and return 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/conversations',
        payload: { title: 'Test Conversation' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.title).toBe('Test Conversation');
    });

    it('should create a conversation with default title when none provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/conversations',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.title).toBeDefined();
    });

    it('should include metadata in the created conversation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/conversations',
        payload: { title: 'With Meta', metadata: { project: 'alpha' } },
      });

      const body = response.json();
      expect(body.metadata).toEqual({ project: 'alpha' });
    });
  });

  describe('POST /chat/send — send message', () => {
    it('should return a demo response for a valid message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/send',
        payload: {
          message: 'Hello, Thinkora!',
          routingMode: 'auto',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.content).toContain('Hello, Thinkora!');
      expect(body.role).toBe('assistant');
      expect(body.model).toBeDefined();
    });

    it('should respect the selected model', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/send',
        payload: {
          message: 'Test message',
          selectedModel: 'openai/gpt-4o',
        },
      });

      const body = response.json();
      expect(body.model).toBe('openai/gpt-4o');
    });

    it('should include token usage and cost', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/send',
        payload: { message: 'Token test' },
      });

      const body = response.json();
      expect(body.tokensUsed).toBeDefined();
      expect(body.tokensUsed.prompt).toBeGreaterThan(0);
      expect(body.tokensUsed.completion).toBeGreaterThan(0);
      expect(body.cost).toBeGreaterThan(0);
    });

    it('should include latency measurement', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/send',
        payload: { message: 'Latency test' },
      });

      const body = response.json();
      expect(body.latencyMs).toBeDefined();
      expect(typeof body.latencyMs).toBe('number');
    });
  });

  describe('POST /chat/stream — stream response', () => {
    it('should return SSE content-type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/stream',
        payload: { message: 'Stream test' },
      });

      // The response may be returned as raw SSE data
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should include start and done events in the stream', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/stream',
        payload: { message: 'Stream events' },
      });

      const body = response.body;
      expect(body).toContain('event: start');
      expect(body).toContain('event: done');
    });

    it('should include token events in the stream', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/stream',
        payload: { message: 'Stream tokens' },
      });

      const body = response.body;
      expect(body).toContain('event: token');
    });
  });

  describe('GET /chat/conversations — list conversations', () => {
    it('should return a list of conversations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chat/conversations',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.conversations).toBeDefined();
      expect(Array.isArray(body.conversations)).toBe(true);
      expect(body.total).toBeGreaterThan(0);
    });

    it('should include pagination info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chat/conversations?page=1&limit=10',
      });

      const body = response.json();
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
    });

    it('should return conversations with expected properties', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/chat/conversations',
      });

      const body = response.json();
      const conv = body.conversations[0];
      expect(conv.id).toBeDefined();
      expect(conv.title).toBeDefined();
      expect(conv.createdAt).toBeDefined();
      expect(conv.updatedAt).toBeDefined();
    });
  });
});
