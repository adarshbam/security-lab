import { useState } from 'react';
import { KeyRound, FileKey2, Send, Copy, LogOut } from 'lucide-react';
import { controlRequest } from '../../../client/api.js';
import { demoUsers } from '../fixtures/accounts.js';
import { inspectToken, editClaims, unsignedToken, signWithPublicKey } from './tokens.js';

const base = '/api/labs/exployting-jwt-tokens';
const inputClass = 'w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200';
type Result = { label: string; status: number; data: Record<string, any> };
type Props = { activeExperimentId: string; onSelectExperiment: (id: string) => void;
  onExperimentActionExecuted?: (evidence?: Record<string, unknown>) => void };

export function JwtLab({ activeExperimentId: id, onExperimentActionExecuted }: Props) {
  const scenario = id.replace('jwt-', '');
  const [account, setAccount] = useState('adarsh');
  const [password, setPassword] = useState('pass123');
  const [ttl, setTtl] = useState(300);
  const [original, setOriginal] = useState('');
  const [token, setToken] = useState('');
  const [payload, setPayload] = useState('');
  const [pem, setPem] = useState('');
  const [view, setView] = useState('admin');
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cookiesReady, setCookiesReady] = useState(false);
  const [storageEvidence, setStorageEvidence] = useState<Record<string, unknown>>();
  const [padding, setPadding] = useState(4096);
  const [repeats, setRepeats] = useState(3);
  const [sizeEvidence, setSizeEvidence] = useState<Record<string, any>>();
  let decoded;
  try { decoded = token ? inspectToken(token) : null; } catch { decoded = null; }

  async function work(task: () => Promise<void>) {
    setBusy(true); setError('');
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  function loadToken(value: string) {
    setToken(value); setPayload(JSON.stringify(inspectToken(value).payload, null, 2));
  }
  function editedPayload() {
    const value = JSON.parse(payload);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload must be a JSON object');
    return value;
  }
  async function request(path: string, credential?: string, init: RequestInit = {}): Promise<Result> {
    const response = await fetch(base + path, { ...init, credentials: credential === undefined ? 'same-origin' : 'omit',
      headers: { 'X-Experiment-Id': id, ...(credential !== undefined && { Authorization: 'Bearer ' + credential }), ...init.headers } });
    return { label: path, status: response.status, data: await response.json() };
  }
  async function login() {
    const data = await controlRequest(base + '/login', { username: account, password, scenario, ttl, experimentId: id });
    setOriginal(data.token); loadToken(data.token); setResults([]);
    setMessage(`Signed ${scenario === 'confusion' ? 'RS256' : 'HS256'} token issued for ${account}. Preparing edits is not an experiment attempt.`);
    if (scenario === 'confusion') {
      const response = await fetch(base + '/public-key'); setPem(await response.text());
    }
  }
  async function send(variant: string) {
    const result = await request(`/${scenario}/dashboard/${variant}?view=${view}`, token);
    setResults(previous => [result, ...previous].slice(0, 6));
    onExperimentActionExecuted?.({ lastRequest: { status: result.status, endpoint: result.label,
      library: result.data.library, authenticated: result.data.authenticated ?? false } });
  }

  // #region cookie-script
  async function inspectCookies() {
    const readable = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('jwt_lab_readable='));
    const names = document.cookie.split(';').filter(Boolean).map(c => c.trim().split('=')[0]).filter(n => n.startsWith('jwt_lab_'));
    const evidence = { readableCredentialAccessible: Boolean(readable), visibleJwtCookieNames: names,
      readableCookieAuthentication: await request('/cookies/profile/readable'),
      httpOnlyCookieAuthentication: await request('/cookies/profile/httponly') };
    setStorageEvidence(evidence); onExperimentActionExecuted?.(evidence);
  }
  async function sameOriginAction() {
    // Assumes script execution already exists. HttpOnly does not stop same-origin requests.
    const csrf = await request('/cookies/csrf-token');
    if (csrf.status !== 200) throw new Error('Issue fresh JWT cookies first');
    const result = await request('/cookies/preference', undefined, { method: 'POST', headers: { 'X-CSRF-Token': csrf.data.csrfToken } });
    setResults([result]); onExperimentActionExecuted?.({ status: result.status, preference: result.data.preference });
  }
  // #endregion cookie-script

  async function measure() {
    const samples: Record<string, any>[] = [];
    for (const bytes of [0, padding]) {
      const issued = await controlRequest(base + '/login', { username: account, password, scenario: 'size', padding: bytes, experimentId: id });
      const responses: Result[] = [];
      for (let i = 0; i < repeats; i++) responses.push(await request('/size/verify', issued.token));
      if (responses.some(r => r.status !== 200)) throw new Error('A verification request failed. See the request inspector.');
      samples.push({ paddingBytes: bytes, tokenBytes: issued.tokenBytes, requestCount: responses.length,
        authorizationBytesPerRequest: responses[0].data.authorizationValueBytes,
        totalAuthorizationValueBytes: responses.reduce((sum, r) => sum + r.data.authorizationValueBytes, 0),
        verificationSamplesMs: responses.map(r => r.data.verificationMs),
        profileReadsBefore: responses[0].data.profileReadsBefore, profileReadsAfter: responses.at(-1)!.data.profileReadsAfter });
    }
    setSizeEvidence({ samples, scope: 'Actual Authorization header values; other headers, TLS and responses excluded. Timings are noisy samples, not a database benchmark.' });
    onExperimentActionExecuted?.({ samples });
  }

  return <div className="jwt-lab space-y-6 min-w-0">
    <div className="jwt-workbench flex flex-wrap items-center justify-between gap-6">
      <div className="flex gap-4 items-center"><KeyRound aria-hidden="true" className="w-6 h-6 text-sky-400 shrink-0" />
        <div><h3 className="font-semibold text-slate-100">Create a token. Change one thing. Observe.</h3>
          <p className="text-sm text-slate-400 mt-2">Fictional accounts · Real libraries · Local HTTPS</p></div></div>
      <div className="flex flex-wrap gap-2 text-sm font-mono text-slate-400">
        {(scenario === 'confusion' ? ['4.0.0 → 9.0.3'] : scenario === 'none' ? ['8.5.1 → 9.0.3'] : ['jsonwebtoken 9.0.3']).map(v =>
          <span key={v}>{v}</span>)}
      </div>
    </div>

    {scenario !== 'storage' && <section className="panel space-y-4">
      <h3 className="font-semibold text-slate-100">1 · Sign in with a fictional account</h3>
      <p className="text-xs text-slate-400">Published demo passwords are only for this lab. No real account or database is involved.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="space-y-1 text-xs">Demo account<select aria-label="Demo account" className={inputClass} value={account} onChange={e => {
          setAccount(e.target.value); setPassword(demoUsers.find(u => u.username === e.target.value)!.password);
        }}>{demoUsers.map(u => <option key={u.username} value={u.username}>{u.username} ({u.role})</option>)}</select></label>
        <label className="space-y-1 text-xs">Demo password<input aria-label="Demo password" className={inputClass} value={password} onChange={e => setPassword(e.target.value)} /></label>
        {scenario !== 'size' && <label className="space-y-1 text-xs">Token lifetime (seconds)<input aria-label="Token lifetime" type="number" min={1} max={300} value={ttl} className={inputClass} onChange={e => setTtl(Number(e.target.value))} /></label>}
      </div>
      <div className="flex flex-wrap gap-2">
        {scenario !== 'size' && <button className="action" disabled={busy} onClick={() => work(login)}>Sign in / Issue JWT</button>}
        <button className="action secondary" disabled={busy} onClick={() => work(async () => {
          await controlRequest(base + '/logout'); setOriginal(''); setToken(''); setPayload(''); setPem(''); setResults([]); setSizeEvidence(undefined);
          setMessage('Logged out. All JWT lab credentials revoked; other labs are unchanged.');
        })}><LogOut className="w-4 h-4 mr-2" />Logout / Revoke JWTs</button>
      </div>
    </section>}

    {(busy || message) && <p role="status" className="text-sm text-sky-300">{busy ? 'Running local browser requests…' : message}</p>}
    {error && <p role="alert" className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>}

    {['decode', 'confusion', 'none'].includes(scenario) && <>
      <section className="panel space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="font-semibold text-slate-100">2 · Inspect & edit the working token</h3>
          <span className="text-xs font-mono text-slate-400">{new TextEncoder().encode(token).length} bytes · decoded claims are untrusted</span></div>
        <label className="block space-y-2 text-xs">Working JWT<textarea aria-label="Working JWT" rows={3} spellCheck={false} className={inputClass + ' font-mono break-all'} value={token} onChange={e => setToken(e.target.value)} placeholder="Issue a token to begin" /></label>
        <div className="grid lg:grid-cols-[1fr_2fr] gap-4">
          <div className="space-y-2"><h4 className="text-xs text-slate-400">Decoded header (unverified)</h4><pre className="result" data-testid="jwt-header">{decoded ? JSON.stringify(decoded.header, null, 2) : 'No readable token yet'}</pre>
            <p className="text-xs text-slate-500">Reading JSON does not prove who issued it. Edit any claim below; the server response is the evidence.</p></div>
          <label className="space-y-2 text-xs">Editable payload JSON<textarea aria-label="Editable payload JSON" rows={10} spellCheck={false} className={inputClass + ' font-mono'} value={payload} onChange={e => setPayload(e.target.value)} placeholder="Decoded payload appears here" /></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="action secondary" disabled={!token || busy} onClick={() => work(async () => {
            loadToken(token); setMessage('Working token decoded into the editor. Its claims are still unverified.');
          })}>Decode working token into editor</button>
          <button className="action secondary" disabled={!original || busy} onClick={() => work(async () => { setToken(editClaims(token, editedPayload())); setMessage('Payload applied with the existing signature. Send it to observe the outcome.'); })}>Apply payload / keep signature</button>
          {scenario === 'none' && <button className="action secondary" disabled={!original || busy} onClick={() => work(async () => { setToken(unsignedToken(token, editedPayload())); setMessage('Unsigned token prepared. No verification request has been sent.'); })}>Prepare unsigned token</button>}
          <button className="action secondary" disabled={!original || busy} onClick={() => { loadToken(original); setMessage('Original signed token restored.'); }}>Restore signed token</button>
          <button className="action secondary" disabled={!token || busy} onClick={() => work(async () => { await navigator.clipboard.writeText(token); setMessage('Working token copied. Keep fictional tokens local.'); })}><Copy className="w-4 h-4 mr-2" />Copy token</button>
        </div>
        {scenario === 'confusion' && <div className="space-y-3 border-t border-slate-800 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-sm">Public-key experiment</h4>
            <a className="text-xs text-sky-300 underline inline-flex gap-2" href={base + '/public-key'} download><FileKey2 className="w-4 h-4" />Download lab public key</a></div>
          <label className="block space-y-2 text-xs">Public PEM used as HMAC input<textarea aria-label="Public PEM used as HMAC input" rows={4} className={inputClass + ' font-mono text-xs'} value={pem} onChange={e => setPem(e.target.value)} /></label>
          <p className="text-xs text-slate-400">The public key is intentionally public. This operation uses its exact text bytes in browser WebCrypto; no private key leaves the server.</p>
          <button className="action secondary" disabled={!token || !pem || busy} onClick={() => work(async () => {
            setToken(await signWithPublicKey(token, editedPayload(), pem)); setMessage('Browser HMAC token prepared. Send it to both implementations.');
          })}>Sign HS256 with public PEM</button>
        </div>}
      </section>
      <section className="panel space-y-4">
        <h3 className="font-semibold text-slate-100">3 · Send the token & compare responses</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs">Requested resource<select aria-label="Requested resource" className={inputClass} value={view} onChange={e => setView(e.target.value)}>
            <option value="admin">Admin directory</option><option value="profile">My profile</option></select></label>
          <button className="action" disabled={!token || busy} onClick={() => work(() => send('vulnerable'))}><Send className="w-4 h-4 mr-2" />Send to vulnerable dashboard</button>
          <button className="action secondary" disabled={!token || busy} onClick={() => work(() => send('protected'))}>Send to protected dashboard</button>
        </div>
        <p className="text-xs text-slate-400">These requests explicitly attach the working token as a bearer header and omit cookies. Inspect the authentication result and directory access separately.</p>
      </section>
    </>}

    {scenario === 'storage' && <section className="panel space-y-4">
      <h3 className="font-semibold text-slate-100">JWT is a format. Cookie flags control script access.</h3>
      <p>Issue two independent JWT cookies for adarsh, inspect actual JavaScript access and request a profile using each cookie. This exercise assumes same-origin script execution already exists.</p>
      <div className="flex flex-wrap gap-2">
        <button className="action" disabled={busy} onClick={() => work(async () => {
          await controlRequest(base + '/cookies/login', { experimentId: id }); setCookiesReady(true); setStorageEvidence(undefined); setResults([]);
          setMessage('JWT cookies issued. Run a browser action to record an attempt.');
        })}>Issue JWT cookies</button>
        <button className="action secondary" disabled={!cookiesReady || busy} onClick={() => work(inspectCookies)}>Inspect JWT cookies & authentication</button>
        <button className="action secondary" disabled={!cookiesReady || busy} onClick={() => work(sameOriginAction)}>Run fixed same-origin JWT action</button>
      </div>
      {storageEvidence && <pre className="result" data-testid="jwt-storage-evidence">{JSON.stringify(storageEvidence, null, 2)}</pre>}
    </section>}

    {scenario === 'size' && <section className="panel space-y-4">
      <h3 className="font-semibold text-slate-100">2 · Measure actual authenticated requests</h3>
      <p>Compare a small signed token with the same identity plus a fictional profile-notes claim. Each request goes through the protected verifier. Authentication performs no profile-data lookup.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-xs space-y-1">Extra ASCII claim bytes<select aria-label="Extra claim bytes" className={inputClass} value={padding} onChange={e => setPadding(Number(e.target.value))}>
          {[256, 1024, 2048, 4096].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="text-xs space-y-1">Requests per token<select aria-label="Requests per token" className={inputClass} value={repeats} onChange={e => setRepeats(Number(e.target.value))}>
          {[1, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      <button className="action" disabled={busy} onClick={() => work(measure)}>Run token-size comparison</button>
      {sizeEvidence && <div className="space-y-4" data-testid="jwt-size-evidence">
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="text-left text-slate-400 mb-3">Actual Authorization value bytes received by Express</caption>
          <thead><tr className="border-b border-slate-700"><th className="p-2">Token</th><th className="p-2">JWT bytes</th><th className="p-2">Per request</th><th className="p-2">Total ({sizeEvidence.samples[0].requestCount} requests)</th></tr></thead>
          <tbody>{sizeEvidence.samples.map((s: any, i: number) => <tr key={i} className="border-b border-slate-800"><th className="p-2 font-medium">{i ? 'Extra claims' : 'Small claims'}</th><td className="p-2">{s.tokenBytes}</td><td className="p-2">{s.authorizationBytesPerRequest}</td><td className="p-2">{s.totalAuthorizationValueBytes}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-slate-400">{sizeEvidence.scope}</p>
        <details><summary className="cursor-pointer text-xs text-sky-300">Raw measurements</summary><pre className="result mt-3">{JSON.stringify(sizeEvidence, null, 2)}</pre></details>
      </div>}
    </section>}

    {results.length > 0 && <section aria-label="JWT response history" className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">Actual response history · newest first</h3>
      {results.map((r, i) => <article key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center text-xs"><span className={`rounded px-2 py-1 font-mono ${r.status < 400 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-200'}`}>HTTP {r.status}</span>
          <span className="font-mono break-all text-slate-400">{r.label}</span></div>
        {r.data.users && <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="text-left mb-2 text-slate-400 text-xs">Data actually returned by this endpoint</caption>
          <thead><tr><th className="p-2">Username</th><th className="p-2">Role</th><th className="p-2">Fictional email</th></tr></thead>
          <tbody>{r.data.users.map((u: any) => <tr key={u.username} className="border-t border-slate-800"><td className="p-2">{u.username}</td><td className="p-2">{u.role}</td><td className="p-2">{u.email}</td></tr>)}</tbody></table></div>}
        <details><summary className="cursor-pointer text-xs text-sky-300">Response JSON</summary>
          <pre className="result mt-3" data-testid="jwt-response">{JSON.stringify({ status: r.status, ...r.data }, null, 2)}</pre>
        </details>
      </article>)}
    </section>}
  </div>;
}
