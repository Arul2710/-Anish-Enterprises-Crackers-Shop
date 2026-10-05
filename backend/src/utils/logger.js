import { env } from '../config/env.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = env.isProduction ? LEVELS.info : LEVELS.debug;

const emit = (level, message, meta) => {
  if (LEVELS[level] > threshold) return;
  const line = { level, time: new Date().toISOString(), message };
  if (meta && Object.keys(meta).length) line.meta = meta;

  if (env.isProduction) {
    // Structured single-line JSON keeps production logs machine readable.
    process.stdout.write(`${JSON.stringify(line)}\n`);
    return;
  }
  const tag = { error: 'ERROR', warn: 'WARN ', info: 'INFO ', debug: 'DEBUG' }[level];
  const tail = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  process.stdout.write(`${tag} ${message}${tail}\n`);
};

export const logger = {
  error: (message, meta) => emit('error', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  info: (message, meta) => emit('info', message, meta),
  debug: (message, meta) => emit('debug', message, meta),
};

export default logger;
