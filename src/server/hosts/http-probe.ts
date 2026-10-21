import express from 'express';
import cookieParser from 'cookie-parser';
import { hostValidatorMiddleware } from '../middleware/host-validator.js';
import { inspectorMiddleware } from '../middleware/inspector.js';

export function createHttpProbeApp() {
  const app = express();
  app.disable('x-powered-by');
  // IP-only status is a readiness check, never an experiment or API route.
  app.get('/probe/status', (req, res, next) => {
    if (req.headers.host !== '127.0.0.1:8080' || Object.keys(req.headers).some(h => h === 'forwarded' || h.startsWith('x-forwarded-'))) {
      next(); return;
    }
    res.json({ status: 'ok', service: 'security-lab-probe' });
  });
  app.use(hostValidatorMiddleware);
  app.use(cookieParser());
  app.use(inspectorMiddleware);
  app.get('/probe/cookies', (req, res) => {
    const names = Object.keys(req.cookies);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ transport: 'HTTP', receivedCookieNames: names,
      secureCookiesOmitted: !names.some(n => ['session_httponly', 'session_readable', 'secure_session'].includes(n)),
      diagnosticCookiePresent: names.includes('plain_diagnostic') });
  });
  app.use((_req, res) => { res.status(404).json({ error: 'Only read-only HTTP diagnostics are available' }); });
  return app;
}
