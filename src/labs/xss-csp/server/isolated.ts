import express from 'express';
import cookieParser from 'cookie-parser';
import { inspectorMiddleware, type InspectorContext } from '../../../server/middleware/inspector.js';
import { XSS_ORIGIN, payloads } from '../model.js';
import { lessonDocument } from './document.js';
import { runs, view } from './state.js';

export function createIsolatedXssApp() {
  const app = express();
  app.disable('x-powered-by'); app.set('trust proxy', false);
  app.use((req, res, next) => {
    if (req.headers.host !== new URL(XSS_ORIGIN).host ||
      Object.keys(req.headers).some(h => h === 'forwarded' || h.startsWith('x-forwarded-')) ||
      (req.socket.localPort && req.socket.localPort !== 8444)) {
      res.status(400).end(); return;
    }
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
    next();
  });
  app.use(cookieParser());
  app.use(express.json({ limit: '4kb', type: ['application/json', 'application/csp-report'] }));
  app.use((req, _res, next) => {
    const id = /^\/runs\/([^/]+)\//.exec(req.path)?.[1];
    const run = id ? runs.get(id) : undefined;
    if (run) req.headers['x-experiment-id'] = run.experimentId;
    next();
  });
  app.use(inspectorMiddleware);
  app.use('/runs/:id', (req, res, next) => {
    const run = runs.get(req.params.id);
    if (!run) { res.status(404).json({ error: 'Run expired; create another from the teaching shell.' }); return; }
    res.locals.run = run;
    const inspector = res.locals.inspector as InspectorContext;
    inspector.setExperimentId(run.experimentId);
    inspector.setStateBefore(view(run));
    next();
  });
  app.get('/runs/:id/document', (req, res) => {
    const run = res.locals.run as NonNullable<ReturnType<typeof runs.get>>;
    // Reflected input comes from the query, stored input from server state, DOM input from the fragment.
    // Exact catalogue match is a containment guard, NOT the protected rendering implementation.
    const input = run.vector === 'reflected' ? req.query.input : run.vector === 'stored' ? run.stored : '';
    if (typeof input !== 'string' || (run.vector !== 'dom' && input !== payloads[run.payload].html)) { res.status(400).end(); return; }
    run.visits = Math.min(99, run.visits + 1);
    res.cookie('xss_session', run.session, { secure: true, httpOnly: true, sameSite: 'none', partitioned: true, path: '/runs/' + run.id });
    res.cookie('xss_readable', 'fictional', { secure: true, sameSite: 'none', partitioned: true, path: '/runs/' + run.id });
    const document = lessonDocument(run, input);
    (res.locals.inspector as InspectorContext).setStateAfter(view(run));
    res.set(document.headers).type('html').send(document.html);
  });
  app.get('/runs/:id/state', (_req, res) => { res.json(view(res.locals.run)); });
  app.post('/runs/:id/marker', (req, res) => {
    const run = res.locals.run as NonNullable<ReturnType<typeof runs.get>>;
    const inspector = res.locals.inspector as InspectorContext;
    const authenticated = req.cookies.xss_session === run.session;
    inspector.setAuthResult({ authenticated, identity: authenticated ? 'fictional-preview-reader' : undefined });
    if (req.headers.origin !== XSS_ORIGIN || !authenticated || !['legitimate', 'attacker'].includes(req.body?.kind)) {
      res.status(403).json({ error: 'Exact lesson origin, session and known marker required.' }); return;
    }
    // #region bounded-mutation
    const kind = req.body.kind as 'legitimate' | 'attacker';
    run[kind] = 1;
    if (kind === 'attacker') run.mutations = 1;
    inspector.setStateAfter(view(run));
    res.json(view(run));
    // #endregion bounded-mutation
  });
  app.post('/runs/:id/reports', (req, res) => {
    const run = res.locals.run as NonNullable<ReturnType<typeof runs.get>>;
    const report = req.body?.['csp-report'];
    if (report && run.reports.length < 12) {
      const directive = report['effective-directive'];
      const disposition = report.disposition;
      run.reports.push({ directive: typeof directive === 'string' ? directive.slice(0, 64) : 'unknown',
        disposition: disposition === 'enforce' || disposition === 'report' ? disposition : 'unknown' });
    }
    (res.locals.inspector as InspectorContext).setStateAfter(view(run));
    res.status(204).end();
  });
  app.use((_req, res) => { res.status(404).end(); });
  return app;
}
