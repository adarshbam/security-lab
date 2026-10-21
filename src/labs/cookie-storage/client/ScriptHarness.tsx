import { useState } from 'react';
import { executeHarness } from './harness.js';

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
    <p>This exercise assumes JavaScript already executes on this origin. The fixed script reads storage,
      obtains a same-origin CSRF token and attempts a dummy email change. Nothing is sent to an external service.</p>
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
