import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  timestamp: string;
  userId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestContext;
  }
}

async function requestContextPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('ctx', undefined);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const requestId =
      (request.headers['x-request-id'] as string) || uuidv4();

    request.ctx = {
      requestId,
      timestamp: new Date().toISOString(),
      userId: request.user?.id,
    };

    // Set request ID on the reply headers for tracing
    request.raw.headers['x-request-id'] = requestId;
  });

  // Attach request ID to outgoing response headers
  fastify.addHook('onSend', async (request, reply) => {
    if (request.ctx?.requestId) {
      reply.header('x-request-id', request.ctx.requestId);
    }
  });
}

export default fp(requestContextPlugin, {
  name: 'request-context',
  dependencies: ['auth'],
});
