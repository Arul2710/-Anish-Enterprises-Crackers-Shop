import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveSession } from '../services/auth.service.js';
import { PERMISSION, roleHasPermission } from '../config/constants.js';

export const ADMIN_COOKIE = 'ae_admin_token';
export const REFRESH_COOKIE = 'ae_admin_refresh';

/**
 * Cookie flags for the session pair.
 *
 * httpOnly keeps the token out of reach of any script on the page, so a
 * cross-site scripting bug cannot read it. secure is on wherever the site is
 * served over https, and sameSite is None in production because the API and the
 * storefront are different origins there; that combination is only accepted by
 * browsers over https, which is exactly when it is used.
 */
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.SECURE_COOKIES,
  sameSite: env.isProduction ? 'none' : 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export const setAuthCookies = (res, tokens) => {
  const opts = cookieOptions();
  res.cookie(ADMIN_COOKIE, tokens.accessToken, { ...opts, maxAge: tokens.accessTokenMaxAge });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...opts, maxAge: tokens.refreshTokenMaxAge });
};

/** Both cookies are cleared with the flags they were set with, or the browser keeps them. */
export const clearAuthCookies = (res) => {
  const opts = cookieOptions();
  res.clearCookie(ADMIN_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
};

export const readAccessToken = (req) => req.cookies?.[ADMIN_COOKIE] || null;

export const readRefreshToken = (req) => req.cookies?.[REFRESH_COOKIE] || null;

const readToken = (req) => {
  const cookie = readAccessToken(req);
  if (cookie) return cookie;
  // Bearer is accepted so the API stays usable from non-browser clients.
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
};

/**
 * Attaches req.admin when a live session is present, but never blocks, so public
 * routes stay public. A cookie that has been tampered with, has expired, or whose
 * session was revoked is simply ignored here and the route guard sends it to login.
 */
export const attachAdmin = async (req, _res, next) => {
  try {
    const resolved = await resolveSession(readToken(req));
    if (!resolved) return next();
    req.admin = resolved.admin;
    req.adminSession = resolved.session;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAuth = (req, _res, next) => {
  if (!req.admin) return next(ApiError.unauthorized('Sign in to continue.', { code: 'unauthorized' }));
  if (!req.admin.isActive) return next(ApiError.forbidden('This account is inactive.', { code: 'account_inactive' }));
  return next();
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.admin) return next(ApiError.unauthorized('Sign in to continue.', { code: 'unauthorized' }));
  if (!roles.includes(req.admin.role)) {
    return next(ApiError.forbidden(`This action requires the ${roles.join(' or ')} role.`, { code: 'forbidden' }));
  }
  return next();
};

export const requirePermission = (permission) => (req, _res, next) => {
  if (!req.admin) return next(ApiError.unauthorized('Sign in to continue.', { code: 'unauthorized' }));
  if (!roleHasPermission(req.admin.role, permission)) {
    return next(ApiError.forbidden('Your role does not allow this action.', { code: 'forbidden' }));
  }
  return next();
};

export { PERMISSION };
