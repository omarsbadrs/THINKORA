import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { config } from './config.js';

// Plugins
import errorsPlugin from './plugins/errors.js';
import loggingPlugin from './plugins/logging.js';
import authPlugin from './plugins/auth.js';
import requestContextPlugin from './plugins/request-context.js';

// Routes
import healthRoutes from './routes/health.js';
import chatRoutes from './routes/chat.js';
import filesRoutes from './routes/files.js';
import connectorsRoutes from './routes/connectors.js';
import searchRoutes from './routes/search.js';
import modelsRoutes from './routes/models.js';
import dashboardRoutes from './routes/dashboard.js';
import memoryRoutes from './routes/memory.js';
import adminRoutes from './routes/admin.js';
import evalsRoutes from './routes/evals.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.server.logLevel,
      ...(config.server.nodeEnv === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
              },
            },
          }
        : {}),
    },
  });

  // ---- Core Plugins ----

  await app.register(cors, {
    origin: config.security.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.storage.maxFileSize,
      files: 10,
    },
  });

  await app.register(websocket);

  // ---- Custom Plugins ----

  await app.register(errorsPlugin);
  await app.register(loggingPlugin);
  await app.register(authPlugin);
  await app.register(requestContextPlugin);

  // ---- Route Modules ----

  await app.register(healthRoutes);
  await app.register(chatRoutes, { prefix: '/chat' });
  await app.register(filesRoutes, { prefix: '/files' });
  await app.register(connectorsRoutes, { prefix: '/connectors' });
  await app.register(searchRoutes, { prefix: '/search' });
  await app.register(modelsRoutes, { prefix: '/models' });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });
  await app.register(memoryRoutes, { prefix: '/memory' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(evalsRoutes, { prefix: '/evals' });

  return app;
}
