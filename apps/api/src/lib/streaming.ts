import type { FastifyReply } from 'fastify';

export interface SSEStream {
  send(event: string, data: unknown): void;
  done(): void;
  error(message: string): void;
}

export function createSSEStream(reply: FastifyReply): SSEStream {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let closed = false;

  reply.raw.on('close', () => {
    closed = true;
  });

  return {
    send(event: string, data: unknown): void {
      if (closed) return;
      const payload = JSON.stringify(data);
      reply.raw.write(`event: ${event}\ndata: ${payload}\n\n`);
    },

    done(): void {
      if (closed) return;
      reply.raw.write('event: done\ndata: {}\n\n');
      reply.raw.end();
      closed = true;
    },

    error(message: string): void {
      if (closed) return;
      const payload = JSON.stringify({ error: message });
      reply.raw.write(`event: error\ndata: ${payload}\n\n`);
      reply.raw.end();
      closed = true;
    },
  };
}
