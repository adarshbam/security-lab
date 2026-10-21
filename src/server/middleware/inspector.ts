import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { inspectorStore } from '../inspector/store.js';
import type {
  ExperimentObservation,
  CookieObservation,
  AuthResult,
  ProtectionDecision,
} from '../../shared/contracts/inspector.js';

export interface InspectorContext {
  setAuthResult: (auth: AuthResult) => void;
  setProtectionDecision: (decision: ProtectionDecision) => void;
  setStateBefore: (state: Record<string, any>) => void;
  setStateAfter: (state: Record<string, any>) => void;
  setExperimentId: (id: string) => void;
}

export function inspectorMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestPath = req.path;
  const requestUrl = req.originalUrl;
  if (requestPath.startsWith('/api/inspector') || requestPath.startsWith('/api/admin')) { next(); return; }
  const queryExp = req.query.experimentId as string | undefined;
  const headerExp = req.headers['x-experiment-id'] as string | undefined;
  const candidate = headerExp || queryExp || req.body?.experimentId;
  let experimentId = typeof candidate === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(candidate) ? candidate : 'general';

  let authResult: AuthResult = { authenticated: false, reason: 'unspecified' };
  let protectionDecision: ProtectionDecision = { allowed: true, decision: 'allowed' };
  let stateBefore: Record<string, any> = {};
  let stateAfter: Record<string, any> = {};

  const context: InspectorContext = {
    setAuthResult: (auth) => { authResult = auth; },
    setProtectionDecision: (decision) => { protectionDecision = decision; },
    setStateBefore: (state) => { stateBefore = structuredClone(state); },
    setStateAfter: (state) => { stateAfter = structuredClone(state); },
    setExperimentId: (id) => { experimentId = id; },
  };

  res.locals.inspector = context;

  // Redacted cookie extraction
  const cookieHeader = req.headers.cookie || '';
  const cookies: CookieObservation[] = [];
  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx > -1) {
        const name = pair.substring(0, idx).trim();
        cookies.push({
          name,
          present: true,
          redactedValue: '[REDACTED]',
        });
      }
    }
  }

  const startTime = new Date().toISOString();

  res.on('finish', () => {
    // Only record if experimentId is set or request hits /api/labs/ or /probe/
    if (
      requestPath.startsWith('/api/labs/') ||
      requestPath.startsWith('/probe/') ||
      headerExp ||
      queryExp
    ) {
      const observation: ExperimentObservation = {
        id: randomUUID(),
        experimentId,
        timestamp: startTime,
        method: req.method,
        url: redactUrl(requestUrl),
        host: (req.headers.host || '').toLowerCase(),
        path: requestPath,
        origin: (req.headers.origin as string) || null,
        referer: req.headers.referer ? redactUrl(req.headers.referer) : null,
        secFetchSite: (req.headers['sec-fetch-site'] as string) || null,
        secFetchMode: (req.headers['sec-fetch-mode'] as string) || null,
        secFetchDest: (req.headers['sec-fetch-dest'] as string) || null,
        cookies,
        authResult,
        protectionDecision: res.statusCode >= 400 && protectionDecision.allowed ?
          { allowed: false, decision: 'rejected', reason: `HTTP ${res.statusCode}` } : protectionDecision,
        stateBefore,
        stateAfter,
        status: res.statusCode,
      };

      inspectorStore.record(observation);
    }
  });

  next();
}

function redactUrl(value: string) {
  return value.replace(/([?&][^=&]*(?:token|authorization|credential|secret)[^=&]*=)[^&]*/gi, '$1[REDACTED]');
}
