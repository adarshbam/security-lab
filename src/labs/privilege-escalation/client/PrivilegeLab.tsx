import { useState } from 'react';
import type { DemoUser, WorldName } from '../server/state.js';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';
import '../../broken-access-control/client/access.css';

type Method = 'GET' | 'PATCH' | 'DELETE';
type Result = { method: string; path: string; world: WorldName; status: number; body: unknown; supplied?: unknown };
type Props = { activeExperimentId: string; onSelectExperiment: (id: string) => void; onExperimentActionExecuted?: (evidence?: Record<string, unknown>) => void };
const base = '/api/labs/privilege-escalation';
const defaults: Record<string, { method: Method; path: string; body: string }> = {
  'privilege-role': { method: 'PATCH', path: '/me', body: '{\n  "displayName": "Alex Rivera",\n  "role": "admin"\n}' },
  'privilege-delete': { method: 'DELETE', path: '/admin/users/sam', body: '' },
};
const paths = ['/me', '/admin/users', '/admin/users/sam'];
function isWorkbenchRequest(method: string, path: string): boolean {
  return method === 'GET' ? path === '/me' || path === '/admin/users'
    : method === 'PATCH' ? path === '/me' : method === 'DELETE' && /^\/admin\/users\/[a-z0-9-]+$/.test(path);
}

