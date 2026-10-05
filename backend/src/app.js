import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { attachAdmin } from './middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { logger } from './utils/logger.js';

export const createApp = () => {
  const app = express();

  // Behind a reverse proxy, req.ip and secure cookies depend on this.
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON and the storefront is a separate origin, so a strict
      // default-src policy here would only get in the way.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Credentials are required, so the allowed origins are an explicit list.
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser clients send no Origin header.
        if (!origin) return callback(null, true);
        if (env.CLIENT_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: { write: (line) => logger.info(line.trim()) } }));

  // Broad safety net; individual routes add tighter limits where it matters.
  app.use('/api', apiLimiter, rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

  // Populates req.admin when a valid session cookie or bearer token is present.
  // Never blocks, so public routes stay public.
  app.use('/api', attachAdmin);

  app.use('/api', routes);

  // Convenience redirect so hitting the bare host is not a dead end.
  app.get('/', (_req, res) => res.json({ success: true, data: { service: 'anish-enterprises-api', docs: '/api/health' } }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
