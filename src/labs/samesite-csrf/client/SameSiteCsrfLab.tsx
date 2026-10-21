import { useEffect, useState } from 'react';
import { AttackSimulators } from './AttackSimulators.js';
import { controlRequest } from '../../../client/api.js';

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
      <p>Choose an explicit attribute. Each configuration invalidates the previous session and restores dummy state.</p>
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