export function PrivilegeLab({ activeExperimentId, onExperimentActionExecuted }: Props) {
  const start = defaults[activeExperimentId] || defaults['privilege-role'];
  const [world, setWorld] = useState<WorldName>('vulnerable');
  const [account, setAccount] = useState('alex');
  const [method, setMethod] = useState<Method>(start.method);
  const [path, setPath] = useState(start.path);
  const [body, setBody] = useState(start.body);
  const [identity, setIdentity] = useState<Partial<Record<WorldName, DemoUser>>>({});
  const [history, setHistory] = useState<Result[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function request(targetWorld: WorldName, targetMethod: string, targetPath: string, payload?: unknown): Promise<Result> {
    const url = `${base}/${targetWorld}${targetPath}`;
    const headers: Record<string, string> = { 'X-Experiment-Id': activeExperimentId };
    if (payload !== undefined) headers['Content-Type'] = 'application/json';
    if (targetMethod !== 'GET') {
      const csrfResponse = await fetch(`${base}/${targetWorld}/csrf-token`, { headers });
      if (csrfResponse.ok) headers['X-CSRF-Token'] = (await csrfResponse.json()).csrfToken;
    }
    const response = await fetch(url, { method: targetMethod, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const data = await response.json();
    return { world: targetWorld, method: targetMethod, path: targetPath, status: response.status, body: data, supplied: payload };
  }
  async function login() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${base}/${world}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Experiment-Id': activeExperimentId }, body: JSON.stringify({ userId: account }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setIdentity(previous => ({ ...previous, [world]: data.user }));
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }
  async function send(targetWorld = world, targetMethod = method, targetPath = path, payload?: unknown) {
    setBusy(true); setError('');
    try {
      if (!isWorkbenchRequest(targetMethod, targetPath)) throw new Error('Choose a team account resource path and matching method. Credential and control endpoints are unavailable in the workbench.');
      let supplied = payload;
      if (supplied === undefined && targetMethod === 'PATCH') supplied = JSON.parse(body);
      const result = await request(targetWorld, targetMethod, targetPath, supplied);
      setHistory(previous => [result, ...previous]);
      if (targetMethod === 'GET' && targetPath === '/me' && result.status === 200) {
        const user = (result.body as { user: DemoUser }).user;
        setIdentity(previous => ({ ...previous, [targetWorld]: user }));
      }
      onExperimentActionExecuted?.({ world: targetWorld, method: targetMethod, path: targetPath, supplied, status: result.status, response: result.body });
      return result;
    } catch (cause) { setError(String(cause)); return null; }
    finally { setBusy(false); }
  }
  async function confirmBulkDelete() {
    setConfirmDelete(false);
    const directory = await send('vulnerable', 'GET', '/admin/users');
    if (!directory || directory.status !== 200) return;
    const actorId = (directory.body as { actor: { id: string } }).actor.id;
    const users = (directory.body as { users: DemoUser[] }).users;
    for (const user of users) if (user.id !== actorId) await send('vulnerable', 'DELETE', `/admin/users/${user.id}`);
    await send('vulnerable', 'GET', '/admin/users');
  }
  const last = history[0];
  return <div className="access-lab" aria-label="Team account request workbench">
    <section className="ac-section">
      <div className="ac-heading"><div><h3>Team directory</h3><p className="ac-muted">Two independent worlds · fictional accounts · local HTTPS</p></div></div>
      <ActionExplanation title="Before signing in">
        <p>Sign in posts the chosen userId to /api/labs/privilege-escalation/{world}/login without a password. The server creates a random session associated with that account and a CSRF token. The browser stores privilege_lab_vulnerable or privilege_lab_protected as a Secure, HttpOnly, SameSite=Lax cookie with Path=/; no bearer token is written to localStorage.</p>
        <p>Each world has its own users and sessions. Selecting a world does not sign you in or reset it. Alex starts as a member; Taylor is a legitimate admin for comparison. Signing in again reads that world’s current account, including any role change already persisted there.</p>
      </ActionExplanation>
      <div className="ac-grid"><div className="ac-col ac-stack">
        <label>World<select value={world} onChange={event => setWorld(event.target.value as WorldName)}><option value="vulnerable">Vulnerable</option><option value="protected">Protected</option></select></label>
        <label>Demo account<select value={account} onChange={event => setAccount(event.target.value)}>{['alex', 'sam', 'jordan', 'morgan', 'taylor'].map(id => <option key={id} value={id}>{id}</option>)}</select></label>
        <button type="button" onClick={login} disabled={busy}>Sign in to selected world</button>
        <p className="ac-muted" role="status">{identity[world] ? `Signed in as ${identity[world]!.id} · ${identity[world]!.role}` : 'Sign in to inspect a real session.'}</p>
      </div><div className="ac-col">
        <h4>Current permissions</h4>
        <p className="ac-muted">A member may edit their display name. The admin directory and account deletion require the current server-side admin role.</p>
      </div></div>
    </section>
    <section className="ac-section">
      <div className="ac-heading"><div><h3>Request workbench</h3><p className="ac-muted">Edit the method, path and JSON, then inspect the server response.</p></div></div>
      <ActionExplanation title="Before updating a profile or using admin access">
        <p>Send request uses the method and path under /api/labs/privilege-escalation/{world}. PATCH parses and sends the editor’s JSON; GET and DELETE do not send that JSON. Before each mutation, the page fetches /csrf-token and adds X-CSRF-Token automatically. The browser supplies cookies and Origin. Both worlds check the session, exact app Origin and CSRF token before a mutation.</p>
        <p>PATCH /me in the vulnerable world merges supplied properties into the current server-side user. Supplying role: admin persists that role; it does not replace the cookie or forge a JWT. The protected world accepts only a nonempty displayName of at most 80 characters; extra fields such as role make the whole update fail with 400.</p>
        <p>Refresh server identity sends GET /me and updates the identity shown above. It proves whether the role persisted beyond the PATCH response. GET /admin/users and DELETE /admin/users/:id each read the current server-side role: members receive 403, admins can list users or delete another account. Successful deletion removes that account and its sessions; self-deletion is forbidden. A missing or revoked session returns 401. Inspect the actor, response and before/after state independently of the UI’s cached identity.</p>
      </ActionExplanation>
      <div className="ac-grid"><div className="ac-col ac-stack">
        <label>Method<select value={method} onChange={event => setMethod(event.target.value as Method)}><option>GET</option><option>PATCH</option><option>DELETE</option></select></label>
        <label>Path after /{world}<input value={path} onChange={event => setPath(event.target.value)} list="access-paths" /><datalist id="access-paths">{paths.map(item => <option key={item} value={item} />)}</datalist></label>
        <label>Supplied JSON<textarea value={body} onChange={event => setBody(event.target.value)} disabled={method !== 'PATCH'} /></label>
        <div className="ac-actions"><button type="button" className="ac-primary" disabled={busy || !path.startsWith('/')} onClick={() => void send()}>Send request</button><button type="button" disabled={busy} onClick={() => void send(world, 'GET', '/me')}>Refresh server identity</button></div>
      </div><div className="ac-col">
        <h4>Latest response</h4>
        {last ? <><p className="ac-status" data-ok={last.status < 400}>{last.method} {last.path} · HTTP {last.status} · {last.world}</p><pre className="ac-response" data-ok={last.status < 400} data-testid="privilege-response">{JSON.stringify(last.body, null, 2)}</pre></> : <p className="ac-muted">A response appears after you send a request.</p>}
      </div></div>
    </section>
    {activeExperimentId === 'privilege-delete' && <section className="ac-section">
      <h3>Delete remaining demo users</h3>
      <ActionExplanation title="Before confirming bulk deletion">
        <p>The first button only opens confirmation; Cancel sends nothing. Confirm always targets the vulnerable world, regardless of the world selector. It first fetches /admin/users to confirm current admin access, then sends one DELETE per other account, obtaining a CSRF token for each, and fetches the directory again. The server checks the current role on every request. The identity display must first have been refreshed to admin to enable this shortcut.</p>
        <p>These are real state changes to fictional in-memory accounts. Response history shows each request, and Network also shows the helper token requests. The header’s reset control restores both worlds and invalidates their sessions.</p>
      </ActionExplanation>
      <button type="button" disabled={busy || identity.vulnerable?.role !== 'admin'} onClick={() => setConfirmDelete(true)}>Delete remaining demo users</button>
      {confirmDelete && <div className="ac-confirm" role="group" aria-label="Confirm demo deletion"><p>Delete every other fictional user from the vulnerable world?</p><div className="ac-actions"><button type="button" onClick={() => void confirmBulkDelete()}>Confirm demo deletion</button><button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></div></div>}
    </section>}
    <section className="ac-section" aria-label="Privilege response history"><h3>Request history</h3><div className="ac-history">{history.map((item, index) => <details key={`${index}-${item.path}`}><summary>{item.world} · {item.method} {item.path} · HTTP {item.status}</summary><pre className="ac-response">{JSON.stringify({ supplied: item.supplied, response: item.body }, null, 2)}</pre></details>)}</div></section>
    {error && <p role="alert">{error}</p>}
  </div>;
}
