import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

const APP_VERSION = process.env.APP_VERSION || '0.1.0';

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /health — basic liveness check
  fastify.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
    };
  });

  // GET /ready — readiness check: verifies DB and OpenRouter connectivity
  fastify.get('/ready', async (_request, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Check Supabase / database connectivity
    const dbStart = Date.now();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.supabase.url, config.supabase.anonKey);
      const { error } = await supabase.from('_health').select('1').limit(1).maybeSingle();
      // Even if the table doesn't exist, a connection-level error is what we care about
      checks.database = {
        status: error && !error.message.includes('does not exist') ? 'error' : 'ok',
        latencyMs: Date.now() - dbStart,
        ...(error && !error.message.includes('does not exist') ? { error: error.message } : {}),
      };
    } catch (err) {
      checks.database = {
        status: 'error',
        latencyMs: Date.now() - dbStart,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    // Check OpenRouter connectivity
    const orStart = Date.now();
    try {
      if (config.openrouter.apiKey) {
        const res = await fetch(`${config.openrouter.baseUrl}/models`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${config.openrouter.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        checks.openrouter = {
          status: res.ok ? 'ok' : 'degraded',
          latencyMs: Date.now() - orStart,
          ...(!res.ok ? { error: `HTTP ${res.status}` } : {}),
        };
      } else {
        checks.openrouter = {
          status: 'unconfigured',
          latencyMs: 0,
        };
      }
    } catch (err) {
      checks.openrouter = {
        status: 'error',
        latencyMs: Date.now() - orStart,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    const allOk = Object.values(checks).every(
      (c) => c.status === 'ok' || c.status === 'unconfigured'
    );

    const status = allOk ? 200 : 503;
    return reply.code(status).send({
      status: allOk ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // GET /version
  fastify.get('/version', async (_request, _reply) => {
    return {
      version: APP_VERSION,
      nodeVersion: process.version,
      environment: config.server.nodeEnv,
      demoMode: config.demo.enabled,
    };
  });
}
