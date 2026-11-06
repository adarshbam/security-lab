import { useEffect, useState } from 'react';
import { AttackSimulators } from './AttackSimulators.js';
import { controlRequest } from '../../../client/api.js';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';

const base = '/api/labs/samesite-csrf';
export function SameSiteCsrfLab({ activeExperimentId, onExperimentActionExecuted }: {
  activeExperimentId: string; onSelectExperiment: (id: string) => void; onExperimentActionExecuted?: () => void;
}) {
  const [state, setState] = useState<{ preferences: { email: string; lastUpdatedBy: string }; cookieMode: string }>();
  const [mode, setMode] = useState('');
  const [defense, setDefense] = useState('combined');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch(base + '/preferences');
    setState(await response.json());
  }
  useEffect(() => {
    const update = () => refresh().catch(e => setError(String(e)));
    update();
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  async function action(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <section className="panel space-y-4">
      <h3 className="text-lg font-semibold">SameSite Cookie Policy Selector</h3>
      <ActionExplanation title="Before choosing a cookie policy">
        <p>Each button posts the selected mode to /configure-cookie. The server resets this lab’s preferences, revokes its previous sessions and CSRF tokens, and creates a fresh session plus a session-bound CSRF token. Set-Cookie stores session_csrf as a host-only, Secure, HttpOnly cookie with the chosen SameSite value. No bearer token is created or stored in localStorage.</p>
        <p>The browser decides whether to attach this cookie to each later request. Strict excludes cross-site requests; explicit Lax permits cross-site top-level safe navigation such as GET, but not POST or embedded requests; None permits cross-site use subject to browser privacy rules. These are site rules, so the same-site sibling can still send a Strict cookie to the app. Network shows what was actually sent; Application shows the stored policy.</p>
      </ActionExplanation>
      <div className="flex flex-wrap gap-3">{(['strict', 'lax', 'none'] as const).map(value =>
        <button key={value} className={'action ' + (mode === value ? '' : 'secondary')} disabled={busy}
          onClick={() => action(async () => {
            const data = await controlRequest(base + '/configure-cookie', { mode: value });
            setMode(value); setMessage(data.message);
          })}>{value === 'strict' ? 'SameSite=Strict' : value === 'lax' ? 'SameSite=Lax (Explicit)' : 'SameSite=None (Requires Secure)'}</button>
      )}</div>
    </section>
    {message && <p className="text-sky-300" role="status">{message}</p>}
    {error && <p className="text-rose-300" role="alert">{error}</p>}
    <section className="panel space-y-4">
      <h3 className="font-semibold">Actual dummy profile state</h3>
      <ActionExplanation title="Before refreshing or resetting preferences">
        <p>Refresh sends read-only GET /preferences. This diagnostic endpoint exposes the fictional email, lastUpdatedBy and configured mode without requiring authentication; seeing the email here does not prove a session was accepted. The page also refreshes on load, after its actions and when you return focus to it.</p>
        <p>Reset Lab Preferences posts to /reset-preferences and restores only the dummy preferences. It retains the current session and CSRF token so you can repeat a comparison under the same cookie policy.</p>
      </ActionExplanation>
      <p data-testid="preference-email" className="font-mono text-sky-300 break-all">{state?.preferences.email}</p>
      <p className="text-sm">Last updated by: {state?.preferences.lastUpdatedBy}</p>
      <div className="flex flex-wrap gap-3">
        <button className="action secondary" onClick={() => refresh().catch(e => setError(String(e)))}>Refresh Profile State</button>
        <button className="action secondary" disabled={busy} onClick={() => action(async () => {
          const data = await controlRequest(base + '/reset-preferences'); setMessage(data.message);
        })}>Reset Lab Preferences</button>
      </div>
    </section>
    <AttackSimulators activeExperimentId={activeExperimentId} />
    <section className="panel space-y-4">
      <h3 className="font-semibold">Legitimate request — positive control</h3>
      <ActionExplanation title="Before sending the positive control">
        <p>Changing the defense selector only chooses a destination. Clicking the action automates GET /csrf-token, then POST /update- followed by that defense name. The POST contains a fixed legitimate email and the returned csrfToken in JSON. The browser supplies the cookie and app Origin; you do not have to assemble them manually.</p>
        <p>Every POST first checks session_csrf: no valid session returns 401. The vulnerable endpoint adds no CSRF defense; token requires the matching session token; origin requires the exact app Origin; combined requires both. A failed defense returns 403 without changing preferences. Success returns 200 and stores the new email and endpoint name in lastUpdatedBy. Inspect the request body, Cookie and Origin headers, then the state refresh.</p>
      </ActionExplanation>
      <label className="block">Endpoint defense <select className="ml-3 bg-slate-950 p-2 rounded border border-slate-700"
        aria-label="Endpoint defense" value={defense} onChange={e => setDefense(e.target.value)}>
        {['vulnerable', 'token', 'origin', 'combined'].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <button className="action" disabled={busy} onClick={() => action(async () => {
        const tokenResponse = await fetch(base + '/csrf-token');
        if (!tokenResponse.ok) throw new Error('Configure a cookie first');
        const { csrfToken } = await tokenResponse.json();
        const response = await fetch(base + '/update-' + defense, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Experiment-Id': activeExperimentId },
          body: JSON.stringify({ email: 'legitimate-learner@security-lab.test', csrfToken }),
        });
        setMessage('Legitimate request returned HTTP ' + response.status);
        onExperimentActionExecuted?.();
      })}>Legitimate Same-Origin Action (Positive Control)</button>
    </section>
  </div>;
}
