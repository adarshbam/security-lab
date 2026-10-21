import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostValidatorMiddleware } from '../../src/server/middleware/host-validator.js';

function createMockReqRes(headers: Record<string, string> = {}) {
  const req: any = { headers };
  let statusCode = 200;
  let jsonBody: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: any) {
      jsonBody = body;
      return res;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => jsonBody,
  };
}

test('Host Validator: allows recognized app.security-lab.test', () => {
  const { req, res, getStatus } = createMockReqRes({ host: 'app.security-lab.test:8443' });
  let nextCalled = false;

  hostValidatorMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(getStatus(), 200);
});

test('Host Validator: allows sibling.security-lab.test and attacker.csrf-lab.test', () => {
  const sibling = createMockReqRes({ host: 'sibling.security-lab.test:8443' });
  let siblingNext = false;
  hostValidatorMiddleware(sibling.req, sibling.res, () => { siblingNext = true; });
  assert.equal(siblingNext, true);

  const attacker = createMockReqRes({ host: 'attacker.csrf-lab.test:8443' });
  let attackerNext = false;
  hostValidatorMiddleware(attacker.req, attacker.res, () => { attackerNext = true; });
  assert.equal(attackerNext, true);
});

test('Host Validator: rejects unrecognized hosts with 400 Bad Request', () => {
  const { req, res, getStatus, getBody } = createMockReqRes({ host: 'malicious.com:8443' });
  let nextCalled = false;

  hostValidatorMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(getStatus(), 400);
  assert.equal(getBody().error, 'Invalid Host header');
});

test('Host Validator: rejects forwarded-proxy headers with 400 Bad Request', () => {
  const cases: Record<string, string>[] = [
    { 'host': 'app.security-lab.test:8443', 'x-forwarded-for': '203.0.113.195' },
    { 'host': 'app.security-lab.test:8443', 'x-forwarded-host': 'proxy.example.com' },
    { 'host': 'app.security-lab.test:8443', 'x-forwarded-proto': 'https' },
    { 'host': 'app.security-lab.test:8443', 'forwarded': 'for=127.0.0.1' },
    { 'host': 'app.security-lab.test:8443', 'x-forwarded-port': '443' },
  ];

  for (const headers of cases) {
    const { req, res, getStatus, getBody } = createMockReqRes(headers);
    let nextCalled = false;

    hostValidatorMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 400);
    assert.equal(getBody().error, 'Proxy headers rejected');
  }
});
