import { Router, type Request, type Response } from 'express';
import { labState, type SameSiteMode } from './state.js';
import { validateOrigin } from './csrf.js';
import { adminGuard } from '../../../server/middleware/admin-guard.js';
import { tokenMatches } from '../../../server/tokens.js';
import { escapeHtml } from '../../../server/html.js';
import type { InspectorContext } from '../../../server/middleware/inspector.js';

export const samesiteCsrfRouter = Router();
const inspect = (res: Response) => res.locals.inspector as InspectorContext;
const cookieOptions = { secure: true, httpOnly: true, path: '/' };

function result(req: Request, res: Response, status: number, data: Record<string, unknown>) {
  if (!req.headers.accept?.includes('text/html')) { res.status(status).json(data); return; }
  res.status(status).type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8">
    <meta name="viewport" content="width=device-width"><title>Experiment result</title>
    <style>body{background:#020617;color:#e2e8f0;font:16px system-ui;max-width:850px;margin:60px auto;padding:24px}
    pre{white-space:pre-wrap;padding:24px;border:1px solid #334155;border-radius:16px}a{color:#38bdf8}</style>
    <h1>${status === 200 ? 'Operation Processed' : 'Operation Blocked / Rejected'} (Status: ${status})</h1>
    <p>This is the original request result. Inspect its headers in your learner workspace.</p>
    <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre><p>Close this tab to return to your experiment.</p></html>`);
}

// #region configure
samesiteCsrfRouter.post('/configure-cookie', adminGuard, (req, res) => {
  const mode = req.body.mode;
  if (!['strict', 'lax', 'none'].includes(mode)) { res.status(400).json({ error: 'Choose strict, lax or none' }); return; }
  labState.reset(); // Reconfiguration revokes previous credentials and tokens.
  labState.cookieMode = mode as SameSiteMode;
  const { sessionToken } = labState.createSession();
  res.cookie('session_csrf', sessionToken, { ...cookieOptions, sameSite: mode });
  res.json({ success: true, mode, message: `Cookie session_csrf issued with SameSite=${mode.toUpperCase()}; Secure; HttpOnly.` });
});
// #endregion configure

samesiteCsrfRouter.get('/csrf-token', (req, res) => {
  const session = labState.getSession(req.cookies.session_csrf);
  if (!session) { res.status(401).json({ error: 'Configure a session first' }); return; }
  res.json({ csrfToken: session.csrfToken });
});

// #region mutations
type Defense = 'vulnerable' | 'token' | 'origin' | 'combined';
function mutate(defense: Defense) {
  return (req: Request, res: Response) => {
    const before = { preferences: { ...labState.preferences } };
    inspect(res).setStateBefore(before);
    inspect(res).setStateAfter(before);
    const session = labState.getSession(req.cookies.session_csrf);
    inspect(res).setAuthResult({ authenticated: Boolean(session), identity: session ? 'learner' : undefined,
      reason: session ? 'Valid cookie arrived' : 'No valid session cookie arrived' });
    const reject = (status: number, reason: string) => {
      inspect(res).setProtectionDecision({ allowed: false, decision: 'rejected', reason, ruleApplied: defense });
      result(req, res, status, { success: false, error: reason });
    };
    if (!session) { reject(401, 'Unauthenticated: no valid session cookie'); return; }

    // Authentication happens BEFORE defense checks, so 403 proves an authenticated request was rejected.
    if ((defense === 'origin' || defense === 'combined') && !validateOrigin(req).valid) {
      reject(403, 'Origin check failed'); return;
    }
    if ((defense === 'token' || defense === 'combined') &&
        !tokenMatches(req.body.csrfToken || req.headers['x-csrf-token'], session.csrfToken)) {
      reject(403, 'Missing or mismatched session-bound CSRF token'); return;
    }
    const email = req.method === 'GET' ? req.query.email : req.body.email;
    if (typeof email !== 'string' || email.length > 120) { reject(400, 'Dummy email must be a string up to 120 characters'); return; }
    labState.updatePreferences({ email }, `${defense} endpoint`);
    inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: defense });
    inspect(res).setStateAfter({ preferences: { ...labState.preferences } });
    result(req, res, 200, { success: true, preferences: labState.preferences });
  };
}
for (const defense of ['vulnerable', 'token', 'origin', 'combined'] as const) {
  samesiteCsrfRouter.post(`/update-${defense}`, mutate(defense));
  samesiteCsrfRouter.get(`/update-${defense}`, (req, res) => {
    inspect(res).setStateBefore({ preferences: labState.preferences });
    inspect(res).setStateAfter({ preferences: labState.preferences });
    inspect(res).setProtectionDecision({ allowed: false, decision: 'rejected', reason: 'GET mutations prohibited' });
    res.setHeader('Allow', 'POST');
    result(req, res, 405, { success: false, error: 'Use POST for mutations' });
  });
}
// Explicitly vulnerable GET exists ONLY for this lesson.
samesiteCsrfRouter.get('/update-get', mutate('vulnerable'));
// #endregion mutations

samesiteCsrfRouter.get('/probe', (req, res) => {
  const authenticated = Boolean(labState.getSession(req.cookies.session_csrf));
  inspect(res).setAuthResult({ authenticated, identity: authenticated ? 'learner' : undefined });
  res.json({ authenticated, cookieNames: Object.keys(req.cookies), operation: 'read-only' });
});
samesiteCsrfRouter.get('/preferences', (_req, res) => {
  res.json({ preferences: labState.preferences, cookieMode: labState.cookieMode });
});
samesiteCsrfRouter.post('/reset-preferences', adminGuard, (_req, res) => {
  labState.preferences = labState.getInitialPreferences();
  res.json({ success: true, message: 'Preferences reset. Current cookie session retained for the next comparison.' });
});
samesiteCsrfRouter.post('/reset', adminGuard, (_req, res) => {
  labState.reset();
  res.clearCookie('session_csrf', { ...cookieOptions });
  res.json({ success: true, message: 'Lab 2 reset and credentials invalidated; other labs are unchanged.' });
});
