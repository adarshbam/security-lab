import { Router } from 'express';
import type { LabServerModule } from '../../../shared/contracts/lab.js';
import { adminGuard } from '../../../server/middleware/admin-guard.js';
import { xssManifest } from '../manifest.js';
import { payloads, XSS_ORIGIN, type Rendering, type Policy, type Vector, type Payload } from '../model.js';
import { newRun, runs, resetXss, view } from './state.js';

const router = Router();
router.post('/reset', adminGuard, (_req, res) => { resetXss(); res.json({ success: true }); });
router.post('/runs', adminGuard, (req, res) => {
  const { experimentId, rendering, policy, payload } = req.body || {};
  const vector: Vector | undefined = ({ 'xss-reflected': 'reflected', 'xss-stored': 'stored', 'xss-dom': 'dom', 'xss-csp': 'reflected' } as Record<string, Vector>)[experimentId];
  if (!xssManifest.experiments.some(item => item.id === experimentId) || !vector || !['vulnerable', 'protected', 'sanitized'].includes(rendering) ||
    !['absent', 'unsafe', 'report', 'enforce'].includes(policy) || !Object.hasOwn(payloads, payload)) {
    res.status(400).json({ error: 'Choose a known experiment, renderer, policy and payload.' }); return;
  }
  const run = newRun({ experimentId, vector, rendering: rendering as Rendering, policy: policy as Policy, payload: payload as Payload });
  if (vector === 'stored') run.stored = payloads[run.payload].html;
  const url = new URL(XSS_ORIGIN + '/runs/' + run.id + '/document');
  url.searchParams.set('experimentId', experimentId);
  if (vector === 'reflected') url.searchParams.set('input', payloads[run.payload].html);
  if (vector === 'dom') url.hash = encodeURIComponent(payloads[run.payload].html);
  res.json({ run: view(run), url: url.href });
});
router.post('/state', adminGuard, (req, res) => {
  const run = runs.get(req.body?.id);
  if (!run) { res.status(404).json({ error: 'Run expired or reset.' }); return; }
  res.json(view(run));
});
export const xssServerModule: LabServerModule = {
  manifest: xssManifest, router, resetState: resetXss,
  getInitialState: () => ({ activeRuns: 0 }), getState: () => ({ activeRuns: runs.size }),
};
