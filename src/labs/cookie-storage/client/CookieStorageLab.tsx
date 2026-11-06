import { useState, useEffect } from 'react';
import { ScriptHarness } from './ScriptHarness.js';
import { controlRequest } from '../../../client/api.js';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';

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
    <ActionExplanation title="What the identity controls do">
      <p>Login is a fictional credential issuer, with no password check. It posts to /login, resets this lab’s server state and invalidates its old credentials. The response sets session_httponly and session_readable as separate Secure, SameSite=Lax cookies. Only the first is HttpOnly. It also sets secure_session and plain_diagnostic as harmless transport markers; the diagnostic cookie has no Secure flag.</p>
      <p>The JSON response contains a third, independent bearerToken. This page writes it to localStorage as auth_token. The server retains the opaque session and bearer credentials with ten-minute lifetimes; they are not JWTs. session_readable can authenticate /readable-profile, but cannot reveal the separate HttpOnly credential. localStorage is readable by scripts on this origin; it is never automatically attached to a request. Inspect the login response’s Set-Cookie headers and JSON in Network, then the stored values in Application. HttpOnly hides a cookie from document.cookie, not from DevTools.</p>
      <p>View my profile sends GET /profile. The browser attaches eligible cookies automatically; this action sends no Authorization header. The server checks only session_httponly against its live sessions, returning 200 with Alice’s current profile or 401. Loading this workbench also makes this read. Logout posts to /logout, resets the fictional profile, revokes all this lab’s server credentials, clears its cookies, and removes auth_token from localStorage.</p>
    </ActionExplanation>
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
        <button className="action secondary" disabled={!profile || busy} onClick={() => action(async () => {
          setOutput(await probe('/profile'));
        })}>View my profile</button>
      </div>
    </section>
    {message && <p role="status" className="text-sky-300">{message}</p>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}

    {activeExperimentId === 'exp1-storage-types' && <section className="panel space-y-4">
      <h3 className="font-semibold">Direct JavaScript Storage Inspection</h3>
      <ActionExplanation title="Before inspecting storage">
        <p>This button runs localStorage.getItem('auth_token') and document.cookie in this page. It reports whether the local token exists and which cookies JavaScript can read. It sends no HTTP request and changes no server state. Compare its output with Application → Cookies: session_httponly can be stored there while absent from the JavaScript result.</p>
      </ActionExplanation>
      <button className="action" disabled={!profile || busy} onClick={() => {
        const storage = { localStorageCredentialAccessible: Boolean(localStorage.getItem('auth_token')),
          readableCookieNames: document.cookie.split(';').filter(Boolean).map(c => c.trim().split('=')[0]) };
        setOutput(storage);
        onExperimentActionExecuted?.(storage);
      }}>Inspect JavaScript Storage</button>
    </section>}

    {activeExperimentId === 'exp2-auth-mechanisms' && <>
      <section className="panel space-y-4"><h3 className="font-semibold">Compare authentication mechanisms</h3>
        <ActionExplanation title="Before comparing authentication">
          <p>One click automates three GET requests: /profile with browser-managed cookies; /bearer-profile without an Authorization header; then /bearer-profile with Authorization: Bearer followed by auth_token from localStorage. Cookies may accompany all three, but the bearer endpoint ignores them and checks only the header token against its server-side bearer registry.</p>
          <p>After fresh login, expect 200, 401, then 200. These reads do not change Alice’s profile. Inspect each request separately in Network; the results distinguish possession of a stored token from explicitly sending it.</p>
        </ActionExplanation>
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
      <ActionExplanation title="Before comparing transports">
        <p>Read HTTPS Probe sends GET /transport and returns the cookie names the server received. The HTTP link opens a top-level GET to app.security-lab.test:8080/probe/cookies, avoiding an HTTPS page’s mixed-content fetch restriction. Both probes are read-only and do not authenticate a profile.</p>
        <p>The browser should omit Secure cookies over HTTP while sending plain_diagnostic as a positive control. Cookies are not scoped by port. Compare the actual Cookie headers and returned names; a missing cookie alone does not prove a transport rule unless it was issued and otherwise eligible.</p>
      </ActionExplanation>
      <button className="action" disabled={!profile || busy} onClick={() => action(async () => {
        setOutput(await probe('/transport'));
      }, true)}>Read HTTPS Probe</button>{' '}
      <a className="action secondary" href={'http://app.security-lab.test:8080/probe/cookies?experimentId=' + activeExperimentId}
        target="_blank" rel="noopener">Open HTTP Probe Directly (New Tab)</a>
    </section>}

    {activeExperimentId === 'exp4-scope-boundaries' && <section className="panel space-y-4">
      <h3 className="font-semibold">Host, domain and path scope</h3>
      <ActionExplanation title="Before issuing and probing scoped cookies">
        <p>Step 1 posts to /cookies/scope-test. Set-Cookie creates a host-only cookie, a Domain=security-lab.test cookie, and a cookie restricted to /api/labs/cookie-storage/subpath. The page also writes app_specific_secret=fictional_app_marker to its own localStorage. These are markers, not login credentials.</p>
        <p>Step 2 automates GET /subpath/check and /outside/check and displays the received cookie names. Only the matching path should receive cookie_path_restricted. Step 3 navigates to the sibling hostname: it can receive cookie_parent_domain, but not the app’s host-only cookies. Its page reads its own localStorage key, so the app’s marker should be absent there. Path limits cookie transmission; it is not an isolation boundary against same-origin scripts.</p>
      </ActionExplanation>
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
      <ActionExplanation title="Before testing expiration">
        <p>Set Lifecycle Cookies posts to /cookies/lifecycles. It sets cookie_session_lifecycle without an expiry, cookie_persistent_5s with Max-Age=5, and HttpOnly server_expiry_session with no browser expiry but a three-second server lifetime. Browser session restore can retain session cookies; closing a tab is not a reliable expiry test.</p>
        <p>Check Browser and Server Expiry reads document.cookie and sends GET /expired-profile. That endpoint checks only server_expiry_session. Check immediately, then again after five seconds: the persistent marker should disappear, while the HttpOnly session cookie can remain stored and still receive 401 because its server session expired. The hidden cookie will never appear in the JavaScript name list.</p>
        <p>Explicit Logout revokes this storage lab’s credentials, restores the fictional profile and clears its cookies; the page removes auth_token and immediately probes /profile to show 401. Inspect cookie storage separately from the server’s authentication decision.</p>
      </ActionExplanation>
      <button className="action" disabled={busy} onClick={() => action(async () => {
        const data = await controlRequest(base + '/cookies/lifecycles'); setMessage(data.message);
      })}>Set Lifecycle Cookies</button>{' '}
      <button className="action secondary" disabled={busy} onClick={() => action(async () => {
        setOutput({ readableCookieNames: document.cookie.split(';').filter(Boolean).map(c => c.trim().split('=')[0]),
          serverSession: await probe('/expired-profile') });
      }, true)}>Check Browser and Server Expiry</button>{' '}
      <button className="action secondary" disabled={busy} onClick={() => action(async () => {
        await controlRequest(base + '/logout'); localStorage.removeItem('auth_token'); setProfile(null);
        setOutput(await probe('/profile')); setMessage('Logged out! All storage lab credentials revoked.');
      }, true)}>Explicit Logout (Server Revocation)</button>
    </section>}
    {output !== undefined && <pre data-testid="experiment-output" className="result">{JSON.stringify(output, null, 2)}</pre>}
  </div>;
}
