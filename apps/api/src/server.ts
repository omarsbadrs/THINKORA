import { buildApp } from './app.js';
import { config, isDemoMode } from './config.js';

async function start(): Promise<void> {
  const app = await buildApp();

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await app.close();
        app.log.info('Server closed');
        process.exit(0);
      } catch (err) {
        app.log.error(err, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  // Handle uncaught errors
  process.on('unhandledRejection', (err) => {
    app.log.error(err, 'Unhandled rejection');
  });

  process.on('uncaughtException', (err) => {
    app.log.fatal(err, 'Uncaught exception');
    process.exit(1);
  });

  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    app.log.info(
      `Thinkora API running on http://${config.server.host}:${config.server.port}`
    );

    if (isDemoMode()) {
      app.log.info('Running in DEMO MODE — all routes return mock data');
    }
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
