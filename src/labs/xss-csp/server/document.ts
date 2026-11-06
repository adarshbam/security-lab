import { randomBytes } from 'node:crypto';
import { payloads, SHELL_ORIGIN } from '../model.js';
import type { Run } from './state.js';

// #region html-encoding
// This encoder is for HTML text, not JavaScript, CSS, URLs or arbitrary attributes.
export function encodeText(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
// #endregion html-encoding

// #region policy
export function policies(policy: Run['policy'], nonce: string, reportPath: string) {
  const boundary = `default-src 'none'; connect-src 'self'; img-src 'none'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${SHELL_ORIGIN};`;
  const strict = `${boundary} script-src 'nonce-${nonce}'; report-uri ${reportPath}`;
  if (policy === 'absent') return {};
  if (policy === 'unsafe') return { 'Content-Security-Policy': `${boundary} script-src 'unsafe-inline'` };
  if (policy === 'report') return {
    'Content-Security-Policy': `${boundary} script-src 'unsafe-inline'`,
    'Content-Security-Policy-Report-Only': strict,
  };
  return { 'Content-Security-Policy': strict };
}
// #endregion policy

// #region trusted-script
// Serialized into the isolated lesson document. No caller-provided JavaScript is accepted.
function lessonScript(config: { rendering: string; vector: string; payload: string; base: string }) {
  const status = document.getElementById('evidence')!;
  const mark = async (kind: string) => {
    if (kind !== 'legitimate' && kind !== 'attacker') return;
    const response = await fetch(config.base + '/marker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) });
    status.textContent = JSON.stringify(await response.json(), null, 2);
  };
  Object.assign(window, { mark });
  document.getElementById('control')!.addEventListener('click', () => void mark('legitimate'));
  document.getElementById('inspect')!.addEventListener('click', async () => {
    const state = await fetch(config.base + '/state').then(r => r.json());
    status.textContent = JSON.stringify({ ...state, readableCookieNames: document.cookie.split(';').map(s => s.split('=')[0].trim()).filter(Boolean) }, null, 2);
  });
  document.addEventListener('DOMContentLoaded', () => {
  const output = document.getElementById('output')!;
  if (config.vector === 'dom' || config.rendering === 'sanitized') {
    const input = config.vector === 'dom' ? decodeURIComponent(location.hash.slice(1)) : config.payload;
    if (input !== config.payload) { output.textContent = 'Containment guard: choose a catalogue payload in the shell.'; return; }
    // #region dom-sinks
    if (config.rendering === 'protected') output.textContent = input;
    else if (config.rendering === 'vulnerable') output.innerHTML = input;
    else {
      // A deliberately tiny HTML language: b, strong, em and br, with NO attributes.
      // Rebuild nodes; never reuse untrusted elements. Unsupported subtrees are discarded.
      const parsed = new DOMParser().parseFromString(input, 'text/html');
      const copy = (source: Node, destination: Node) => {
        for (const node of source.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) destination.appendChild(document.createTextNode(node.textContent || ''));
          else if (node instanceof Element && ['B', 'STRONG', 'EM', 'BR'].includes(node.tagName)) {
            const safe = document.createElement(node.tagName.toLowerCase());
            copy(node, safe); destination.appendChild(safe);
          }
        }
      };
      copy(parsed.body, output);
    }
    // #endregion dom-sinks
  }
  });
}
// #endregion trusted-script

export function lessonDocument(run: Run, input: string) {
  const nonce = randomBytes(24).toString('base64');
  const base = '/runs/' + run.id;
  const config = JSON.stringify({ rendering: run.rendering, vector: run.vector, payload: run.vector === 'dom' ? payloads[run.payload].html : input, base }).replace(/</g, '\\u003c');
  // #region server-sinks
  const rendered = run.vector === 'dom' || run.rendering === 'sanitized' ? '' :
    run.rendering === 'protected' ? encodeText(input) : input;
  // #endregion server-sinks
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Isolated XSS lesson</title>
<style>
:root{--paper:#f7f6f2;--ink:#202620;--line:#aaa99f;--space:16px;--small:8px;--focus:4px;--hairline:1px;--touch:44px;--radius:8px;--body:1rem;--heading:1.2rem;--display:1.44rem;--leading:1.6;--tight:1.15;--weight:600;--font:system-ui;--mono:ui-monospace,monospace;--measure:65ch;--tracking:-.02em}
*{box-sizing:border-box}body{margin:var(--space);background:var(--paper);color:var(--ink);font:var(--body)/var(--leading) var(--font)}
h1,h2{font-weight:var(--weight);line-height:var(--tight);letter-spacing:var(--tracking);margin-block:var(--space)}h1{font-size:var(--display)}h2{font-size:var(--heading)}p{max-width:var(--measure);margin-block:var(--space)}
button{min-height:var(--touch);padding:var(--small) var(--space);margin:var(--small) var(--small) var(--small) 0;border:var(--hairline) solid var(--line);border-radius:var(--radius);background:var(--paper);color:var(--ink);font:inherit}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font:var(--body)/var(--leading) var(--mono);margin-block:var(--space)}button:focus-visible{outline:var(--focus) solid var(--ink);outline-offset:var(--focus)}
@media(prefers-color-scheme:dark){:root{--paper:#191d1a;--ink:#eeefe7;--line:#626d63}}</style></head><body>
<main><h1>Isolated release preview</h1><p>No real accounts. A marker changes only this run’s bounded dummy state.</p>
<p>The legitimate control issues a same-origin POST using the browser’s HttpOnly session. Inspect state reads the server counters and lists readable cookie names; it does not read the HttpOnly value.</p>
<button id="control">Run legitimate code</button><button id="inspect">Inspect dummy state</button><pre id="evidence" aria-live="polite">No marker response read yet.</pre>
<script nonce="${nonce}">const __name = (fn) => fn; (${lessonScript.toString()})(${config})</script>
<h2>Rendered input</h2><div id="output">${rendered}</div></main></body></html>`;
  return { html, headers: policies(run.policy, nonce, base + '/reports') };
}
