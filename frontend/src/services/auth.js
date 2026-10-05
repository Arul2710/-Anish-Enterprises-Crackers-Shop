/**
 * API-backed authentication service for the admin panel.
 *
 * The earlier implementation stored hashed passwords in localStorage and created
 * sessions entirely in the browser. That is replaced here with a thin client over
 * the backend /api/auth endpoints, using an HttpOnly session cookie.
 *
 * No credentials ever enter localStorage, sessionStorage or the page source. The
 * session lives in a cookie that scripts cannot read, so a refresh keeps the
 * operator signed in until the cookie expires, and logout invalidates the session
 * on the server.
 */
import { readStorage, writeStorage, clearStorage } from '../utils/storage';

// Optional chaining keeps this usable outside a Vite build, where import.meta.env
// is not defined, so the service can be exercised directly by the smoke tests.
const API_BASE = import.meta.env?.VITE_API_URL || '/api';

export const adminSessionStorageKey = 'spark-shine-admin-session';

/** Remembers who was last signed in, so a reload can render the panel before /me answers. */
const cachedUserKey = 'spark-shine-admin-current-user';

/** How long the client believes the session lasts before asking the API again. */
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;

export const adminRoles = ['owner', 'admin', 'staff'];

export const roleLabels = { owner: 'Owner', admin: 'Administrator', staff: 'Staff' };

/** Capability list per role. The layout uses this for gating nav items. */
export const rolePermissions = {
  owner: ['*'],
  admin: [
    'dashboard.view',
    'orders.view',
    'orders.edit',
    'products.view',
    'products.edit',
    'categories.view',
    'categories.edit',
    'packs.view',
    'packs.edit',
    'customers.view',
    'reports.view',
    'contact.edit',
    'settings.view',
  ],
  staff: ['dashboard.view', 'orders.view', 'orders.edit', 'products.view', 'categories.view', 'packs.view', 'customers.view'],
};

export const can = (user, permission) => {
  if (!user) return false;
  const grants = rolePermissions[user.role] || [];
  return grants.includes('*') || grants.includes(permission);
};

const FALLBACK_ALERT = 'admin-alert';
const SESSION_CHANGED = 'spark-shine-admin-session-changed';

export const onAuthAlert = (handler) => {
  if (typeof window === 'undefined') return () => {};
  const listener = (event) => handler(event.detail);
  window.addEventListener(FALLBACK_ALERT, listener);
  return () => window.removeEventListener(FALLBACK_ALERT, listener);
};

export const onSessionChanged = (handler) => {
  if (typeof window === 'undefined') return () => {};
  const fromOtherTab = (event) => {
    if (!event.key || event.key === adminSessionStorageKey) handler();
  };
  const fromThisTab = () => handler();
  window.addEventListener('storage', fromOtherTab);
  window.addEventListener(SESSION_CHANGED, fromThisTab);
  return () => {
    window.removeEventListener('storage', fromOtherTab);
    window.removeEventListener(SESSION_CHANGED, fromThisTab);
  };
};

const announceSession = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_CHANGED));
};

/**
 * Every call carries `credentials: 'include'` so the browser attaches the HttpOnly
 * session cookie. The cookie itself is unreadable from script by design.
 */
const request = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    // Required for the session cookie to travel with the request.
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { ok: response.ok, status: response.status, data: payload?.data ?? null, error: payload?.error ?? null };
};

/** Hides the API payload shape from the rest of the UI. */
const normaliseUser = (payload) => {
  if (!payload || typeof payload !== 'object' || !payload.id) return null;
  return {
    id: String(payload.id),
    name: String(payload.name || ''),
    email: String(payload.email || '').trim().toLowerCase(),
    phone: String(payload.phone || ''),
    role: adminRoles.includes(payload.role) ? payload.role : 'staff',
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    active: payload.active !== false,
    lastLoginAt: String(payload.lastLoginAt || ''),
    createdAt: String(payload.createdAt || ''),
  };
};

/**
 * A lightweight record of the session is kept in localStorage purely so a reload
 * can show the panel before /me answers. Nothing secret is written here, and the
 * server remains the only authority: if the cookie is gone, this is discarded.
 */
const readSessionRecord = () => {
  const session = readStorage(adminSessionStorageKey, null);
  if (!session || typeof session !== 'object' || !session.userId) return null;
  if (Number(session.expiresAt) < Date.now()) {
    clearStorage(adminSessionStorageKey);
    return null;
  }
  return session;
};

const rememberSession = (user) => {
  const now = Date.now();
  writeStorage(cachedUserKey, user);
  writeStorage(adminSessionStorageKey, {
    userId: String(user.id),
    issuedAt: new Date(now).toISOString(),
    expiresAt: now + SESSION_DURATION_MS,
  });
  announceSession();
};

const forgetSession = () => {
  clearStorage(cachedUserKey);
  clearStorage(adminSessionStorageKey);
  announceSession();
};

export const currentAdminUser = () => {
  const session = readSessionRecord();
  if (!session) return null;
  const cached = normaliseUser(readStorage(cachedUserKey, null));
  if (!cached || cached.id !== session.userId) return null;
  return cached;
};

/**
 * Asks the API whether a session is still live. useAdminAuth calls this on load so
 * a browser refresh does not force the operator to sign in again, and so a session
 * revoked elsewhere closes the panel on the next load.
 */
export const fetchMe = async () => {
  try {
    const result = await request('/auth/me');
    const user = result.ok ? normaliseUser(result.data?.admin) : null;
    if (!user || !user.active) {
      forgetSession();
      return { ok: false, user: null };
    }
    rememberSession(user);
    return { ok: true, user };
  } catch {
    // Offline or the API is unreachable: treat it as signed out rather than
    // leaving a stale panel on screen.
    forgetSession();
    return { ok: false, user: null };
  }
};

export const login = async (email, password) => {
  let result;
  try {
    result = await request('/auth/login', {
      method: 'POST',
      body: { email: String(email || '').trim(), password: String(password || '') },
    });
  } catch {
    return { ok: false, error: 'The admin service could not be reached. Try again shortly.' };
  }

  if (!result.ok) {
    // The server answers a wrong address and a wrong password identically, so this
    // message never reveals whether an admin account exists.
    return { ok: false, error: result.error?.message || 'Invalid email or password.' };
  }

  const user = normaliseUser(result.data?.admin);
  if (!user) return { ok: false, error: 'Sign in failed. Try again.' };

  rememberSession(user);
  return { ok: true, user };
};

export const logout = async () => {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // The server is the authority on the session. If it cannot be reached the
    // local record is still cleared so the panel does not stay open in this tab.
  }
  forgetSession();
  return true;
};

/** Invalidates the session on every device, not just this browser. */
export const signOutEverywhere = async () => {
  try {
    await request('/auth/sign-out-everywhere', { method: 'POST' });
  } catch {
    // Same reasoning as logout.
  }
  forgetSession();
  return true;
};
