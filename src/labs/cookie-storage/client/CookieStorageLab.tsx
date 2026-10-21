import { useState, useEffect } from 'react';
import { ScriptHarness } from './ScriptHarness.js';
import { controlRequest } from '../../../client/api.js';

const base = '/api/labs/cookie-storage';
interface Profile { displayName: string; email: string }
export function CookieStorageLab({ activeExperimentId, onExperimentActionExecuted }: {
  activeExperimentId: string; onSelectExperiment: (id: string) => void; onExperimentActionExecuted?: (evidence?: Record<string, unknown>) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [output, setOutput] = useState<unknown>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headers = { 'X-Experiment-Id': activeExperimentId };

  async function refresh() {
    const response = await fetch(base + '/profile');
    const data = await response.json();
    setProfile(response.ok ? data.user : null);
  }
  useEffect(() => { refresh().catch(e => setError(String(e))); }, []);
  async function action(work: () => Promise<void>, attempt = false) {
    setBusy(true); setError('');
    try { await work(); if (attempt) onExperimentActionExecuted?.(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  async function probe(path: string, init: RequestInit = {}) {
    const res = await fetch(base + path, { ...init, headers: { ...headers, ...init.headers } });
    return { status: res.status, data: await res.json() };
  }
  return <div className="space-y-5">
    <section className="panel flex flex-wrap items-center justify-between gap-4">
      <div><p className="eyebrow">Fictional identity</p>
        <p>{profile ? profile.displayName : 'No active session'}</p>
        {profile && <p className="text-sm text-sky-300">{profile.email}</p>}</div>
      <div className="flex flex-wrap gap-2">
        <button className="action" disabled={busy} onClick={() => action(async () => {
          const data = await controlRequest(base + '/login', { experimentId: activeExperimentId });
          localStorage.setItem('auth_token', data.bearerToken); setProfile(data.user);
          setOutput(undefined); setMessage('Credentials issued. Now run the experiment action.');
        })}>Login / Issue Credentials</button>
        <button className="action secondary" disabled={busy} onClick={() => action(async () => {
          await controlRequest(base + '/logout');
          localStorage.removeItem('auth_token'); setProfile(null); setOutput(undefined); setMessage('Logged out! Credentials revoked.');
        })}>Logout / Revoke Session</button>
      </div>
    </section>
    {message && <p role="status" className="text-sky-300">{message}</p>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}

    {activeExperimentId === 'exp1-storage-types' && <section className="panel space-y-4">
      <h3 className="font-semibold">Direct JavaScript Storage Inspection</h3>
      <p>Issue credentials, then run actual reads of localStorage and document.cookie.</p>
      <button className="action" disabled={!profile || busy} onClick={() => {
        setOutput({ localStorageCredential: localStorage.getItem('auth_token'), documentCookie: document.cookie });
        onExperimentActionExecuted?.({ localStorageCredentialAccessible: Boolean(localStorage.getItem('auth_token')),
          readableCookieNames: document.cookie.split(';').filter(Boolean).map(c => c.trim().split('=')[0]) });
      }}>Inspect JavaScript Storage</button>
    </section>}

    {activeExperimentId === 'exp2-auth-mechanisms' && <>
      <section className="panel space-y-4"><h3 className="font-semibold">Compare authentication mechanisms</h3>
        <p>The bearer-only endpoint and cookie-only endpoint accept separate credentials.</p>
        <button className="action" disabled={!profile || busy} onClick={() => action(async () => {
          const token = localStorage.getItem('auth_token');
          setOutput({ cookieAutomaticallyAttached: await probe('/profile'),
            bearerNotAutomaticallyAttached: await probe('/bearer-profile'),
            bearerExplicitlyAttached: await probe('/bearer-profile', { headers: { Authorization: 'Bearer ' + token } }) });
        }, true)}>Compare Cookie and Bearer Authentication</button>
      </section>
      <ScriptHarness ready={Boolean(profile)} onExecuted={() => { refresh(); onExperimentActionExecuted?.(); }} />
    </>}

    {activeExperimentId === 'exp3-secure-transport' && <section className="panel space-y-4">
      <h3 className="font-semibold">Secure transport</h3>
      <p>Read the HTTPS probe, then navigate to the HTTP probe in a new tab.
        Top-level navigation avoids mixed-content fetch blocking. Return here to inspect both requests.</p>
      <button className="action" disabled={!profile || busy} onClick={() => action(async () => {
        setOutput(await probe('/transport'));
      }, true)}>Read HTTPS Probe</button>{' '}
      <a className="action secondary" href={'http://app.security-lab.test:8080/probe/cookies?experimentId=' + activeExperimentId}
        target="_blank" rel="noopener">Open HTTP Probe Directly (New Tab)</a>
    </section>}

    {activeExperimentId === 'exp4-scope-boundaries' && <section className="panel space-y-4">
      <h3 className="font-semibold">Host, domain and path scope</h3>
      <button className="action" disabled={busy} onClick={() => action(async () => {
        const data = await controlRequest(base + '/cookies/scope-test');
        localStorage.setItem('app_specific_secret', 'fictional_app_marker'); setMessage(data.message);
      })}>1. Issue Scoped Cookies</button>{' '}
      <button className="action secondary" disabled={busy} onClick={() => action(async () => {
        setOutput({ matchingPath: await probe('/subpath/check'), outsidePath: await probe('/outside/check') });
      }, true)}>2. Compare Path Probes</button>{' '}
      <a className="action secondary" href={'https://sibling.security-lab.test:8443/?experimentId=' + activeExperimentId}
        target="_blank" rel="noopener">3. Open Sibling Site (New Tab)</a>
    </section>}

    {activeExperimentId === 'exp5-expiration-lifecycles' && <section className="panel space-y-4">
      <h3 className="font-semibold">Expiration and invalidation</h3>
      <p>Issue a session cookie, a persistent cookie with Max-Age=5s, and an HttpOnly session
        with a server lifetime of 3s. Probe immediately and again after five seconds.</p>
      <button className="action" disabled={busy} onClick={() => action(async () => {
        const data = await controlRequest(base + '/cookies/lifecycles'); setMessage(data.message);
      })}>Set Lifecycle Cookies</button>{' '}
      <button className="action secondary" disabled={busy} onClick={() => action(async () => {
        setOutput({ browserVisibleCookies: document.cookie, serverSession: await probe('/expired-profile') });
      }, true)}>Check Browser and Server Expiry</button>{' '}
      <button className="action secondary" disabled={busy} onClick={() => action(async () => {
        await controlRequest(base + '/logout'); localStorage.removeItem('auth_token'); setProfile(null);
        setOutput(await probe('/profile')); setMessage('Logged out! All Lab 1 credentials revoked.');
      }, true)}>Explicit Logout (Server Revocation)</button>
    </section>}
    {output !== undefined && <pre data-testid="experiment-output" className="result">{JSON.stringify(output, null, 2)}</pre>}
  </div>;
}
