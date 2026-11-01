import { Router, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { adminGuard, LEGITIMATE_ORIGIN } from '../../../server/middleware/admin-guard.js';
import type { InspectorContext } from '../../../server/middleware/inspector.js';
import { tokenMatches } from '../../../server/tokens.js';
import { jwtState, COOKIE_AUDIENCE } from './state.js';
import { demoUsers } from '../fixtures/accounts.js';
import { verifyExperiment, implementation, scenarios, type Scenario } from './verifiers.js';

export const jwtRouter = Router();
const inspect = (res: Response) => res.locals.inspector as InspectorContext;
const cookieOptions = { secure: true, sameSite: 'lax' as const, path: '/' };
const names = { readable: 'jwt_lab_readable', httponly: 'jwt_lab_httponly' };
function reset(res: Response) {
  jwtState.reset();
  for (const name of Object.values(names)) res.clearCookie(name, cookieOptions);
}
function snapshot(res: Response) {
  inspect(res).setStateBefore(jwtState.snapshot()); inspect(res).setStateAfter(jwtState.snapshot());
}
function reject(res: Response, status: number, error: unknown, rule: string, evidence: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  inspect(res).setProtectionDecision({ allowed: false, decision: 'rejected', ruleApplied: rule, reason: message });
  res.status(status).json({ error: message, rule, ...evidence });
}

jwtRouter.post('/login', adminGuard, (req, res) => {
  const { username, password, scenario = 'decode', padding = 0, ttl = 300 } = req.body;
  const user = demoUsers.find(u => u.username === username && u.password === password);
  if (!user) { res.status(401).json({ error: 'Use a published fictional lab account' }); return; }
  if (![...scenarios, 'size'].includes(scenario) || !Number.isInteger(padding) || padding < 0 || padding > 4096 ||
    !Number.isInteger(ttl) || ttl < 1 || ttl > 300) { res.status(400).json({ error: 'Invalid scenario, padding (0–4096), or TTL (1–300 seconds)' }); return; }
  const issued = jwtState.issue(user.username, scenario === 'confusion' ? 'RS256' : 'HS256', padding, ttl);
  res.json({ token: issued.token, user: issued.user, tokenBytes: Buffer.byteLength(issued.token), ttl });
});
jwtRouter.get('/public-key', (_req, res) => {
  res.type('text/plain').setHeader('Content-Disposition', 'attachment; filename="lab-public-key.pem"');
  res.send(jwtState.publicKey);
});

// #region dashboard
jwtRouter.get('/:scenario/dashboard/:variant', (req, res) => {
  const scenario = req.params.scenario as Scenario;
  const variant = req.params.variant;
  if (!scenarios.includes(scenario) || !['vulnerable', 'protected'].includes(variant)) { res.sendStatus(404); return; }
  snapshot(res);
  const info = implementation(scenario, variant);
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  try {
    const claims = verifyExperiment(token, scenario, variant as 'vulnerable' | 'protected');
    inspect(res).setAuthResult({ authenticated: true, identity: claims.sub, reason: info.rule });
    const wantsAdmin = req.query.view === 'admin';
    if (wantsAdmin && claims.role !== 'admin') {
      reject(res, 403, 'Authenticated user lacks the admin role', info.rule,
        { authenticated: true, role: claims.role, ...info, snapshot: jwtState.snapshot() }); return;
    }
    const users = jwtState.profile(claims, wantsAdmin);
    inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: info.rule });
    inspect(res).setStateAfter(jwtState.snapshot());
    res.json({ authenticated: true, role: claims.role, users, ...info, snapshot: jwtState.snapshot() });
  } catch (error) {
    inspect(res).setAuthResult({ authenticated: false, reason: 'Token rejected' });
    reject(res, 401, error, info.rule, { authenticated: false, ...info, snapshot: jwtState.snapshot() });
  }
});
// #endregion dashboard

