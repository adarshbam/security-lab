import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import type { ViteDevServer } from 'vite';
import type { Server } from 'node:https';
import { hostValidatorMiddleware } from './middleware/host-validator.js';
import { adminGuard } from './middleware/admin-guard.js';
import { inspectorMiddleware } from './middleware/inspector.js';
import { inspectorStore } from './inspector/store.js';
import { serverRegistry } from './registry.js';

export async function createApp(server?: Server): Promise<{ app: express.Application; vite?: ViteDevServer }> {
  const app = express();

  // Strictly disable proxy trust
  app.set('trust proxy', false);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Global Host validation and proxy header rejection
  app.use(hostValidatorMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use(inspectorMiddleware);

  // Each module may contribute auxiliary-origin pages without editing existing labs.
  const auxiliaryRouters = { sibling: express.Router(), attacker: express.Router() };
  for (const role of ['sibling', 'attacker'] as const) {
    const modules = serverRegistry.getAll().filter(lab => lab.hostRouters?.[role]);
    for (const lab of modules) auxiliaryRouters[role].use(`/labs/${lab.manifest.id}`, lab.hostRouters![role]!);
    auxiliaryRouters[role].get('/', (req, res) => {
      const requested = typeof req.query.labId === 'string' ? req.query.labId : modules[0]?.manifest.id;
      if (!modules.some(lab => lab.manifest.id === requested)) { res.status(404).send('Unknown lab console'); return; }
      const id = typeof req.query.experimentId === 'string' ? req.query.experimentId : '';
      res.redirect(`/labs/${requested}/?experimentId=${encodeURIComponent(id)}`);
    });
    auxiliaryRouters[role].use((_req, res) => { res.status(404).send('Unknown console path'); });
  }
  // Host-based dispatching for sibling and attacker origins
  app.use((req, res, next) => {
    const hostname = (req.headers.host || '').split(':')[0].toLowerCase();
    if (hostname === 'sibling.security-lab.test') {
      return auxiliaryRouters.sibling(req, res, next);
    }
    if (hostname === 'attacker.csrf-lab.test') {
      return auxiliaryRouters.attacker(req, res, next);
    }
    next();
  });

  // Administrative and control endpoints (strictly origin & custom header protected)
  app.post('/api/admin/manifests', adminGuard, (_req, res) => {
    const manifests = serverRegistry.getAll().map((m) => m.manifest);
    res.json(manifests);
  });

  app.post('/api/inspector/read', adminGuard, (req, res) => {
    const experimentId = req.query.experimentId as string | undefined;
    const observations = inspectorStore.getObservations(experimentId);
    res.json(observations);
  });

  app.post('/api/inspector/clear', adminGuard, (req, res) => {
    const experimentId = req.query.experimentId as string | undefined;
    inspectorStore.clear(experimentId);
    res.json({ success: true, message: 'Inspector logs cleared.' });
  });

  // Mount lab routes
  for (const lab of serverRegistry.getAll()) {
    app.use(`/api/labs/${lab.manifest.id}`, lab.router);
  }
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Unknown API route' }); });

  // Frontend delivery (Vite middleware in dev, static files in production)
  let vite: ViteDevServer | undefined;
  const isProduction = process.env.LAB_BUILT === 'true';

  if (!isProduction) {
    const { createServer } = await import('vite');
    vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: server ? { server, protocol: 'wss', host: 'app.security-lab.test', clientPort: 8443 } : false,
        cors: { origin: 'https://app.security-lab.test:8443' },
        allowedHosts: [
          'app.security-lab.test',
          'sibling.security-lab.test',
          'attacker.csrf-lab.test',
        ],
      },
      appType: 'spa',
      root: path.resolve(process.cwd(), 'src/client'),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else throw new Error('Built assets are missing. Run npm run build.');
  }

  return { app, vite };
}
