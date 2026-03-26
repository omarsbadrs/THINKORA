import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { config, isDemoMode } from '../config.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

const SKIP_AUTH_PATHS = ['/health', '/ready', '/version'];

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey);

  fastify.decorateRequest('user', undefined);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health-check routes
    if (SKIP_AUTH_PATHS.some((p) => request.url.startsWith(p))) {
      return;
    }

    // Demo mode: attach a mock user and proceed
    if (isDemoMode()) {
      request.user = {
        id: config.demo.userId,
        email: config.demo.userEmail,
        name: config.demo.userName,
        role: 'user',
      };
      return;
    }

    // Extract token from Authorization header or session cookie
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    if (!token) {
      const cookieHeader = request.headers.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/sb-access-token=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
    }

    if (!token) {
      reply.code(401).send({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        status: 401,
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        reply.code(401).send({
          error: 'Invalid or expired token',
          code: 'AUTH_INVALID_TOKEN',
          status: 401,
        });
        return;
      }

      request.user = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email || '',
        role: data.user.role || 'user',
      };
    } catch {
      reply.code(401).send({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        status: 401,
      });
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
});
