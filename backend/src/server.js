import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase, mongoCapabilities } from './config/db.js';
import { logger } from './utils/logger.js';
import { assertPortAvailable } from './utils/port.js';

const start = async () => {
  // Claim the port before opening a database connection, so a duplicate start
  // fails immediately and clearly instead of after a slow MongoDB handshake.
  await assertPortAvailable(env.PORT);
  logger.info('starting API', { pid: process.pid, port: env.PORT, environment: env.NODE_ENV });

  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    const capabilities = mongoCapabilities();
    logger.info('API listening', {
      pid: process.pid,
      port: env.PORT,
      environment: env.NODE_ENV,
      origins: env.CLIENT_ORIGINS,
      database: env.mongoDatabaseName,
      transactions: capabilities?.supportsTransactions ? 'available' : 'unavailable (guarded atomic stock updates in use)',
      imageStorage: env.UPLOAD_STORAGE,
    });
  });

  // Backstop for a port taken between the preflight check and this bind, and
  // for permission problems: report them plainly rather than as a raw stack.
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`port ${env.PORT} became unavailable before the server could bind`, {
        hint: 'another process took the port, or another instance of this backend is already running',
      });
    } else if (error.code === 'EACCES') {
      logger.error(`not allowed to listen on port ${env.PORT}`, { hint: 'choose a port above 1023 via PORT=<number>' });
    } else {
      logger.error('server error', { message: error.message });
    }
    disconnectDatabase()
      .catch(() => {})
      .finally(() => process.exit(1));
  });

  // Slow clients must not hold a socket open indefinitely.
  server.headersTimeout = 65000;
  server.keepAliveTimeout = 61000;

  let shuttingDown = false;
  const shutdown = async (signal) => {
    // SIGINT and SIGTERM can both arrive; only drain the connections once.
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`received ${signal}, shutting down`);
    // Stop accepting new work, then release the database.
    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info('shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('error during shutdown', { message: error.message });
        process.exit(1);
      }
    });
    // Do not hang forever if a connection refuses to drain.
    setTimeout(() => {
      logger.error('forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled promise rejection', { reason: reason?.message || String(reason) });
  });
  process.on('uncaughtException', (error) => {
    logger.error('uncaught exception, exiting', { message: error.message, stack: error.stack });
    process.exit(1);
  });
};

start().catch((error) => {
  // A port clash is a configuration problem, not a crash: report the reason
  // and the way out instead of a stack trace.
  if (error.name === 'PortUnavailableError') {
    logger.error(error.message, { code: error.code, port: env.PORT, pid: process.pid });
    process.exit(1);
  }
  logger.error('failed to start the API', { message: error.message, stack: error.stack });
  process.exit(1);
});
