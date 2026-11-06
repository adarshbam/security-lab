import type { Request, Response } from 'express';
import { escapeHtml } from '../../../server/html.js';

export function experimentConsole(req: Request, res: Response) {
  if (req.method !== 'GET' || req.path !== '/') { res.status(404).send('Unknown console path'); return; }
  const sibling = req.hostname === 'sibling.security-lab.test';
  const origin = sibling ? 'https://sibling.security-lab.test:8443' : 'https://attacker.csrf-lab.test:8443';
  const rawId = req.query.experimentId;
  const experimentId = typeof rawId === 'string' && /^[a-z0-9-]{1,80}$/.test(rawId) ? rawId :
    sibling ? 'exp6-sibling-vs-attacker' : 'exp2-csrf-top-level-post';
  const target = 'https://app.security-lab.test:8443/api/labs/samesite-csrf';
  const forms = ['vulnerable', 'token', 'origin', 'combined'].map(defense => `
    <form action="${target}/update-${defense}" method="POST" target="_blank">
      <input type="hidden" name="email" value="${sibling ? 'sibling' : 'attacker'}-${defense}@example.test">
      <input type="hidden" name="experimentId" value="${experimentId}">
      <button type="submit" data-defense="${defense}">Submit ${defense} POST</button>
    </form>`).join('');
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1"><title>${sibling ? 'Sibling' : 'Attacker'} console</title>
    <style>body{font:16px system-ui;background:#020617;color:#e2e8f0;max-width:960px;margin:48px auto;padding:24px}
      section{background:#0f172a;border:1px solid #334155;border-radius:18px;padding:24px;margin:20px 0}
      h1{font-size:clamp(20px,4vw,32px);overflow-wrap:anywhere}a{color:#7dd3fc}
      button,a.action{display:inline-block;background:#0369a1;color:white;padding:12px 18px;border:0;border-radius:8px;margin:5px 0;cursor:pointer}
      .forms{display:flex;gap:12px;flex-wrap:wrap}pre{white-space:pre-wrap;overflow-wrap:anywhere}code{color:#7dd3fc}
      iframe{background:white;max-width:100%;height:160px}button:focus-visible,a:focus-visible{outline:3px solid #fbbf24;outline-offset:4px}
    </style></head><body>
    <p>LOCAL SECURITY LAB / ${sibling ? 'SAME SITE · DIFFERENT ORIGIN' : 'DIFFERENT SITE · DIFFERENT ORIGIN'}</p>
    <h1>${escapeHtml(origin.replace('https://', ''))}</h1>
    <p>Requests below originate from <code>${escapeHtml(origin)}</code>. Compare the original request in your learner workspace.</p>
    <p>Experiment: <code>${experimentId}</code>. These identifiers correlate observations; they are not credentials.</p>
    <section><h2>Top-level POST forms</h2>
      <p>Each button submits a real URL-encoded form POST to the named app endpoint in a new result tab. It sends a fixed dummy email and the experiment identifier, but no CSRF token. The browser supplies Origin and decides whether session_csrf is eligible under its SameSite policy. This source page cannot read the app’s HttpOnly cookie.</p>
      <p>The server checks the session first (401 if missing), then the selected defense (403 if it fails). Vulnerable adds no CSRF defense; token requires the session-bound token; origin requires the exact app Origin; combined requires both. A 200 updates the fictional email and lastUpdatedBy. Inspect the original POST in Network and compare preferences back in the app.</p>
      <div class="forms">${forms}</div></section>
    <section><h2>Top-level GET navigation</h2>
      <p>These links open real GET requests in new tabs. Explicit SameSite=Lax can include a session on cross-site top-level GET navigation. The read-only probe reports authentication and cookie names without changing state. The deliberately unsafe /update-get endpoint changes the dummy email if a session arrives. /update-combined always rejects GET with 405 and Allow: POST before authentication or mutation. Its rejection does not prove that a cookie was absent.</p>
      <a class="action" data-vector="probe-get" href="${target}/probe?experimentId=${experimentId}" target="_blank" rel="noopener">Navigate to read-only probe</a><br>
      <a class="action" data-vector="unsafe-get" href="${target}/update-get?email=unsafe-get@example.test&amp;experimentId=${experimentId}" target="_blank" rel="noopener">Navigate to deliberately unsafe GET</a><br>
      <a data-vector="protected-get" href="${target}/update-combined?email=unsafe-get@example.test&amp;experimentId=${experimentId}" target="_blank" rel="noopener">Compare protected GET endpoint</a></section>
    <section><h2>Simple credentialed fetch</h2>
      <p>This button posts a fixed dummy email to /update-vulnerable with credentials: include, URL-encoded data and no custom headers. It is a CORS-simple request, so it does not require a preflight. Include asks the browser to send eligible cookies; it does not bypass SameSite or privacy restrictions.</p>
      <p>The app does not grant this origin response access. A CORS error can therefore occur after the POST reached the server and changed preferences. Compare the original request, server inspector and actual state; the error text alone is not the outcome of the CSRF test.</p>
      <button id="btnFetch">Send credentialed fetch</button><pre id="fetchResult" role="status"></pre></section>
    <section><h2>Embedded read-only request</h2>
      <p>Load iframe probe inserts an iframe whose GET targets /probe. It is an embedded navigation, not a top-level link: cross-site Lax cookies are excluded here. SameSite=None may permit the cookie, but browser third-party-cookie restrictions can still prevent it. The sibling remains same-site. The endpoint only reports received cookie names and authentication; it changes no preferences. Inspect Network for the iframe request.</p>
      <button id="embed">Load iframe probe</button><div id="frame"></div></section>
    ${sibling ? `<section><h2>Cookie scope and localStorage</h2><p>Cookie names received by this hostname:</p>
      <pre id="scope-cookies">${escapeHtml(JSON.stringify(Object.keys(req.cookies)))}</pre>
      <p>This page automatically reads app_specific_secret from the sibling’s own localStorage. localStorage is scoped by origin, so the marker written on the app origin is not shared here. The cookie list above comes from this page’s incoming request, not document.cookie; a parent-domain marker can arrive here while app host-only cookies cannot. Refresh below navigates here again to update both observations.</p><pre id="scope-storage"></pre>
      <a href="/?experimentId=exp4-scope-boundaries">Refresh scope observation</a></section>` : ''}
    <script>
      const experimentId = ${JSON.stringify(experimentId)};
      document.getElementById('btnFetch').addEventListener('click', async () => {
        const output = document.getElementById('fetchResult');
        output.textContent = 'Sending...';
        try {
          const response = await fetch('${target}/update-vulnerable', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ email: 'fetch-attempt@example.test', experimentId }).toString()
          });
          output.textContent = 'Readable response: ' + response.status + ' ' + await response.text();
        } catch (error) {
          output.textContent = 'Browser-side response access error: ' + error.message +
            '. This does not prove the request was prevented. Inspect server headers and state.';
        }
      });
      document.getElementById('embed').addEventListener('click', () => {
        const frame = document.createElement('iframe');
        frame.title = 'Cross-origin read-only probe';
        frame.src = '${target}/probe?experimentId=' + encodeURIComponent(experimentId);
        document.getElementById('frame').replaceChildren(frame);
      });
      const storage = document.getElementById('scope-storage');
      if (storage) storage.textContent = JSON.stringify({ app_specific_secret: localStorage.getItem('app_specific_secret') });
    </script></body></html>`);
}
