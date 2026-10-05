/**
 * The one and only set of admin credentials for the panel.
 *
 * These values live in the API and nowhere else. Nothing in frontend/ may import
 * this module, and neither value is ever written to a response, a log line or a
 * cookie: the browser only ever receives the session cookie set after a
 * successful comparison.
 *
 * Changing the admin password is therefore a code change plus a deploy, not a
 * self-service action in the panel.
 */
import crypto from 'node:crypto';
import { ADMIN_ROLE, ROLE_PERMISSIONS } from './constants.js';

export const ADMIN_EMAIL = 'anishenterprisessvk@gmail.com';
export const ADMIN_PASSWORD = 'anish@1144';
export const ADMIN_NAME = 'Anish Enterprises';

/**
 * Stable subject for the tokens. The panel has a single owner, so there is no
 * database row to point at: the id only has to be unique and unguessable enough
 * that a token cannot be forged by guessing it.
 */
export const ADMIN_ID = 'anish-admin-owner';

/** Surrounding whitespace in a pasted email is always an accident, never a credential. */
const normaliseEmail = (value) => String(value ?? '').trim().toLowerCase();

const digest = (value) => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest();

/**
 * Constant-time string comparison. timingSafeEqual needs equally sized buffers,
 * so both sides are hashed first: that keeps the comparison itself independent of
 * length and stops the response time from revealing how much of a guess was right.
 */
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

/**
 * True only for the exact configured pair. Both comparisons always run, so a
 * correct email with a wrong password costs the same as the reverse.
 */
export const verifyAdminCredentials = (email, password) => {
  const emailMatches = safeEqual(normaliseEmail(email), ADMIN_EMAIL);
  const passwordMatches = safeEqual(password, ADMIN_PASSWORD);
  return emailMatches && passwordMatches;
};

/**
 * The signed-in admin, shaped like the document the rest of the API already
 * expects so `requireAuth`, `requireRole` and `requirePermission` keep working
 * without a database round trip.
 */
export const adminPrincipal = () => ({
  _id: ADMIN_ID,
  id: ADMIN_ID,
  name: ADMIN_NAME,
  email: ADMIN_EMAIL,
  phone: '',
  role: ADMIN_ROLE.OWNER,
  isActive: true,
  isLocked: () => false,
  hasPermission: (permission) => (ROLE_PERMISSIONS[ADMIN_ROLE.OWNER] || []).includes(permission),
});

/**
 * What the browser is allowed to see about the signed-in admin. Deliberately
 * carries no credential material of any kind: no password, no hash, no token.
 */
export const publicAdminView = (admin, { lastLoginAt = null } = {}) => ({
  id: String(admin.id ?? admin._id ?? ADMIN_ID),
  name: admin.name,
  email: admin.email,
  phone: admin.phone ?? '',
  role: admin.role,
  permissions: ROLE_PERMISSIONS[admin.role] || [],
  active: true,
  lastLoginAt,
  createdAt: null,
});
