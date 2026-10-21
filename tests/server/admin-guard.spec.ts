import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminGuard, LEGITIMATE_ORIGIN } from '../../src/server/middleware/admin-guard.js';

function check(headers: Record<string, string>) {
  let status = 200; let next = false;
  const res: any = { status(value: number) { status = value; return res; }, json() { return res; } };
  adminGuard({ headers } as any, res, () => { next = true; });
  return { status, next };
}
test('Control guard requires both custom header and exact Origin', () => {
  assert.equal(check({ origin: LEGITIMATE_ORIGIN }).status, 403);
  assert.equal(check({ 'x-security-lab-admin': 'true', origin: LEGITIMATE_ORIGIN }).next, true);
  for (const origin of ['null', '', 'https://attacker.csrf-lab.test:8443', LEGITIMATE_ORIGIN + '.evil.test',
    'https://app.security-lab.test:9443']) {
    assert.equal(check({ 'x-security-lab-admin': 'true', origin }).status, 403);
  }
});
test('Host or Referer alone cannot substitute for Origin on a control mutation', () => {
  assert.equal(check({ 'x-security-lab-admin': 'true', host: 'app.security-lab.test:8443' }).status, 403);
  assert.equal(check({ 'x-security-lab-admin': 'true', referer: LEGITIMATE_ORIGIN + '/' }).status, 403);
});
