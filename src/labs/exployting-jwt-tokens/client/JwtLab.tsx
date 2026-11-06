import { useState } from 'react';
import { KeyRound, FileKey2, Send, Copy, LogOut } from 'lucide-react';
import { controlRequest } from '../../../client/api.js';
import { demoUsers } from '../fixtures/accounts.js';
import { inspectToken, editClaims, unsignedToken, signWithPublicKey } from './tokens.js';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';

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
      <ActionExplanation title="Before issuing or revoking a JWT">
        {scenario === 'size' ? <p>The account selector fills its published demo password. Run token-size comparison below uses those credentials to issue the two measurement tokens; there is no separate sign-in step for this experiment. Tokens remain in the measurement function’s memory, with no JWT cookie or localStorage write.</p> : <>
          <p>The account selector fills its published demo password. Sign in posts the username, password, scenario and lifetime to /login. The server checks the fictional account and returns a signed JWT in JSON: RS256 for the confusion lesson, HS256 otherwise. Claims include the subject, role, issuer, audience, expiry, token ID and this lab’s reset epoch.</p>
          <p>The page keeps the original and working JWT in React memory and fills the payload editor. This login sets no cookies and writes no JWT to localStorage. For the confusion lesson it also fetches /public-key to fill the PEM editor. Issuing a token does not send it to a dashboard or demonstrate an attack.</p>
        </>}
        <p>Logout posts to /logout, rotates this lab’s signing keys and epoch, clears its JWT cookies and CSRF-token map, and resets counters and the dummy preference. All previously issued JWTs fail this lab’s checks afterward. The page clears its token editors and results. This reset applies across JWT scenarios, including the deliberately vulnerable verifiers.</p>
      </ActionExplanation>
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
        <ActionExplanation title="Before editing the working credential">
          <p>Typing in either editor changes only local page state. Decode reads the working token’s base64url JSON into the payload editor without verifying it. Apply payload replaces the encoded claims while keeping the existing signature, which will no longer authenticate modified claims. Restore reloads the original signed token; Copy writes the working string to your clipboard. None of these controls sends a verification request.</p>
          {scenario === 'none' && <p>Prepare unsigned token sets alg to none, encodes your edited payload and removes the signature. This prepares the historical missing-key test locally; acceptance is determined only when you send it to a dashboard.</p>}
        </ActionExplanation>
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
          <ActionExplanation title="Before using the public PEM">
            <p>Download makes GET /public-key and saves the server’s public RSA key. Sign HS256 with public PEM uses the exact text bytes in the editor as an HMAC secret in browser WebCrypto, signs the edited payload and replaces the working token. It sends no dashboard request and obtains no private key.</p>
            <p>This tests whether a verifier confuses a public verification key with a symmetric signing secret. The historical 4.0.0 endpoint accepts the token’s algorithm without fixing it to RS256; the protected endpoint fixes RS256 and checks key type through the current library.</p>
          </ActionExplanation>
          <button className="action secondary" disabled={!token || !pem || busy} onClick={() => work(async () => {
            setToken(await signWithPublicKey(token, editedPayload(), pem)); setMessage('Browser HMAC token prepared. Send it to both implementations.');
          })}>Sign HS256 with public PEM</button>
        </div>}
      </section>
      <section className="panel space-y-4">
        <h3 className="font-semibold text-slate-100">3 · Send the token & compare responses</h3>
        <ActionExplanation title="Before sending to a dashboard">
          <p>Each button makes GET to the selected scenario’s vulnerable or protected dashboard with view=admin or view=profile. The workbench explicitly sets Authorization: Bearer followed by the working JWT and uses credentials: omit, so cookies cannot authenticate these requests. The requested resource selector itself sends nothing.</p>
          <p>{scenario === 'decode' ? 'The vulnerable endpoint decodes claims without checking a signature.' : scenario === 'confusion' ? 'The vulnerable endpoint uses jsonwebtoken 4.0.0 with the public PEM and no fixed algorithm, then validates the lab claims.' : 'The vulnerable endpoint uses jsonwebtoken 8.5.1 with a null verification key and no algorithm restriction. It models a missing key configuration: even an original signed token fails here, while an unsigned token can pass.'} All variants still require a known subject, allowed role, current epoch, token ID and unexpired expiry. The protected endpoint also verifies the signature with the scenario’s fixed algorithm and expected issuer and audience.</p>
          <p>Token rejection returns 401. Accepted claims with a non-admin role return 403 for the admin view, proving authentication succeeded but authorization failed. Successful profile reads increment profileReads; the admin view also increments adminReads and returns the fictional directory. Editing a claim never changes an account’s stored role here. Compare the response’s authentication result, role and counters with the actual bearer header in Network.</p>
        </ActionExplanation>
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
      <ActionExplanation title="Before issuing and inspecting JWT cookies">
        <p>Issue JWT cookies posts to /cookies/login. It sets jwt_lab_readable and jwt_lab_httponly as independently signed, five-minute HS256 JWTs for adarsh, with distinct token IDs and CSRF tokens. Both are Secure, SameSite=Lax and Path=/; only the second is HttpOnly. No credential is returned in JSON or written to localStorage.</p>
        <p>Inspect JWT cookies reads document.cookie, then automates GET /cookies/profile/readable and /cookies/profile/httponly. The browser attaches cookies without a bearer header. Each endpoint verifies only its named JWT cookie, including signature, algorithm, issuer, cookie audience, epoch and expiry. A valid cookie returns 200; invalid or expired credentials return 401. The read does not change the dummy preference. Application can show both stored cookies while JavaScript sees only the readable one.</p>
        <p>Run fixed same-origin JWT action assumes script already executes on the app origin. It fetches /cookies/csrf-token with the HttpOnly JWT, then posts to /cookies/preference with X-CSRF-Token. The server checks the JWT, exact app Origin and matching token, then sets the dummy preference to purple. It does not read or steal the HttpOnly JWT. Inspect both helper and mutation requests: HttpOnly does not prevent same-origin script from using the session.</p>
      </ActionExplanation>
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
      <ActionExplanation title="Before measuring token size">
        <p>Run token-size comparison automates two POST /login requests using the selected demo credentials: one without padding and one with the chosen number of ASCII characters in profileNotes. For each token it makes the selected number of GET /size/verify requests with an explicit bearer header and cookies omitted. The selectors only change the next run’s inputs.</p>
        <p>The server verifies HS256, issuer, audience and lab claims, then measures the UTF-8 byte length of the actual Authorization header value, including the Bearer prefix. The table sums those value bytes over the requests. It excludes header names, other headers, compression, TLS and response traffic. Verification times are noisy samples, not a performance benchmark.</p>
        <p>This endpoint does not call the profile-data reader, so profileReads stays unchanged across these requests. That is a property of this implementation, not proof that JWT applications never access server state: the verifier still checks this lab’s in-memory epoch and known subjects. Compare each Network request with the raw measurements.</p>
      </ActionExplanation>
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
