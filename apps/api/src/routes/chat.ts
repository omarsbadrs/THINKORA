import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery, idParamSchema, paginationSchema } from '../lib/request-validation.js';
import { createSSEStream } from '../lib/streaming.js';
import { isDemoMode } from '../config.js';

// ---------- Schemas ----------

const chatSendSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(100_000),
  selectedModel: z.string().optional(),
  routingMode: z.enum(['manual', 'auto', 'cost-optimized', 'quality-optimized']).default('auto'),
  fallbackModels: z.array(z.string()).max(5).optional(),
  maxCost: z.number().positive().optional(),
  strictZdr: z.boolean().default(false),
  context: z.record(z.unknown()).optional(),
});

const chatStreamSchema = chatSendSchema;

const createConversationSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateConversationSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  archived: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const conversationsQuerySchema = paginationSchema.extend({
  archived: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// ---------- Demo data ----------

function demoConversation(id: string) {
  return {
    id,
    title: 'Demo Conversation',
    userId: 'demo-user-001',
    createdAt: '2026-03-25T10:00:00Z',
    updatedAt: '2026-03-25T12:30:00Z',
    archived: false,
    messageCount: 4,
    metadata: {},
  };
}

function demoMessages() {
  return [
    {
      id: 'msg-001',
      role: 'user',
      content: 'What is Thinkora?',
      model: null,
      createdAt: '2026-03-25T10:00:00Z',
    },
    {
      id: 'msg-002',
      role: 'assistant',
      content: 'Thinkora is an AI-powered knowledge management and research assistant that helps you organize, search, and synthesize information from multiple sources.',
      model: 'anthropic/claude-sonnet-4',
      createdAt: '2026-03-25T10:00:05Z',
    },
  ];
}

// ---------- Routes ----------

export default async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /chat/send — send a message and get a full response
  fastify.post('/chat/send', async (request, reply) => {
    const body = validateBody(chatSendSchema, request.body);

    if (isDemoMode()) {
      return reply.send({
        id: 'msg-demo-resp',
        conversationId: body.conversationId || 'conv-demo-001',
        role: 'assistant',
        content: `Demo response to: "${body.message.slice(0, 80)}"`,
        model: body.selectedModel || 'anthropic/claude-sonnet-4',
        routingMode: body.routingMode,
        tokensUsed: { prompt: 120, completion: 85, total: 205 },
        cost: 0.0012,
        latencyMs: 1234,
        createdAt: new Date().toISOString(),
      });
    }

    // TODO: call service layer
    return reply.code(501).send({
      error: 'Chat service not yet implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /chat/stream — stream a response via SSE
  fastify.post('/chat/stream', async (request, reply) => {
    const body = validateBody(chatStreamSchema, request.body);

    const sse = createSSEStream(reply);

    if (isDemoMode()) {
      const words = `This is a demo streamed response to your message: "${body.message.slice(0, 60)}"`.split(' ');
      sse.send('start', {
        conversationId: body.conversationId || 'conv-demo-001',
        model: body.selectedModel || 'anthropic/claude-sonnet-4',
      });
      for (const word of words) {
        sse.send('token', { text: word + ' ' });
      }
      sse.send('metadata', {
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        cost: 0.0008,
        latencyMs: 950,
      });
      sse.done();
      return;
    }

    // TODO: call streaming service
    sse.error('Chat streaming not yet implemented');
  });

  // GET /chat/conversations — list user conversations
  fastify.get('/chat/conversations', async (request, reply) => {
    const query = validateQuery(conversationsQuerySchema, request.query);

    if (isDemoMode()) {
      return reply.send({
        conversations: [
          demoConversation('conv-demo-001'),
          { ...demoConversation('conv-demo-002'), title: 'Research on Vector Databases' },
          { ...demoConversation('conv-demo-003'), title: 'API Design Discussion' },
        ],
        total: 3,
        page: query.page,
        limit: query.limit,
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // GET /chat/conversations/:id — get a single conversation with messages
  fastify.get('/chat/conversations/:id', async (request, reply) => {
    const { id } = validateParams(idParamSchema, request.params);

    if (isDemoMode()) {
      return reply.send({
        ...demoConversation(id),
        messages: demoMessages(),
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // POST /chat/conversations — create a new conversation
  fastify.post('/chat/conversations', async (request, reply) => {
    const body = validateBody(createConversationSchema, request.body);

    if (isDemoMode()) {
      const id = crypto.randomUUID();
      return reply.code(201).send({
        ...demoConversation(id),
        title: body.title || 'New Conversation',
        metadata: body.metadata || {},
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // PATCH /chat/conversations/:id — update conversation
  fastify.patch('/chat/conversations/:id', async (request, reply) => {
    const { id } = validateParams(idParamSchema, request.params);
    const body = validateBody(updateConversationSchema, request.body);

    if (isDemoMode()) {
      return reply.send({
        ...demoConversation(id),
        ...body,
        updatedAt: new Date().toISOString(),
      });
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });

  // DELETE /chat/conversations/:id — delete conversation
  fastify.delete('/chat/conversations/:id', async (request, reply) => {
    const { id } = validateParams(idParamSchema, request.params);

    if (isDemoMode()) {
      return reply.code(204).send();
    }

    return reply.code(501).send({
      error: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });
}
