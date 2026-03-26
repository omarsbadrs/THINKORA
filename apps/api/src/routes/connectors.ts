import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateBody } from '../lib/request-validation.js';
import { isDemoMode, config } from '../config.js';

// ---------- Schemas ----------

const supabaseMcpConnectSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
  projectId: z.string().optional(),
});

// ---------- Demo data ----------

function demoConnectors() {
  return [
    {
      id: 'conn-notion',
      type: 'notion',
      status: 'connected',
      lastSync: '2026-03-25T08:00:00Z',
      pagesIndexed: 47,
      metadata: { workspaceName: 'Demo Workspace' },
    },
    {
      id: 'conn-supabase-mcp',
      type: 'supabase-mcp',
      status: 'disconnected',
      lastSync: null,
      pagesIndexed: 0,
      metadata: {},
    },
  ];
}

// ---------- Routes ----------

export default async function connectorsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /connectors — list all connectors and their status
  fastify.get('/connectors', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({ connectors: demoConnectors() });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /connectors/notion/start — initiate Notion OAuth flow
  fastify.post('/connectors/notion/start', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        authUrl: 'https://api.notion.com/v1/oauth/authorize?demo=true',
        state: 'demo-state-token',
      });
    }

    if (!config.notion.clientId) {
      return reply.code(400).send({
        error: 'Notion integration not configured',
        code: 'CONNECTOR_NOT_CONFIGURED',
        status: 400,
      });
    }

    const state = crypto.randomUUID();
    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${config.notion.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.notion.redirectUri)}&state=${state}`;

    return reply.send({ authUrl, state });
  });

  // GET /connectors/notion/callback — handle Notion OAuth callback
  fastify.get('/connectors/notion/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };

    if (query.error) {
      return reply.code(400).send({
        error: `Notion authorization failed: ${query.error}`,
        code: 'OAUTH_FAILED',
        status: 400,
      });
    }

    if (isDemoMode()) {
      return reply.send({
        status: 'connected',
        workspaceName: 'Demo Workspace',
        pagesFound: 47,
      });
    }

    if (!query.code) {
      return reply.code(400).send({
        error: 'Missing authorization code',
        code: 'BAD_REQUEST',
        status: 400,
      });
    }

    // TODO: exchange code for access token, store credentials, trigger initial sync
    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /connectors/notion/disconnect — disconnect Notion
  fastify.post('/connectors/notion/disconnect', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        status: 'disconnected',
        message: 'Notion connector disconnected',
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /connectors/supabase-mcp/connect — connect Supabase MCP
  fastify.post('/connectors/supabase-mcp/connect', async (request, reply) => {
    const body = validateBody(supabaseMcpConnectSchema, request.body);

    if (isDemoMode()) {
      return reply.send({
        status: 'connected',
        url: body.url,
        projectId: body.projectId || 'demo-project',
      });
    }

    // TODO: validate MCP connection, store credentials
    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /connectors/supabase-mcp/disconnect — disconnect Supabase MCP
  fastify.post('/connectors/supabase-mcp/disconnect', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        status: 'disconnected',
        message: 'Supabase MCP connector disconnected',
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // GET /connectors/health — health check for all connectors
  fastify.get('/connectors/health', async (_request, reply) => {
    if (isDemoMode()) {
      return reply.send({
        connectors: {
          notion: { status: 'healthy', latencyMs: 120 },
          'supabase-mcp': { status: 'unconfigured', latencyMs: 0 },
        },
        timestamp: new Date().toISOString(),
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });
}
