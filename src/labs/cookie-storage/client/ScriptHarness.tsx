import { useState } from 'react';
import { executeHarness } from './harness.js';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';

export function ScriptHarness({ ready, onExecuted }: { ready: boolean; onExecuted?: () => void }) {
  const [output, setOutput] = useState<Awaited<ReturnType<typeof executeHarness>>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    setBusy(true); setError('');
    try { setOutput(await executeHarness()); onExecuted?.(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <section className="panel space-y-4">
    <h3 className="text-lg font-semibold">Fixed same-origin script harness</h3>
    <ActionExplanation title="Before running the fixed script">
      <p>This button runs a predefined function as JavaScript already executing on the app’s origin. It does not find or exploit an injection point. It reads auth_token and document.cookie, fetches /csrf-token using the browser’s HttpOnly session cookie, then posts a fixed dummy email to /profile/update with X-CSRF-Token. It sends no bearer header and does not extract the HttpOnly value.</p>
      <p>The update checks the session, exact app Origin and session-bound CSRF token, then changes only Alice’s fictional email to attacker-controlled@evil.test. The page refreshes /profile afterward. Inspect both requests and the changed profile: HttpOnly prevents script reads of the cookie, but same-origin script can still use the session and read the CSRF token. All requests stay within this local lab.</p>
    </ActionExplanation>
    <button className="action" disabled={!ready || busy} onClick={run}>Execute Injected Script Harness</button>
    {error && <p role="alert">{error}</p>}
    {output && <div data-testid="harness-output" className="space-y-3">
      <p>{output.localToken ? 'localStorage credential accessible' : 'No localStorage credential found'}</p>
      <p>{output.readableCookies.split(';').some(c => c.trim().startsWith('session_httponly='))
        ? 'HttpOnly cookie unexpectedly readable' : 'session_httponly absent from document.cookie'}</p>
      <p>{output.status === 200 ? 'Authenticated action succeeded' : 'Authenticated action rejected'} (Status: {output.status})</p>
      <pre className="result">{JSON.stringify({ localTokenAccessible: Boolean(output.localToken),
        readableCookieAccessible: output.readableCookies.includes('session_readable='),
        status: output.status, serverResponse: output.response }, null, 2)}</pre>
    </div>}
  </section>;
}
