import { Router, type Request, type Response } from 'express';
import { labState } from './state.js';
import { adminGuard, LEGITIMATE_ORIGIN } from '../../../server/middleware/admin-guard.js';
import { tokenMatches } from '../../../server/tokens.js';
import type { InspectorContext } from '../../../server/middleware/inspector.js';

export const cookieStorageRouter = Router();
const inspect = (res: Response) => res.locals.inspector as InspectorContext;
const baseCookie = { secure: true, sameSite: 'lax' as const, path: '/' };

function clearCookies(res: Response) {
  for (const name of ['session_httponly', 'session_readable', 'secure_session', 'plain_diagnostic',
    'cookie_host_only', 'cookie_session_lifecycle', 'cookie_persistent_5s', 'server_expiry_session']) {
    res.clearCookie(name, { ...baseCookie });
  }
  res.clearCookie('cookie_parent_domain', { ...baseCookie, domain: 'security-lab.test' });
  res.clearCookie('cookie_path_restricted', { ...baseCookie, path: '/api/labs/cookie-storage/subpath' });
}

// #region issue-credentials
cookieStorageRouter.post('/login', adminGuard, (_req, res) => {
  labState.reset(); // Reconfiguration invalidates every previous credential.
  clearCookies(res);
  const sessionToken = labState.createSession();
  // These are deliberately DIFFERENT credentials: the readable cookie must not reveal the HttpOnly value.
  const readableToken = labState.createBearerToken();
  const bearerToken = labState.createBearerToken();
  res.cookie('session_httponly', sessionToken, { ...baseCookie, httpOnly: true });
  res.cookie('session_readable', readableToken, { ...baseCookie, httpOnly: false });
  res.cookie('secure_session', 'harmless_transport_marker', { ...baseCookie, httpOnly: true });
  res.cookie('plain_diagnostic', 'harmless_positive_control', { path: '/', sameSite: 'lax' });
  res.json({ success: true, bearerToken, user: labState.user });
});
// #endregion issue-credentials

// #region authentication
function profile(req: Request, res: Response, kind: 'cookie' | 'bearer' | 'readable' | 'expiry') {
  const suppliedBearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
  const authenticated = kind === 'cookie' ? labState.isSessionValid(req.cookies.session_httponly)
    : kind === 'expiry' ? labState.isSessionValid(req.cookies.server_expiry_session)
    : labState.isBearerValid(kind === 'bearer' ? suppliedBearer : req.cookies.session_readable);
  inspect(res).setAuthResult({ authenticated, identity: authenticated ? 'alice' : undefined });
  inspect(res).setProtectionDecision({ allowed: authenticated, decision: authenticated ? 'allowed' : 'rejected', ruleApplied: kind });
  inspect(res).setStateBefore({ user: labState.user });
  inspect(res).setStateAfter({ user: labState.user });
  res.status(authenticated ? 200 : 401).json({ authenticated, authMethod: kind, ...(authenticated && { user: labState.user }) });
}

cookieStorageRouter.get('/profile', (req, res) => profile(req, res, 'cookie'));
cookieStorageRouter.get('/bearer-profile', (req, res) => profile(req, res, 'bearer'));
cookieStorageRouter.get('/readable-profile', (req, res) => profile(req, res, 'readable'));
cookieStorageRouter.get('/expired-profile', (req, res) => profile(req, res, 'expiry'));

cookieStorageRouter.get('/csrf-token', (req, res) => {
  const session = labState.getSession(req.cookies.session_httponly);
  if (!session) { res.status(401).json({ error: 'Login first' }); return; }
  res.json({ csrfToken: session.csrfToken });
});

cookieStorageRouter.post('/profile/update', (req, res) => {
  const before = { user: { ...labState.user } };
  inspect(res).setStateBefore(before);
  inspect(res).setStateAfter(before);
  const session = labState.getSession(req.cookies.session_httponly);
  inspect(res).setAuthResult({ authenticated: Boolean(session), identity: session ? 'alice' : undefined });
  if (!session) { res.status(401).json({ error: 'Authentication required' }); return; }
  const token = req.headers['x-csrf-token'];
  const validToken = tokenMatches(token, session.csrfToken);
  if (req.headers.origin !== LEGITIMATE_ORIGIN || !validToken) {
    inspect(res).setProtectionDecision({ allowed: false, decision: 'rejected', reason: 'Origin and CSRF token required' });
    res.status(403).json({ error: 'Origin and CSRF token required' }); return;
  }
  if (typeof req.body.email !== 'string' || req.body.email.length > 120) {
    res.status(400).json({ error: 'A dummy email up to 120 characters is required' }); return;
  }
  labState.user.email = req.body.email; // Only the harmless email field is editable.
  inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: 'Session + Origin + CSRF token' });
  inspect(res).setStateAfter({ user: { ...labState.user } });
  res.json({ success: true, message: 'Profile updated with session, origin and token checks.', user: labState.user });
});
// #endregion authentication

// #region scope
cookieStorageRouter.post('/cookies/scope-test', adminGuard, (_req, res) => {
  res.cookie('cookie_host_only', 'host_marker', baseCookie);
  res.cookie('cookie_parent_domain', 'domain_marker', { ...baseCookie, domain: 'security-lab.test' });
  res.cookie('cookie_path_restricted', 'path_marker', { ...baseCookie, path: '/api/labs/cookie-storage/subpath' });
  res.json({ success: true, message: 'Scoped cookies set. Compare the two paths and the sibling page.' });
});
cookieStorageRouter.get(['/subpath/check', '/outside/check', '/transport'], (req, res) => {
  res.json({ path: req.originalUrl, cookiesReceived: Object.keys(req.cookies) });
});
// #endregion scope

// #region lifecycles
cookieStorageRouter.post('/cookies/lifecycles', adminGuard, (_req, res) => {
  res.cookie('cookie_session_lifecycle', 'session_marker', baseCookie);
  res.cookie('cookie_persistent_5s', 'persistent_marker', { ...baseCookie, maxAge: 5000 });
  // Browser cookie stays alive; the server stops accepting this session after three seconds.
  res.cookie('server_expiry_session', labState.createSession(3), { ...baseCookie, httpOnly: true });
  res.json({ success: true, message: 'Session cookie, Max-Age=5s cookie and server TTL=3s session issued.' });
});
// #endregion lifecycles

cookieStorageRouter.post('/logout', adminGuard, (_req, res) => {
  labState.reset();
  clearCookies(res);
  res.json({ success: true, message: 'Logged out! All Lab 1 credentials revoked and cookies cleared.' });
});
cookieStorageRouter.post('/reset', adminGuard, (_req, res) => {
  labState.reset();
  clearCookies(res);
  res.json({ success: true, message: 'Lab 1 reset; other labs are unchanged.' });
});
