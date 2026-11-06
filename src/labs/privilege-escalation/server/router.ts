import { Router, type Request, type Response } from 'express';
import { adminGuard, LEGITIMATE_ORIGIN } from '../../../server/middleware/admin-guard.js';
import type { InspectorContext } from '../../../server/middleware/inspector.js';
import { tokenMatches } from '../../../server/tokens.js';
import { accessWorlds, resetAccessWorlds, type AccessWorld, type DemoUser, type WorldName } from './state.js';

export const accessRouter = Router();
const cookieName = (world: WorldName) => `privilege_lab_${world}`;
const cookieOptions = { secure: true, httpOnly: true, sameSite: 'lax' as const, path: '/' };
const inspect = (res: Response) => res.locals.inspector as InspectorContext;
type RequestContext = { world: AccessWorld; actor: DemoUser; token: string };

function deny(res: Response, status: number, reason: string, actor?: DemoUser): void {
  inspect(res).setProtectionDecision({ allowed: false, decision: 'rejected', reason });
  res.status(status).json({ error: reason, actor: actor && { id: actor.id, role: actor.role }, decision: 'rejected' });
}
function allow(res: Response, rule: string): void {
  inspect(res).setProtectionDecision({ allowed: true, decision: 'allowed', ruleApplied: rule });
}
function identity(res: Response, actor: DemoUser): void {
  inspect(res).setAuthResult({ authenticated: true, identity: `${actor.id} (${actor.role})`, reason: 'Current role read from world state' });
}
function authenticated(req: Request, res: Response): RequestContext | null {
  const name = req.params.world;
  if (name !== 'vulnerable' && name !== 'protected') { deny(res, 404, 'Unknown world'); return null; }
  const world = accessWorlds[name];
  inspect(res).setStateBefore(world.snapshot());
  inspect(res).setStateAfter(world.snapshot());
  const token = req.cookies?.[cookieName(name)] || '';
  const actor = world.actor(token);
  if (!actor) { deny(res, 401, 'Sign in to this world'); return null; }
  identity(res, actor);
  return { world, actor, token };
}
function mutation(req: Request, res: Response, context: RequestContext): boolean {
  if (req.headers.origin !== LEGITIMATE_ORIGIN) { deny(res, 403, 'Exact app Origin required', context.actor); return false; }
  if (!tokenMatches(req.headers['x-csrf-token'], context.world.session(context.token)?.csrf || '')) {
    deny(res, 403, 'Session-bound CSRF token required', context.actor); return false;
  }
  return true;
}
function finish(res: Response, context: RequestContext, data: Record<string, unknown>, rule: string): void {
  allow(res, rule);
  inspect(res).setStateAfter(context.world.snapshot());
  res.json({ ...data, actor: { id: context.actor.id, role: context.actor.role }, decision: 'allowed' });
}

accessRouter.post('/reset', adminGuard, (_req, res) => {
  resetAccessWorlds();
  res.json({ reset: true, worlds: { vulnerable: accessWorlds.vulnerable.snapshot(), protected: accessWorlds.protected.snapshot() } });
});
accessRouter.post('/:world/login', (req, res) => {
  const name = req.params.world;
  if (name !== 'vulnerable' && name !== 'protected') { deny(res, 404, 'Unknown world'); return; }
  if (req.headers.origin !== LEGITIMATE_ORIGIN) { deny(res, 403, 'Exact app Origin required'); return; }
  const world = accessWorlds[name];
  inspect(res).setStateBefore(world.snapshot());
  const token = world.login(req.body?.userId);
  if (!token) { deny(res, 401, 'Choose a fictional demo account'); return; }
  const actor = world.actor(token)!;
  identity(res, actor);
  res.cookie(cookieName(name), token, cookieOptions);
  finish(res, { world, actor, token }, { user: { ...actor } }, 'Fictional account login');
});
accessRouter.get('/:world/csrf-token', (req, res) => {
  const context = authenticated(req, res); if (!context) return;
  allow(res, 'Same-origin session-bound token');
  res.json({ csrfToken: context.world.session(context.token)!.csrf });
});
accessRouter.post('/:world/logout', (req, res) => {
  const context = authenticated(req, res); if (!context || !mutation(req, res, context)) return;
  context.world.logout(context.token);
  res.clearCookie(cookieName(context.world.name), cookieOptions);
  finish(res, context, { signedOut: true }, 'Session revoked');
});
accessRouter.get('/:world/me', (req, res) => {
  const context = authenticated(req, res); if (!context) return;
  finish(res, context, { user: { ...context.actor } }, 'Current server-side identity');
});
accessRouter.patch('/:world/me', (req, res) => {
  const context = authenticated(req, res); if (!context || !mutation(req, res, context)) return;
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) { deny(res, 400, 'JSON object required', context.actor); return; }
  const user = context.world.updateProfile(context.actor, body);
  if (!user) { deny(res, 400, 'Only a nonempty displayName may be edited', context.actor); return; }
  finish(res, context, { user }, context.world.name === 'vulnerable' ? 'Untrusted JSON merged into user' : 'Explicit displayName allowlist');
});
accessRouter.get('/:world/admin/users', (req, res) => {
  const context = authenticated(req, res); if (!context) return;
  if (context.actor.role !== 'admin') { deny(res, 403, 'Current role is not admin', context.actor); return; }
  finish(res, context, { users: context.world.allUsers() }, 'Current server-side admin role');
});
accessRouter.delete('/:world/admin/users/:id', (req, res) => {
  const context = authenticated(req, res); if (!context || !mutation(req, res, context)) return;
  if (context.actor.role !== 'admin') { deny(res, 403, 'Current role is not admin', context.actor); return; }
  if (req.params.id === context.world.session(context.token)?.userId) { deny(res, 403, 'Self-deletion is forbidden', context.actor); return; }
  if (!context.world.deleteUser(context.actor, req.params.id)) { deny(res, 404, 'User not found', context.actor); return; }
  finish(res, context, { deleted: req.params.id, users: context.world.allUsers() }, 'Admin role and non-self target');
});
