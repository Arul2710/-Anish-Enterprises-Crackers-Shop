import assert from 'node:assert/strict';

const store = new Map();
const listeners = new Map();
const localStorageStub = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};
globalThis.window = {
  localStorage: localStorageStub,
  addEventListener: (type, handler) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
  },
  removeEventListener: (type, handler) => listeners.get(type)?.delete(handler),
  dispatchEvent: (event) => {
    (listeners.get(event.type) || []).forEach((handler) => handler(event));
    return true;
  },
};
globalThis.localStorage = localStorageStub;

const ADMIN = { id: 'a1', name: 'Anish Enterprises', email: 'anishenterprisessvk@gmail.com', role: 'owner', active: true };
const broadcasts = (type) => (listeners.get(type)?.size || 0);

// Minimal fetch stub standing in for the API, so the auth service can be exercised
// without a browser or a running server. It only knows the endpoints the panel uses.
const json = (status, payload) => ({ ok: status < 400, status, async json() { return payload; } });

let sentWithCredentials = false;

globalThis.fetch = async (url, options = {}) => {
  sentWithCredentials = sentWithCredentials || options.credentials === 'include';
  const path = String(url).replace(/^.*\/api/, '');
  const body = options.body ? JSON.parse(options.body) : {};

  if (path === '/auth/login') {
    if (body.email === ADMIN.email && body.password === 'anish@1144') {
      store.set('mock-session', '1');
      return json(200, { success: true, data: { admin: ADMIN } });
    }
    return json(401, { success: false, error: { code: 'invalid_credentials', message: 'Invalid email or password.' } });
  }
  if (path === '/auth/me') {
    if (store.has('mock-session')) return json(200, { success: true, data: { admin: ADMIN } });
    return json(401, { success: false, error: { code: 'unauthorized', message: 'Sign in to continue.' } });
  }
  if (path === '/auth/logout' || path === '/auth/sign-out-everywhere') {
    store.delete('mock-session');
    return json(200, { success: true, data: { signedOut: true } });
  }
  throw new Error(`unexpected request ${options.method || 'GET'} ${path}`);
};

const auth = await import('../src/services/auth.js');

const results = [];
const check = async (name, run) => {
  try {
    await run();
    results.push(`PASS  ${name}`);
  } catch (error) {
    results.push(`FAIL  ${name}: ${error.message}`);
  }
};

await check('no session is present before sign in', () => {
  assert.equal(auth.currentAdminUser(), null);
});

await check('an unknown email is refused with the generic message', async () => {
  const result = await auth.login('someone@example.com', 'anish@1144');
  assert.equal(result.ok, false);
  assert.match(result.error, /Invalid email or password/i);
  assert.equal(auth.currentAdminUser(), null, 'no session is created');
});

await check('a wrong password is refused', async () => {
  const result = await auth.login(ADMIN.email, 'wrong-password');
  assert.equal(result.ok, false);
  assert.match(result.error, /Invalid email or password/i);
  assert.equal(auth.currentAdminUser(), null);
});

await check('the exact credentials sign in and start a session', async () => {
  const result = await auth.login(ADMIN.email, 'anish@1144');
  assert.equal(result.ok, true);
  assert.equal(result.user.role, 'owner');
  assert.equal(result.user.email, ADMIN.email);
  assert.ok(auth.currentAdminUser(), 'the session is remembered');
  assert.ok(localStorageStub.getItem(auth.adminSessionStorageKey), 'the session record is written');
});

await check('the password is never written to storage', () => {
  for (const key of store.keys()) {
    assert.ok(!String(store.get(key)).includes('anish@1144'), `the password leaked into ${key}`);
  }
});

await check('a refresh restores the session from the API', async () => {
  const restored = await auth.fetchMe();
  assert.equal(restored.ok, true);
  assert.equal(restored.user.email, ADMIN.email);
  assert.equal(sentWithCredentials, true, 'requests are sent with the session cookie');
});

await check('logging out clears the session', async () => {
  await auth.logout();
  assert.equal(auth.currentAdminUser(), null);
  assert.equal(localStorageStub.getItem(auth.adminSessionStorageKey), null);
});

await check('a session that has expired is cleared', async () => {
  await auth.login(ADMIN.email, 'anish@1144');
  const session = JSON.parse(localStorageStub.getItem(auth.adminSessionStorageKey));
  localStorageStub.setItem(auth.adminSessionStorageKey, JSON.stringify({ ...session, expiresAt: Date.now() - 1000 }));
  assert.equal(auth.currentAdminUser(), null, 'an expired session does not sign anyone in');
  assert.equal(localStorageStub.getItem(auth.adminSessionStorageKey), null, 'the stale session is removed');
});

await check('signing out everywhere clears the session', async () => {
  await auth.login(ADMIN.email, 'anish@1144');
  await auth.signOutEverywhere();
  assert.equal(auth.currentAdminUser(), null);
});

await check('permissions follow the role', () => {
  const owner = { role: 'owner' };
  const staff = { role: 'staff' };
  assert.equal(auth.can(owner, 'settings.view'), true);
  assert.equal(auth.can(staff, 'orders.edit'), true);
  assert.equal(auth.can(staff, 'settings.view'), false);
  assert.equal(auth.can(staff, 'products.edit'), false);
  assert.equal(auth.can(null, 'orders.view'), false);
});

await check('a session change reaches every listener', async () => {
  const seen = [];
  const stop = auth.onSessionChanged(() => seen.push('refresh'));
  assert.ok(broadcasts('storage') > 0, 'listening for changes in other tabs is set up');
  assert.ok(broadcasts('spark-shine-admin-session-changed') > 0, 'listening for changes in this tab is set up');
  await auth.login(ADMIN.email, 'anish@1144');
  await auth.logout();
  assert.ok(seen.length >= 2, `signing in and out both notify, got ${seen.length}`);
  stop();
  assert.equal(broadcasts('storage'), 0, 'unsubscribing clears the tab listener');
  assert.equal(broadcasts('spark-shine-admin-session-changed'), 0, 'unsubscribing clears the local listener');
});

console.log(results.join('\n'));
const failed = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
