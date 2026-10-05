/**
 * Admin sign-in tests.
 *
 * The panel has one owner whose credentials are fixed in the API, so these cover
 * the three things that decide whether anyone can get in: the credential
 * comparison, the session lifecycle behind the httpOnly cookie, and the throttle
 * on repeated failures. No database is opened and the API is never bound, so
 * `npm test` stays fast and works on a fresh clone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// env.js is validated on import, so the values a real run needs must be set first.
process.env.NODE_ENV ||= 'test';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/anish_enterprises_test';
process.env.JWT_SECRET ||= 'test_only_secret_that_is_definitely_long_enough_32';

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ID, adminPrincipal, publicAdminView, verifyAdminCredentials } = await import(
  '../src/config/adminCredentials.js'
);
const {
  adminView,
  assertCredentials,
  clearFailedAttempts,
  endSession,
  isLockedOut,
  lockoutSecondsRemaining,
  refreshSession,
  registerFailedAttempt,
  resolveSession,
  revokeAllSessions,
  sessionIdOf,
  startSession,
} = await import('../src/services/auth.service.js');

test('the configured credentials are the exact pair that was asked for', () => {
  assert.equal(ADMIN_EMAIL, 'anishenterprisessvk@gmail.com');
  assert.equal(ADMIN_PASSWORD, 'anish@1144');
});

test('only the exact pair is accepted, and case plus whitespace on the email is forgiven', () => {
  assert.equal(verifyAdminCredentials(ADMIN_EMAIL, ADMIN_PASSWORD), true);
  assert.equal(verifyAdminCredentials('  AnishEnterprisesSVK@Gmail.com  ', ADMIN_PASSWORD), true);
});

test('a wrong email, a wrong password or a near miss is refused', () => {
  assert.equal(verifyAdminCredentials('someone@example.com', ADMIN_PASSWORD), false);
  assert.equal(verifyAdminCredentials(ADMIN_EMAIL, 'anish@1145'), false);
  assert.equal(verifyAdminCredentials(ADMIN_EMAIL, 'ANISH@1144'), false, 'the password is case sensitive');
  assert.equal(verifyAdminCredentials(ADMIN_EMAIL, ' anish@1144'), false, 'the password is not trimmed');
  assert.equal(verifyAdminCredentials(ADMIN_EMAIL, ''), false);
  assert.equal(verifyAdminCredentials('', ''), false);
  assert.equal(verifyAdminCredentials(undefined, undefined), false);
});

test('assertCredentials hands back a principal only for the right pair', () => {
  assert.deepEqual(assertCredentials('someone@example.com', 'anish@1144'), { admin: null, valid: false });
  assert.equal(assertCredentials(ADMIN_EMAIL, 'wrong').valid, false);
  const good = assertCredentials(ADMIN_EMAIL, ADMIN_PASSWORD);
  assert.equal(good.valid, true);
  assert.equal(good.admin.id, ADMIN_ID);
  assert.equal(good.admin.role, 'owner');
  assert.equal(good.admin.isLocked(), false, 'the owner is never locked out of the account itself');
});

test('the view sent to the browser carries no credential material', () => {
  const view = publicAdminView(adminPrincipal());
  assert.equal(view.role, 'owner');
  assert.equal(view.email, ADMIN_EMAIL);
  const serialised = JSON.stringify(view).toLowerCase();
  for (const secret of [ADMIN_PASSWORD.toLowerCase(), 'passwordhash', 'password', 'token', 'secret']) {
    assert.ok(!serialised.includes(secret), `the public view must not contain ${secret}`);
  }
});

test('a session resolves to the owner and can be revoked', async () => {
  const { tokens, sessionId, admin } = await startSession({ ip: '127.0.0.1' });
  assert.ok(tokens.accessToken && tokens.refreshToken);
  assert.ok(tokens.accessTokenMaxAge > 0 && tokens.refreshTokenMaxAge > tokens.accessTokenMaxAge);

  const resolved = await resolveSession(tokens.accessToken);
  assert.ok(resolved, 'the access token resolves while the session is live');
  assert.equal(resolved.admin.id, ADMIN_ID);
  assert.equal(resolved.session.id, sessionId);
  assert.equal(resolved.session.ip, '127.0.0.1');
  assert.equal(admin.id, ADMIN_ID);

  // The refresh cookie is what survives a reload, so it must resolve too.
  const refreshed = await refreshSession(tokens.refreshToken);
  assert.ok(refreshed, 'a live session can be refreshed');
  assert.ok(refreshed.tokens.accessToken);
});

test('a token with no session, or a forged one, resolves to nothing', async () => {
  assert.equal(await resolveSession(null), null);
  assert.equal(await resolveSession('not-a-token'), null);
  assert.equal(await resolveSession('a.b.c'), null);
  // A correctly signed token whose session was never registered must not pass.
  const { tokens } = await startSession();
  await endSession(sessionIdOf(tokens.accessToken));
  assert.equal(await resolveSession(tokens.accessToken), null, 'a revoked session is refused');
  assert.equal(await refreshSession(tokens.refreshToken), null, 'and so is a refresh for it');
});

test('logging out invalidates the session, so a copied cookie stops working', async () => {
  const { tokens } = await startSession();
  const stolen = tokens.accessToken;
  assert.ok(await resolveSession(stolen), 'the session works before the logout');

  await endSession(sessionIdOf(stolen));

  assert.equal(await resolveSession(stolen), null, 'the token is refused after the logout');
  assert.equal(await refreshSession(tokens.refreshToken), null);
  // Replaying the same cookie after a fresh sign-in must not resurrect it.
  const next = await startSession();
  assert.ok(await resolveSession(next.tokens.accessToken));
  assert.equal(await resolveSession(stolen), null);
});

test('an access token cannot be used where a refresh token is expected', async () => {
  const { tokens } = await startSession();
  assert.equal(await refreshSession(tokens.accessToken), null, 'token types are not interchangeable');
  assert.equal(await refreshSession(null), null);
  assert.equal(sessionIdOf('garbage'), null);
});

test('signing out everywhere clears every live session', async () => {
  await startSession();
  const second = await startSession();
  assert.ok(await resolveSession(second.tokens.accessToken));
  assert.ok(await revokeAllSessions() >= 1);
  assert.equal(await resolveSession(second.tokens.accessToken), null);
  assert.equal(await refreshSession(second.tokens.refreshToken), null);
});

test('the admin view is the owner with the session sign-in time', async () => {
  const { sessionId } = await startSession();
  const view = adminView({ lastLoginAt: '2026-09-30T10:00:00.000Z' });
  assert.equal(view.role, 'owner');
  assert.equal(view.email, ADMIN_EMAIL);
  assert.equal(view.lastLoginAt, '2026-09-30T10:00:00.000Z');
  assert.equal(view.id, ADMIN_ID);
  assert.ok(sessionId);
});

test('repeated failures lock sign-in, and a correct password clears the count', () => {
  const key = '192.0.2.10:nobody@example.com';
  clearFailedAttempts(key);
  assert.equal(isLockedOut(key), false);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    registerFailedAttempt(key);
    assert.equal(isLockedOut(key), false, `attempt ${attempt + 1} must not lock yet`);
  }

  registerFailedAttempt(key);
  assert.equal(isLockedOut(key), true, 'the fifth failure locks the key');
  assert.ok(lockoutSecondsRemaining(key) > 0, 'the lockout reports how long to wait');

  clearFailedAttempts(key);
  assert.equal(isLockedOut(key), false, 'a successful sign-in clears the record');
});

test('one caller tripping the lockout does not lock another', () => {
  const noisy = '198.51.100.7:admin@example.com';
  const other = '198.51.100.8:admin@example.com';
  clearFailedAttempts(noisy);
  clearFailedAttempts(other);
  for (let attempt = 0; attempt < 5; attempt += 1) registerFailedAttempt(noisy);
  assert.equal(isLockedOut(noisy), true);
  assert.equal(isLockedOut(other), false, 'the throttle is per caller, not global');
  clearFailedAttempts(noisy);
});

