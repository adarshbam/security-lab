import { Router, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { LabServerModule } from '../../../shared/contracts/lab.js';
import { adminGuard, LEGITIMATE_ORIGIN } from '../../../server/middleware/admin-guard.js';
import type { InspectorContext } from '../../../server/middleware/inspector.js';
import { injectionManifest } from '../manifest.js';
import { evaluateLogin, type Engine, type World, type Actor } from './engine.js';

const router = Router();
const sessions = new Map<string, { scope: string; actor: Actor }>();
const snapshot = () => ({ sessions: [...sessions.values()].map(({ scope, actor }) => ({ scope, actor })), fictionalRows: 2 });
const inspector = (res: Response) => res.locals.inspector as InspectorContext;
const reset = () => sessions.clear();
router.post('/reset', adminGuard, (_req, res) => { reset(); res.json({ reset: true }); });
router.use('/:engine/:world', (req, res, next) => {
  if (!['sql', 'nosql', 'coercion'].includes(req.params.engine) || !['vulnerable', 'protected'].includes(req.params.world)) { res.status(404).json({ error: 'Unknown implementation' }); return; }
  next();
});
router.post('/:engine/:world/login', (req, res) => {
  if (req.headers.origin !== LEGITIMATE_ORIGIN) { res.status(403).json({ error: 'Exact local app Origin required' }); return; }
  if (!req.is('application/json')) { res.status(415).json({ error: 'Use application/json; form strings do not preserve JSON object or boolean types' }); return; }
  const engine = req.params.engine as Engine;
  const world = req.params.world as World;
  const scope = `${engine}/${world}`;
  const cookie = `injection_${engine}_${world}`;
  const path = `/api/labs/injection-attacks/${scope}`;
  const evidence = inspector(res);
  evidence.setExperimentId(`injection-${engine}`);
  evidence.setStateBefore(snapshot());
  const previous = req.cookies?.[cookie];
  if (sessions.get(previous)?.scope === scope) sessions.delete(previous);
  res.clearCookie(cookie, { path, secure: true, httpOnly: true, sameSite: 'strict' });
  const result = evaluateLogin(engine, world, req.body);
  if (result.actor) {
    if (sessions.size >= 200) sessions.clear();
    sessions.set(randomUUID(), { scope, actor: result.actor });
    const token = [...sessions.keys()].at(-1)!;
    res.cookie(cookie, token, { path, secure: true, httpOnly: true, sameSite: 'strict' });
  }
  evidence.setAuthResult({ authenticated: Boolean(result.actor), identity: result.actor?.id, reason: result.decision });
  evidence.setProtectionDecision({ allowed: Boolean(result.actor), decision: result.actor ? 'allowed' : 'rejected', reason: result.decision });
  evidence.setStateAfter({ ...snapshot(), evaluation: { types: result.types, contentType: req.get('content-type'), queryStructure: result.queryStructure, decision: result.decision } });
  res.status(result.status).json(result);
});
router.get('/:engine/:world/me', (req, res) => {
  const scope = `${req.params.engine}/${req.params.world}`;
  const session = sessions.get(req.cookies?.[`injection_${req.params.engine}_${req.params.world}`]);
  const actor = session?.scope === scope ? session.actor : null;
  inspector(res).setExperimentId(`injection-${req.params.engine}`);
  inspector(res).setAuthResult({ authenticated: Boolean(actor), identity: actor?.id, reason: 'Fresh server-side session lookup in selected scope' });
  inspector(res).setStateBefore(snapshot()); inspector(res).setStateAfter(snapshot());
  res.status(actor ? 200 : 401).json({ authenticated: Boolean(actor), actor });
});
export const injectionServerModule: LabServerModule = {
  manifest: injectionManifest, router, getInitialState: () => ({ sessions: [], fictionalRows: 2 }), getState: snapshot, resetState: reset,
};
