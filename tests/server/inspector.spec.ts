import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { inspectorMiddleware } from '../../src/server/middleware/inspector.js';
import { inspectorStore } from '../../src/server/inspector/store.js';

test('Inspector redacts credentials, deep-copies snapshots, and distinguishes authentication from rejection', () => {
  inspectorStore.clear();
  const req: any = { headers: { cookie: 'session_httponly=never-expose-this', origin: 'https://attacker.csrf-lab.test:8443',
    host: 'app.security-lab.test:8443', referer: 'https://attacker.csrf-lab.test:8443/?csrfToken=secret' },
    query: { experimentId: 'test' }, body: {}, path: '/api/labs/test/update',
    originalUrl: '/api/labs/test/update?csrfToken=secret', method: 'POST' };
  const res: any = new EventEmitter(); res.locals = {}; res.statusCode = 403;
  inspectorMiddleware(req, res, () => {});
  const state = { profile: { email: 'before@example.test' } };
  res.locals.inspector.setStateBefore(state);
  state.profile.email = 'after@example.test';
  res.locals.inspector.setStateAfter(state);
  res.locals.inspector.setAuthResult({ authenticated: true, identity: 'learner' });
  res.emit('finish');
  const observation = inspectorStore.getObservations('test')[0];
  assert.equal(observation.authResult.authenticated, true);
  assert.equal(observation.protectionDecision.allowed, false);
  assert.equal((observation.stateBefore.profile as any).email, 'before@example.test');
  const serialized = JSON.stringify(observation);
  assert.equal(serialized.includes('never-expose-this'), false);
  assert.equal(serialized.includes('=secret'), false);
  assert.equal(observation.cookies[0].name, 'session_httponly');
});
