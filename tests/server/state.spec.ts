import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CookieStorageLabState } from '../../src/labs/cookie-storage/server/state.js';
import { SameSiteCsrfLabState } from '../../src/labs/samesite-csrf/server/state.js';
import { validateOrigin } from '../../src/labs/samesite-csrf/server/csrf.js';
import { tokenMatches } from '../../src/server/tokens.js';

test('Opaque credentials are independently generated; revocation affects the correct lab', () => {
  const cookie = new CookieStorageLabState(); const csrf = new SameSiteCsrfLabState();
  const session = cookie.createSession(); const bearer = cookie.createBearerToken();
  const other = csrf.createSession();
  assert.match(session, /^opaque_[a-f0-9]{64}$/);
  assert.match(bearer, /^bearer_[a-f0-9]{64}$/);
  assert.notEqual(cookie.createSession(), session);
  assert.equal(cookie.isSessionValid(bearer), false);
  cookie.reset();
  assert.equal(cookie.isSessionValid(session), false);
  assert.equal(cookie.isBearerValid(bearer), false);
  assert.ok(csrf.getSession(other.sessionToken));
});
test('Server expiration is independent of the browser cookie', () => {
  const state = new CookieStorageLabState();
  const token = state.createSession(-1);
  assert.equal(state.isSessionValid(token), false);
});
test('Tokens bind to sessions and Unicode input fails safely', () => {
  const state = new SameSiteCsrfLabState(); const a = state.createSession(); const b = state.createSession();
  assert.notEqual(a.csrfToken, b.csrfToken);
  assert.equal(tokenMatches(a.csrfToken, state.getSession(a.sessionToken)!.csrfToken), true);
  assert.equal(tokenMatches(b.csrfToken, state.getSession(a.sessionToken)!.csrfToken), false);
  assert.equal(tokenMatches('é'.repeat(64), a.csrfToken), false);
  assert.equal(tokenMatches({ token: a.csrfToken }, a.csrfToken), false);
  state.reset(); assert.equal(state.getSession(a.sessionToken), undefined);
});
test('Origin defense fails closed for missing and null origins despite a valid Referer', () => {
  for (const origin of [undefined, 'null', 'https://sibling.security-lab.test:8443',
    'https://app.security-lab.test:8443.evil.test']) {
    assert.equal(validateOrigin({ headers: { origin, referer: 'https://app.security-lab.test:8443/' } }).valid, false);
  }
  assert.equal(validateOrigin({ headers: { origin: 'https://app.security-lab.test:8443' } }).valid, true);
});
