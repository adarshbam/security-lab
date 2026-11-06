import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeText, lessonDocument } from '../server/document.js';
import { newRun, view, runs, resetXss } from '../server/state.js';
import { payloads } from '../model.js';

test('HTML text encoding is paired with raw rendering; nonce changes per response', () => {
  resetXss();
  const run = newRun({ experimentId: 'xss-reflected', vector: 'reflected', rendering: 'vulnerable', policy: 'enforce', payload: 'script' });
  assert.equal(encodeText('<a "x" & \'y\'>'), '&lt;a &quot;x&quot; &amp; &#39;y&#39;&gt;');
  const a = lessonDocument(run, payloads.script.html);
  const b = lessonDocument(run, payloads.script.html);
  assert.notEqual(a.headers['Content-Security-Policy'], b.headers['Content-Security-Policy']);
  assert.ok(a.html.includes('<div id="output">' + payloads.script.html));
  run.rendering = 'protected';
  assert.ok(lessonDocument(run, payloads.script.html).html.includes('<div id="output">&lt;script&gt;'));
  run.policy = 'absent';
  assert.deepEqual(lessonDocument(run, '').headers, {});
  run.policy = 'report';
  assert.match(lessonDocument(run, '').headers['Content-Security-Policy-Report-Only']!, /nonce-/);
});

test('state is bounded, views redact sessions and stored content, reset revokes all runs', () => {
  resetXss();
  const first = newRun({ experimentId: 'xss-stored', vector: 'stored', rendering: 'vulnerable', policy: 'absent', payload: 'handler' });
  assert.equal('session' in view(first), false);
  assert.equal('stored' in view(first), false);
  for (let i = 0; i < 61; i++) newRun(first);
  assert.equal(runs.size, 60);
  assert.equal(runs.has(first.id), false);
  resetXss(); assert.equal(runs.size, 0);
});
