import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { clearAuthCookies, readAccessToken, readRefreshToken, setAuthCookies } from '../middleware/auth.middleware.js';
import {
  adminView,
  assertCredentials,
  endSession,
  isLockedOut,
  lockoutSecondsRemaining,
  refreshSession,
  registerFailedAttempt,
  revokeAllSessions,
  sessionIdOf,
  startSession,
  clearFailedAttempts,
} from '../services/auth.service.js';

const GENERIC_FAILURE = 'Invalid email or password.';

const keyForAttempt = (req, email) => {
  // Only the configured account exists, so the attempt is identified by the
  // originating IP and the email that was tried. That keeps probing expensive.
  const ip = req.ip || 'unknown';
  const normalised = String(email || '').trim().toLowerCase();
  return `${ip}:${normalised}`;
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const key = keyForAttempt(req, email);

  if (isLockedOut(key)) {
    const wait = lockoutSecondsRemaining(key);
    logger.warn('admin sign-in locked out', { key, wait });
    throw ApiError.tooMany(`Too many failed attempts. Try again in ${wait} seconds.`, { code: 'rate_limited' });
  }

  const { admin, valid } = assertCredentials(email, password);
  if (!admin || !valid) {
    registerFailedAttempt(key);
    logger.warn('admin sign-in failed', { key });
    throw ApiError.unauthorized(GENERIC_FAILURE, { code: 'invalid_credentials' });
  }

  if (!admin.isActive) {
    registerFailedAttempt(key);
    throw ApiError.forbidden('This account has been deactivated.', { code: 'account_inactive' });
  }

  clearFailedAttempts(key);
  const { tokens, sessionId } = startSession({ ip: req.ip, userAgent: req.get('user-agent') });
  setAuthCookies(res, tokens);

  logger.info('admin signed in', { sessionId, ip: req.ip });
  return sendSuccess(res, {
    admin: adminView(null),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const presented = req.body?.refreshToken || readRefreshToken(req);
  const result = refreshSession(presented);
  if (!result) {
    throw ApiError.unauthorized('Your session has expired. Sign in again.', { code: 'session_revoked' });
  }
  setAuthCookies(res, result.tokens);
  return sendSuccess(res, {
    admin: adminView(result.session),
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const sid = req.adminSession?.id || sessionIdOf(readAccessToken(req)) || sessionIdOf(readRefreshToken(req));
  endSession(sid);
  clearAuthCookies(res);
  return sendSuccess(res, { signedOut: true });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.admin) throw ApiError.unauthorized('Sign in to continue.');
  return sendSuccess(res, { admin: adminView(req.adminSession) });
});

export const updatePassword = asyncHandler(async (_req, res) => {
  // The single-admin account cannot have its password changed via the API
  // without redeploying code. This route is kept to satisfy any existing
  // client calls, but it always returns a 403 to avoid revealing anything.
  throw ApiError.forbidden('Password changes are not available in this build.', { code: 'password_change_disabled' });
});

export const signOutEverywhere = asyncHandler(async (_req, res) => {
  revokeAllSessions();
  clearAuthCookies(res);
  return sendSuccess(res, { revoked: true });
});
