/**
 * Server-side half of the admin sign-in.
 *
 * The panel has a single owner whose credentials are fixed in
 * config/adminCredentials.js. This module owns everything that must never be
 * decided by the browser:
 *
 *   - comparing the submitted pair against the configured one,
 *   - minting the signed session tokens that go into the httpOnly cookies,
 *   - remembering which sessions are still live, so a logout really invalidates
 *     the session instead of only asking the browser to drop its cookie,
 *   - counting repeated failures, so guessing the password is throttled.
 *
 * Sessions are persisted in MongoDB (AdminSession collection), so a restart or
 * redeploy of the API does not sign anyone out. The in-memory map survives only
 * as a fallback for environments with no database connection (the unit tests),
 * never as the production source of truth.
 */
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { adminPrincipal, publicAdminView, verifyAdminCredentials } from '../config/adminCredentials.js';
import { AdminSession } from '../models/AdminSession.js';

const ISSUER = 'anish-enterprises';

/** Failures allowed per key before sign-in is refused for the lock window. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

/** Test-only fallback store used when mongoose has no live connection. */
const memorySessions = new Map();
const failures = new Map();

const usingDatabase = () => mongoose.connection?.readyState === 1;

/** Milliseconds for a jsonwebtoken duration string, used to set cookie maxAge. */
export const durationToMs = (value) => {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)?$/i.exec(String(value).trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const factor = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, y: 31557600000 }[unit];
  return Math.round(amount * factor);
};

const sign = (payload, expiresIn) => jwt.sign(payload, env.JWT_SECRET, { expiresIn, issuer: ISSUER });

/** Verifies a token of an expected type. Returns null instead of throwing. */
const verify = (token, expectedType) => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER });
    if (payload.typ !== expectedType) throw new Error('wrong token type');
    return payload;
  } catch {
    return null;
  }
};

/**
 * The token must belong to the configured admin and carry a usable session id.
 * Anything else is refused even with a valid signature.
 */
const claimsAreForAdmin = (payload) => {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.sid || typeof payload.sid !== 'string') return false;
  const admin = adminPrincipal();
  return payload.sub === admin.id && payload.role === admin.role;
};

const toSessionView = (doc) => ({
  id: doc.sid,
  subject: doc.subject,
  role: doc.role,
  issuedAt: doc.issuedAt instanceof Date ? doc.issuedAt.toISOString() : doc.issuedAt,
  lastLoginAt: doc.lastLoginAt instanceof Date ? doc.lastLoginAt.toISOString() : doc.lastLoginAt,
  ip: doc.ip ?? null,
  userAgent: doc.userAgent ?? null,
  expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt.getTime() : Number(new Date(doc.expiresAt)),
  revokedAt: doc.revokedAt ? (doc.revokedAt instanceof Date ? doc.revokedAt.toISOString() : doc.revokedAt) : null,
});

const memoryDropExpired = (now = Date.now()) => {
  for (const [id, session] of memorySessions) if (session.expiresAt <= now || session.revokedAt) memorySessions.delete(id);
  for (const [key, record] of failures) if (record.lockedUntil <= now && record.count === 0) failures.delete(key);
};

const memoryFindLive = (sid) => {
  const session = memorySessions.get(sid);
  if (!session || session.expiresAt <= Date.now() || session.revokedAt) return null;
  return session;
};

const findLiveSession = async (sid) => {
  if (!usingDatabase()) return memoryFindLive(sid);
  const doc = await AdminSession.findOne({ sid }).lean();
  if (!doc || doc.revokedAt || new Date(doc.expiresAt).getTime() <= Date.now()) return null;
  return toSessionView(doc);
};

const pruneExpiredSessions = async () => {
  if (!usingDatabase()) return memoryDropExpired();
  try {
    await AdminSession.deleteMany({ expiresAt: { $lte: new Date() } });
  } catch {
    // Pruning is best-effort; a failed sweep never blocks sign-in.
  }
};

/**
 * Compares the submitted pair against the configured one. Only the configured
 * address and password can ever produce a session.
 */
export const assertCredentials = (email, password) => {
  const valid = verifyAdminCredentials(email, password);
  return { admin: valid ? adminPrincipal() : null, valid };
};

