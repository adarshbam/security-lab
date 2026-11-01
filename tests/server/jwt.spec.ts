import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import jwt2015 from 'jsonwebtoken-2015';
import jwt2022 from 'jsonwebtoken-2022';
import { JwtLabState, AUDIENCE, COOKIE_AUDIENCE, ISSUER } from '../../src/labs/exployting-jwt-tokens/server/state.js';

const require = createRequire(import.meta.url);

test('Installed historical verifier accepts RSA/HMAC confusion while fixed algorithm verification rejects it', () => {
  const state = new JwtLabState();
  assert.equal(require('jsonwebtoken-2015/package.json').version, '4.0.0');
  const signed = state.issue('adarsh', 'RS256').token;
  assert.equal((jwt2015.verify(signed, state.publicKey, { issuer: ISSUER, audience: AUDIENCE }) as jwt.JwtPayload).sub, 'adarsh');
  assert.equal(state.verify(signed, 'RS256').role, 'user');
  const payload = { ...(jwt.decode(signed) as jwt.JwtPayload), role: 'admin' };
  const hmac = jwt.sign(payload, state.publicKey, { algorithm: 'HS256' });
  assert.equal((jwt2015.verify(hmac, state.publicKey, { issuer: ISSUER, audience: AUDIENCE }) as jwt.JwtPayload).role, 'admin');
  assert.throws(() => state.verify(hmac, 'RS256'));
  const differentPem = jwt.sign(payload, state.publicKey + ' ', { algorithm: 'HS256' });
  assert.throws(() => jwt2015.verify(differentPem, state.publicKey, { issuer: ISSUER, audience: AUDIENCE }));
});

test('The 8.5.1 unsigned-token issue requires a falsy key and an omitted algorithm restriction', () => {
  assert.equal(require('jsonwebtoken-2022/package.json').version, '8.5.1');
  assert.equal(require('jsonwebtoken/package.json').version, '9.0.3');
  const state = new JwtLabState();
  const signed = state.issue('adarsh', 'HS256').token;
  const payload = { ...(jwt.decode(signed) as jwt.JwtPayload), role: 'admin' };
  const unsigned = jwt.sign(payload, null, { algorithm: 'none' });
  assert.equal((jwt2022.verify(unsigned, null) as jwt.JwtPayload).role, 'admin');
  assert.throws(() => jwt2022.verify(signed, null));
  assert.throws(() => jwt2022.verify(unsigned, state.secret));
  assert.throws(() => jwt2022.verify(unsigned, null, { algorithms: ['HS256'] }));
  assert.throws(() => jwt.verify(unsigned, null as unknown as jwt.Secret));
  assert.throws(() => state.verify(unsigned, 'HS256'));
  assert.equal(state.verify(signed, 'HS256').role, 'user');
});

test('Protected verification enforces issuer, audience, expiration, not-before and algorithm with validly signed claims', () => {
  const state = new JwtLabState();
  const issued = state.issue('adarsh', 'HS256').token;
  const payload = jwt.decode(issued) as jwt.JwtPayload;
  for (const changed of [
    { iss: 'https://untrusted.example.test' }, { aud: COOKIE_AUDIENCE },
    { exp: 1 }, { nbf: Math.floor(Date.now() / 1000) + 3600 },
    { sub: 'missing-user' }, { role: 'owner' }, { epoch: 'old-generation' },
  ]) {
    const token = jwt.sign({ ...payload, ...changed }, state.secret, { algorithm: 'HS256' });
    assert.throws(() => state.verify(token, 'HS256'), JSON.stringify(changed));
  }
  assert.throws(() => state.verify(jwt.sign(payload, state.secret, { algorithm: 'HS384' }), 'HS256'));
  for (const token of ['', 'not.a.jwt', issued + '.extra']) assert.throws(() => state.verify(token, 'HS256'));
  assert.equal(state.verify(issued, 'HS256').sub, 'adarsh');
  assert.deepEqual(state.snapshot(), { adminReads: 0, profileReads: 0, preference: 'blue' });
});

test('Independent cookie JWTs cannot authenticate the bearer audience; reset invalidates each credential family', () => {
  const state = new JwtLabState();
  const readable = state.issue('adarsh', 'HS256', 0, 300, COOKIE_AUDIENCE);
  const hidden = state.issue('adarsh', 'HS256', 0, 300, COOKIE_AUDIENCE);
  const bearer = state.issue('adarsh', 'HS256');
  const rsa = state.issue('rahul', 'RS256');
  const publicKey = state.publicKey;
  assert.notEqual(readable.token, hidden.token); assert.notEqual(readable.jti, hidden.jti);
  assert.throws(() => state.verify(readable.token, 'HS256'));
  assert.throws(() => state.verify(bearer.token, 'HS256', COOKIE_AUDIENCE));
  assert.equal(state.verify(hidden.token, 'HS256', COOKIE_AUDIENCE).sub, 'adarsh');
  state.csrfTokens.set(hidden.jti, 'fictional-csrf-token'); state.preference = 'purple';
  state.profile(state.verify(rsa.token, 'RS256'), true);
  state.reset();
  assert.notEqual(state.publicKey, publicKey);
  assert.equal(state.csrfTokens.size, 0);
  assert.deepEqual(state.snapshot(), { adminReads: 0, profileReads: 0, preference: 'blue' });
  for (const token of [readable.token, hidden.token]) assert.throws(() => state.verify(token, 'HS256', COOKIE_AUDIENCE));
  assert.throws(() => state.verify(bearer.token, 'HS256'));
  assert.throws(() => state.verify(rsa.token, 'RS256'));
  assert.equal(state.verify(state.issue('adarsh', 'HS256').token, 'HS256').sub, 'adarsh');
});

test('Authentication does not perform profile reads, and directory projections never return demo passwords', () => {
  const state = new JwtLabState();
  const small = state.issue('adarsh', 'HS256');
  const large = state.issue('adarsh', 'HS256', 4096);
  assert.ok(Buffer.byteLength(large.token) > Buffer.byteLength(small.token) + 4096);
  const claims = state.verify(large.token, 'HS256');
  assert.equal(state.profileReads, 0);
  const profile = state.profile(claims);
  assert.deepEqual(profile, [{ username: 'adarsh', role: 'user', email: 'adarsh@example.test' }]);
  assert.equal(state.profileReads, 1); assert.equal(state.adminReads, 0);
  const directory = state.profile(state.verify(state.issue('rahul', 'HS256').token, 'HS256'), true);
  assert.equal(directory.length, 10); assert.equal(state.profileReads, 2); assert.equal(state.adminReads, 1);
  assert.ok(directory.every(user => !Object.hasOwn(user, 'password')));
});
