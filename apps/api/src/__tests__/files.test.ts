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

  // Register multipart plugin for file upload support
  const multipart = await import('@fastify/multipart');
  await app.register(multipart.default, {
    limits: { fileSize: 52428800, files: 10 },
  });

  const { default: filesRoutes } = await import('../routes/files.js');
  await app.register(filesRoutes, { prefix: '/files' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Files Routes', () => {
  describe('POST /files/upload — file upload', () => {
    it('should accept a file upload and return 201', async () => {
      const form = new FormData();
      form.append('file', new Blob(['test content'], { type: 'application/pdf' }), 'test.pdf');

      const response = await app.inject({
        method: 'POST',
        url: '/files/upload',
        payload: form,
        headers: {
          'content-type': 'multipart/form-data; boundary=----test',
        },
      });

      // In demo mode, the upload is accepted regardless of multipart parsing
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.status).toBe('processing');
    });

    it('should return the file name in the response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/files/upload',
        payload: '---boundary\r\nContent-Disposition: form-data; name="file"; filename="doc.pdf"\r\nContent-Type: application/pdf\r\n\r\ncontent\r\n---boundary--',
        headers: {
          'content-type': 'multipart/form-data; boundary=-boundary',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.name).toBeDefined();
    });
  });

  describe('GET /files — list files', () => {
    it('should return a list of files', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/files',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.files).toBeDefined();
      expect(Array.isArray(body.files)).toBe(true);
      expect(body.files.length).toBeGreaterThan(0);
    });

    it('should include file metadata for each entry', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/files',
      });

      const body = response.json();
      const file = body.files[0];
      expect(file.id).toBeDefined();
      expect(file.name).toBeDefined();
      expect(file.mimeType).toBeDefined();
      expect(file.size).toBeGreaterThan(0);
      expect(file.status).toBeDefined();
      expect(file.chunks).toBeDefined();
    });

    it('should include pagination info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/files?page=1&limit=5',
      });

      const body = response.json();
      expect(body.page).toBe(1);
      expect(body.limit).toBe(5);
      expect(body.total).toBeDefined();
    });

    it('should return multiple file types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/files',
      });

      const body = response.json();
      const mimeTypes = body.files.map((f: { mimeType: string }) => f.mimeType);
      expect(new Set(mimeTypes).size).toBeGreaterThan(1);
    });
  });

  describe('GET /files/:id — get file details', () => {
    it('should return a file by its ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/files/${TEST_UUID}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(TEST_UUID);
      expect(body.name).toBeDefined();
      expect(body.status).toBeDefined();
    });

    it('should include chunk count and size', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/files/${TEST_UUID}`,
      });

      const body = response.json();
      expect(typeof body.chunks).toBe('number');
      expect(typeof body.size).toBe('number');
    });
  });

  describe('POST /files/:id/reprocess — reprocess a file', () => {
    it('should trigger reprocessing and return updated file', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/files/${TEST_UUID}/reprocess`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(TEST_UUID);
      expect(body.status).toBe('processing');
    });

    it('should update the updatedAt timestamp', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/files/${TEST_UUID}/reprocess`,
      });

      const body = response.json();
      expect(body.updatedAt).toBeDefined();
      const updatedDate = new Date(body.updatedAt);
      expect(updatedDate.getTime()).not.toBeNaN();
    });
  });

  describe('DELETE /files/:id — delete a file', () => {
    it('should return 204 for successful deletion', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/files/${TEST_UUID}`,
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });
  });
});
