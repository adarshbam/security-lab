import { useState } from 'react';
import type { DemoUser, WorldName } from '../server/state.js';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';
import './access.css';

type Method = 'GET' | 'DELETE';
type Result = { method: string; path: string; world: WorldName; status: number; body: unknown; supplied?: unknown };
type Props = { activeExperimentId: string; onSelectExperiment: (id: string) => void; onExperimentActionExecuted?: (evidence?: Record<string, unknown>) => void };
const base = '/api/labs/broken-access-control';
const defaults: Record<string, { method: Method; path: string }> = {
  'access-files': { method: 'GET', path: '/files/file-sam' },
  'access-delete-file': { method: 'DELETE', path: '/files/file-sam' },
  'access-delete-folder': { method: 'DELETE', path: '/folders/folder-sam' },
};
const paths = ['/me', '/files', '/files/file-alex', '/files/file-sam', '/folders', '/folders/folder-alex', '/folders/folder-sam'];
function isWorkbenchRequest(method: string, path: string): boolean {
  return method === 'GET' ? path === '/me' || path === '/files' || path === '/folders' || /^\/(files|folders)\/[a-z0-9-]+$/.test(path)
    : method === 'DELETE' && /^\/(files|folders)\/[a-z0-9-]+$/.test(path);
}

export function AccessLab({ activeExperimentId, onExperimentActionExecuted }: Props) {
  const start = defaults[activeExperimentId] || defaults['access-files'];
  const [world, setWorld] = useState<WorldName>('vulnerable');
  const [account, setAccount] = useState('alex');
  const [method, setMethod] = useState<Method>(start.method);
  const [path, setPath] = useState(start.path);
  const [identity, setIdentity] = useState<Partial<Record<WorldName, DemoUser>>>({});
  const [ownedFiles, setOwnedFiles] = useState<Partial<Record<WorldName, { id: string; title: string }[]>>>({});
  const [ownedFolders, setOwnedFolders] = useState<Partial<Record<WorldName, { id: string; title: string }[]>>>({});
  const [history, setHistory] = useState<Result[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      const files = await request(world, 'GET', '/files');
      setOwnedFiles(previous => ({ ...previous, [world]: (files.body as { files: { id: string; title: string }[] }).files }));
      const folders = await request(world, 'GET', '/folders');
      setOwnedFolders(previous => ({ ...previous, [world]: (folders.body as { folders: { id: string; title: string }[] }).folders }));
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }
  async function send(targetWorld = world, targetMethod = method, targetPath = path) {
    setBusy(true); setError('');
    try {
      if (!isWorkbenchRequest(targetMethod, targetPath)) throw new Error('Choose a Team Files resource path and matching method. Credential and control endpoints are unavailable in the workbench.');
      const result = await request(targetWorld, targetMethod, targetPath);
      setHistory(previous => [result, ...previous]);
      if (targetMethod === 'GET' && targetPath === '/me' && result.status === 200) {
        const user = (result.body as { user: DemoUser }).user;
        setIdentity(previous => ({ ...previous, [targetWorld]: user }));
      }
      onExperimentActionExecuted?.({ world: targetWorld, method: targetMethod, path: targetPath, status: result.status, response: result.body });
      return result;
    } catch (cause) { setError(String(cause)); return null; }
    finally { setBusy(false); }
  }
  const last = history[0];
  return <div className="access-lab" aria-label="Team Files request workbench">
    <section className="ac-section">
      <div className="ac-heading"><div><h3>Team Files</h3><p className="ac-muted">Two independent worlds · fictional accounts · local HTTPS</p></div></div>
      <ActionExplanation title="Before signing in">
        <p>Choosing a world or account only changes the controls. Sign in posts the selected userId to /api/labs/broken-access-control/{world}/login. This is a password-free demo account selector. The server creates a random session mapped to that user and a CSRF token; Set-Cookie stores access_lab_vulnerable or access_lab_protected with Secure, HttpOnly, SameSite=Lax and Path=/.</p>
        <p>The browser manages these separate cookies; this lab creates no localStorage bearer token. After login, the page automatically fetches /files and /folders for the selected world. Both lists contain only that account’s resources, even in the vulnerable world. Signing in does not restore deleted resources; the header’s reset control does that.</p>
      </ActionExplanation>
      <div className="ac-grid"><div className="ac-col ac-stack">
        <label>World<select value={world} onChange={event => setWorld(event.target.value as WorldName)}><option value="vulnerable">Vulnerable</option><option value="protected">Protected</option></select></label>
        <label>Demo account<select value={account} onChange={event => setAccount(event.target.value)}>{['alex', 'sam', 'jordan', 'morgan', 'taylor'].map(id => <option key={id} value={id}>{id}</option>)}</select></label>
        <button type="button" onClick={login} disabled={busy}>Sign in to selected world</button>
        <p className="ac-muted" role="status">{identity[world] ? `Signed in as ${identity[world]!.id} · ${identity[world]!.role}` : 'Sign in to inspect a real session.'}</p>
      </div><div className="ac-col">
        <h4>My files and folders</h4>
        <p className="ac-muted">This list shows owned resources. The request path below can name any ID.</p>
        <ul className="ac-list">{(ownedFiles[world] || []).map(file => <li key={file.id}><span>{file.title}</span><span className="ac-label">{file.id}</span></li>)}</ul>
        <ul className="ac-list">{(ownedFolders[world] || []).map(folder => <li key={folder.id}><span>{folder.title}</span><span className="ac-label">{folder.id}</span></li>)}</ul>
      </div></div>
    </section>
    <section className="ac-section">
      <div className="ac-heading"><div><h3>Request workbench</h3><p className="ac-muted">Change a file or folder ID, then inspect the server response and state.</p></div></div>
      <ActionExplanation title="Before sending a resource request">
        <p>Send request uses the selected method and path under /api/labs/broken-access-control/{world}. The browser attaches eligible cookies; the server selects only that world’s cookie and resolves its session to the current user. For DELETE, the workbench first fetches /csrf-token and automatically adds X-CSRF-Token. Both worlds require that token and the exact app Origin for deletion. You are testing ownership authorization with an authenticated request.</p>
        <p>GET /me returns the current identity; /files and /folders list owned resources. A GET for a specific ID in the vulnerable world returns that object without checking its owner. The protected world requires ownerId to match the actor, returning 404 for an unavailable or unowned object. A member stays a member throughout this experiment.</p>
        <p>DELETE removes the named file, or a folder and its children. The vulnerable world omits the owner check; the protected world checks folder or file ownership before changing state. Success returns 200; denied or missing resources return 404; a missing session returns 401. Refresh server identity sends GET /me and changes no role. Compare Network with the inspector’s before/after snapshots. The owned-resource list is loaded at sign-in and does not automatically refresh after deletion.</p>
      </ActionExplanation>
      <div className="ac-grid"><div className="ac-col ac-stack">
        <label>Method<select value={method} onChange={event => setMethod(event.target.value as Method)}><option>GET</option><option>DELETE</option></select></label>
        <label>Path after /{world}<input value={path} onChange={event => setPath(event.target.value)} list="access-paths" /><datalist id="access-paths">{paths.map(item => <option key={item} value={item} />)}</datalist></label>
        <div className="ac-actions"><button type="button" className="ac-primary" disabled={busy || !path.startsWith('/')} onClick={() => void send()}>Send request</button><button type="button" disabled={busy} onClick={() => void send(world, 'GET', '/me')}>Refresh server identity</button></div>
      </div><div className="ac-col">
        <h4>Latest response</h4>
        {last ? <><p className="ac-status" data-ok={last.status < 400}>{last.method} {last.path} · HTTP {last.status} · {last.world}</p><pre className="ac-response" data-ok={last.status < 400} data-testid="access-response">{JSON.stringify(last.body, null, 2)}</pre></> : <p className="ac-muted">A response appears after you send a request.</p>}
      </div></div>
    </section>
    <section className="ac-section" aria-label="Access response history"><h3>Request history</h3><div className="ac-history">{history.map((item, index) => <details key={`${index}-${item.path}`}><summary>{item.world} · {item.method} {item.path} · HTTP {item.status}</summary><pre className="ac-response">{JSON.stringify({ supplied: item.supplied, response: item.body }, null, 2)}</pre></details>)}</div></section>
    {error && <p role="alert">{error}</p>}
  </div>;
}
