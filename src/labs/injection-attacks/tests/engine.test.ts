import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateLogin } from '../server/engine.js';

test('real SQLite: concatenation bypasses string validation; parameters preserve data', () => {
  for (const world of ['vulnerable', 'protected'] as const) {
    assert.equal(evaluateLogin('sql', world, { username: 'alex', password: 'paper-lantern' }).actor?.id, 'alex');
    assert.equal(evaluateLogin('sql', world, { username: 'sam', password: 'cedar-path' }).actor?.id, 'sam');
    assert.equal(evaluateLogin('sql', world, { username: 'alex', password: 'wrong' }).status, 401);
    assert.equal(evaluateLogin('sql', world, { username: {}, password: false }).status, 400);
  }
  for (const id of ['alex', 'sam']) {
    const input = { username: `${id}' --`, password: 'wrong' };
    assert.equal(evaluateLogin('sql', 'vulnerable', input).actor?.id, id);
    assert.equal(evaluateLogin('sql', 'protected', input).status, 401);
  }
  assert.equal(evaluateLogin('sql', 'vulnerable', { username: "'", password: 'wrong' }).status, 400);
  // An injected SELECT projection cannot leak the fixture password as a public identity.
  const reflected = evaluateLogin('sql', 'vulnerable', { username: "' UNION SELECT password, password FROM users --", password: 'wrong' });
  assert.ok(!JSON.stringify(reflected).includes('paper-lantern'));
  assert.ok(!JSON.stringify(reflected).includes('cedar-path'));
});
test('real Mingo: object operator predicates differ from strings and explicit equality', () => {
  const input = { username: { $ne: '' }, password: { $ne: '' } };
  assert.equal(evaluateLogin('nosql', 'vulnerable', input).actor?.id, 'alex');
  assert.equal(evaluateLogin('nosql', 'protected', input).status, 400);
  assert.equal(evaluateLogin('nosql', 'vulnerable', { username: 'sam', password: { $ne: '' } }).actor?.id, 'sam');
  assert.equal(evaluateLogin('nosql', 'vulnerable', { username: 'sam', password: '{"$ne":""}' }).status, 401);
  assert.equal(evaluateLogin('nosql', 'vulnerable', { username: { $where: 'return true' }, password: { $ne: '' } }).status, 400);
  for (const world of ['vulnerable', 'protected'] as const) {
    assert.equal(evaluateLogin('nosql', world, { username: 'alex', password: 'paper-lantern' }).actor?.id, 'alex');
    assert.equal(evaluateLogin('nosql', world, { username: 'sam', password: 'cedar-path' }).actor?.id, 'sam');
  }
});
test('JS coercion is bounded to the actual stored value; strict validation rejects nonstrings', () => {
  for (const value of [false, 0, [0]]) {
    assert.equal(evaluateLogin('coercion', 'vulnerable', { username: 'pin-demo', password: value }).actor?.id, 'pin-demo');
    assert.equal(evaluateLogin('coercion', 'protected', { username: 'pin-demo', password: value }).status, 400);
  }
  for (const world of ['vulnerable', 'protected'] as const) {
    assert.equal(evaluateLogin('coercion', world, { username: 'pin-demo', password: '0' }).actor?.id, 'pin-demo');
    assert.equal(evaluateLogin('coercion', world, { username: 'pin-demo', password: 'false' }).status, 401);
  }
  assert.equal(evaluateLogin('coercion', 'vulnerable', { username: 'pin-demo', password: [] }).status, 401);
});
test('redacted evidence never returns either submitted password or stored fixture passwords', () => {
  for (const engine of ['sql', 'nosql', 'coercion'] as const) for (const world of ['vulnerable', 'protected'] as const) {
    const result = JSON.stringify(evaluateLogin(engine, world, { username: 'alex', password: 'unique-secret-marker' }));
    for (const secret of ['unique-secret-marker', 'paper-lantern', 'cedar-path']) assert.ok(!result.includes(secret));
  }
});