/** Starts a session and returns the token pair to write into the cookies. */
export const startSession = async ({ ip = null, userAgent = null } = {}) => {
  const admin = adminPrincipal();
  await pruneExpiredSessions();
  const sessionId = crypto.randomUUID();
  const accessTokenMaxAge = durationToMs(env.JWT_EXPIRES_IN);
  const refreshTokenMaxAge = durationToMs(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAtMs = Date.now() + (refreshTokenMaxAge ?? 0);

  if (usingDatabase()) {
    await AdminSession.create({
      sid: sessionId,
      subject: admin.id,
      role: admin.role,
      issuedAt: new Date(),
      lastLoginAt: new Date(),
      expiresAt: new Date(expiresAtMs),
      ip,
      userAgent,
      revokedAt: null,
    });
  } else {
    memorySessions.set(sessionId, {
      id: sessionId,
      subject: admin.id,
      role: admin.role,
      issuedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      ip,
      userAgent,
      expiresAt: expiresAtMs,
      revokedAt: null,
    });
  }

  const claims = { sub: admin.id, role: admin.role, email: admin.email, name: admin.name, sid: sessionId };
  return {
    admin,
    sessionId,
    tokens: {
      accessToken: sign({ ...claims, typ: 'access' }, env.JWT_EXPIRES_IN),
      refreshToken: sign({ ...claims, typ: 'refresh' }, env.JWT_REFRESH_EXPIRES_IN),
      // Cookie maxAge must not outlive the token inside the cookie.
      accessTokenMaxAge,
      refreshTokenMaxAge,
    },
  };
};

/**
 * Resolves a presented token to a live session. A token that is signed correctly
 * is still refused once its session has been revoked, so a copied cookie stops
 * working the moment the owner logs out.
 */
export const resolveSession = async (token) => {
  if (!token) return null;
  const payload = verify(token, 'access');
  if (!claimsAreForAdmin(payload)) return null;
  const session = await findLiveSession(payload.sid);
  if (!session) return null;
  return { session, admin: adminPrincipal() };
};

/**
 * Exchanges a valid refresh cookie for a fresh pair, but only while the session
 * behind it is still live.
 */
export const refreshSession = async (token) => {
  if (!token) return null;
  const payload = verify(token, 'refresh');
  if (!claimsAreForAdmin(payload)) return null;
  const session = await findLiveSession(payload.sid);
  if (!session) return null;
  const admin = adminPrincipal();
  const claims = { sub: admin.id, role: admin.role, email: admin.email, name: admin.name, sid: session.id };
  return {
    admin,
    session,
    tokens: {
      accessToken: sign({ ...claims, typ: 'access' }, env.JWT_EXPIRES_IN),
      refreshToken: sign({ ...claims, typ: 'refresh' }, env.JWT_REFRESH_EXPIRES_IN),
      accessTokenMaxAge: durationToMs(env.JWT_EXPIRES_IN),
      refreshTokenMaxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
    },
  };
};

/** The session id carried by a presented token, so logout can revoke exactly that one. */
export const sessionIdOf = (token) => verify(token, 'access')?.sid || verify(token, 'refresh')?.sid || null;

/** Revokes one session, or every session when no id is given. */
export const endSession = async (sessionId) => {
  if (usingDatabase()) {
    if (sessionId) {
      await AdminSession.updateOne({ sid: sessionId }, { $set: { revokedAt: new Date() } });
    } else {
      await AdminSession.updateMany({ revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
    return;
  }
  if (sessionId) {
    const session = memorySessions.get(sessionId);
    if (session) session.revokedAt = Date.now();
  } else {
    memorySessions.clear();
  }
};

export const revokeAllSessions = async () => {
  if (usingDatabase()) {
    const result = await AdminSession.updateMany({ revokedAt: null, expiresAt: { $gt: new Date() } }, { $set: { revokedAt: new Date() } });
    return result.modifiedCount ?? 0;
  }
  const count = memorySessions.size;
  memorySessions.clear();
  return count;
};

/** The signed-in admin as the browser is allowed to see them. */
export const adminView = (session) => publicAdminView(adminPrincipal(), { lastLoginAt: session?.lastLoginAt ?? null });

/* ------------------------------------------------------------- failed attempts */

/**
 * The current record for a key. A lock that has run out takes the failure count
 * with it, so a caller who waits out the window starts the next one from zero.
 */
const attemptRecord = (key) => {
  const now = Date.now();
  const existing = failures.get(key);
  if (!existing) return { count: 0, lockedUntil: 0 };
  if (existing.lockedUntil && existing.lockedUntil <= now) return { count: 0, lockedUntil: 0 };
  return existing;
};

/** True once a key has burned through its allowance for the current window. */
export const isLockedOut = (key) => attemptRecord(key).lockedUntil > Date.now();

/** Seconds the caller must wait, so the message can say how long. */
export const lockoutSecondsRemaining = (key) =>
  Math.max(0, Math.ceil((attemptRecord(key).lockedUntil - Date.now()) / 1000));

export const registerFailedAttempt = (key) => {
  const record = attemptRecord(key);
  const next = { count: record.count + 1, lockedUntil: record.lockedUntil };
  if (next.count >= MAX_FAILED_ATTEMPTS) {
    next.count = 0;
    next.lockedUntil = Date.now() + LOCK_WINDOW_MS;
  }
  failures.set(key, next);
  return next;
};

export const clearFailedAttempts = (key) => failures.delete(key);
