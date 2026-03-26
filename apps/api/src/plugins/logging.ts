import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function loggingPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (request as FastifyRequest & { startTime: bigint }).startTime = process.hrtime.bigint();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as FastifyRequest & { startTime: bigint }).startTime;
    const duration = startTime
      ? Number(process.hrtime.bigint() - startTime) / 1_000_000
      : 0;

    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(duration * 100) / 100,
        userAgent: request.headers['user-agent'],
        userId: request.user?.id,
      },
      `${request.method} ${request.url} ${reply.statusCode} ${duration.toFixed(1)}ms`
    );
  });
}

export default fp(loggingPlugin, {
  name: 'logging',
});