// #region cookie-jwt
jwtRouter.post('/cookies/login', adminGuard, (_req, res) => {
  // Independent credentials; the readable cookie cannot disclose the HttpOnly token.
  for (const kind of ['readable', 'httponly'] as const) {
    const issued = jwtState.issue('adarsh', 'HS256', 0, 300, COOKIE_AUDIENCE);
    jwtState.csrfTokens.set(issued.jti, randomBytes(32).toString('hex'));
    res.cookie(names[kind], issued.token, { ...cookieOptions, httpOnly: kind === 'httponly' });
  }
  res.json({ user: 'adarsh', message: 'Two independent JWT cookies issued; no credential returned in JSON.' });
});
jwtRouter.get('/cookies/profile/:kind', (req, res) => {
  const kind = req.params.kind;
  if (kind !== 'readable' && kind !== 'httponly') { res.sendStatus(404); return; }
  snapshot(res);
  try {
    const claims = jwtState.verify(req.cookies[names[kind]] || '', 'HS256', COOKIE_AUDIENCE);
    inspect(res).setAuthResult({ authenticated: true, identity: claims.sub });
    inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: 'Cookie-only signed JWT' });
    res.json({ authenticated: true, user: claims.sub, preference: jwtState.preference });
  } catch (error) { reject(res, 401, error, 'Cookie-only signed JWT'); }
});
jwtRouter.get('/cookies/csrf-token', (req, res) => {
  snapshot(res);
  try {
    const claims = jwtState.verify(req.cookies[names.httponly] || '', 'HS256', COOKIE_AUDIENCE);
    inspect(res).setAuthResult({ authenticated: true, identity: claims.sub });
    inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: 'HttpOnly JWT + session-bound CSRF token' });
    res.json({ csrfToken: jwtState.csrfTokens.get(claims.jti) });
  } catch (error) { reject(res, 401, error, 'HttpOnly cookie authentication'); }
});
jwtRouter.post('/cookies/preference', (req, res) => {
  snapshot(res);
  let claims;
  try { claims = jwtState.verify(req.cookies[names.httponly] || '', 'HS256', COOKIE_AUDIENCE); }
  catch (error) { reject(res, 401, error, 'HttpOnly JWT'); return; }
  inspect(res).setAuthResult({ authenticated: true, identity: claims.sub });
  const expected = jwtState.csrfTokens.get(claims.jti);
  if (req.headers.origin !== LEGITIMATE_ORIGIN || !expected || !tokenMatches(req.headers['x-csrf-token'], expected)) {
    reject(res, 403, 'Exact Origin and session-bound CSRF token required', 'Origin + CSRF token'); return;
  }
  jwtState.preference = 'purple';
  inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: 'HttpOnly JWT + Origin + CSRF token' });
  inspect(res).setStateAfter(jwtState.snapshot());
  res.json({ success: true, preference: jwtState.preference });
});
// #endregion cookie-jwt

// #region token-size
jwtRouter.get('/size/verify', (req, res) => {
  const header = req.headers.authorization || '';
  snapshot(res);
  const start = performance.now();
  try {
    const claims = jwtState.verify(header.startsWith('Bearer ') ? header.slice(7) : '', 'HS256');
    const verificationMs = performance.now() - start;
    inspect(res).setAuthResult({ authenticated: true, identity: claims.sub });
    inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: 'Signed minimal-claims authentication; no profile lookup' });
    res.json({ authenticated: true, authorizationValueBytes: Buffer.byteLength(header), verificationMs,
      profileReadsBefore: jwtState.profileReads, profileReadsAfter: jwtState.profileReads,
      measurement: 'Authorization value only; excludes other headers, TLS and response bytes. One timing sample is not a benchmark.' });
  } catch (error) { reject(res, 401, error, 'HS256 + issuer + audience'); }
});
// #endregion token-size
jwtRouter.post('/state', adminGuard, (_req, res) => { res.json(jwtState.snapshot()); });
for (const path of ['/reset', '/logout']) jwtRouter.post(path, adminGuard, (_req, res) => {
  reset(res); res.json({ success: true, message: 'JWT lab keys rotated; all its issued credentials invalidated. Other labs unchanged.' });
});
