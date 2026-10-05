import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const shared = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Rate limiting must not fail open in production.
  skip: () => env.isTest,
};

const build = (windowMs, max, message, keyByIp = true) =>
  rateLimit({
    ...shared,
    windowMs,
    limit: max,
    keyGenerator: keyByIp ? (req) => req.ip : (req) => req.admin?.id || req.ip,
    message: { success: false, error: { code: 'rate_limited', message } },
  });

/** Deliberately strict: this is the credential-stuffing target. */
export const loginLimiter = build(
  15 * 60 * 1000,
  10,
  'Too many sign-in attempts. Please wait a few minutes and try again.',
);

export const orderLimiter = build(
  60 * 60 * 1000,
  20,
  'Too many orders from this connection. Please call the shop if you need help.',
);

export const importLimiter = build(
  60 * 60 * 1000,
  20,
  'Too many import attempts. Please wait before trying again.',
);

export const writeLimiter = build(60 * 1000, 120, 'Too many changes in a short period. Please slow down.');

export const apiLimiter = build(15 * 60 * 1000, 1000, 'Too many requests. Please slow down.');

export default apiLimiter;
