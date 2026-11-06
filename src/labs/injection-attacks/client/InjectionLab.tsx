import { useState } from 'react';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';
import type { Engine, World } from '../server/engine.js';
import './injection.css';

const examples: Record<Engine, { attack: object; legitimate: object }> = {
  sql: { attack: { username: "alex' --", password: 'wrong' }, legitimate: { username: 'alex', password: 'paper-lantern' } },
  nosql: { attack: { username: { $ne: '' }, password: { $ne: '' } }, legitimate: { username: 'alex', password: 'paper-lantern' } },
  coercion: { attack: { username: 'pin-demo', password: false }, legitimate: { username: 'pin-demo', password: '0' } },
};
type Result = { implementation: World; method: string; path: string; status: number; body: unknown };
type Props = { activeExperimentId: string; onSelectExperiment: (id: string) => void; onExperimentActionExecuted?: (evidence?: Record<string, unknown>) => void };
export function InjectionLab({ activeExperimentId, onExperimentActionExecuted }: Props) {
  const engine = activeExperimentId.replace('injection-', '') as Engine;
  const [world, setWorld] = useState<World>('vulnerable');
  const [payload, setPayload] = useState(() => JSON.stringify(examples[engine].legitimate, null, 2));
  const [history, setHistory] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function request(method: string, suffix: string, body?: unknown) {
    const path = `/api/labs/injection-attacks/${engine}/${world}/${suffix}`;
    const response = await fetch(path, { method, headers: { 'X-Experiment-Id': activeExperimentId, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const result: Result = { implementation: world, method, path, status: response.status, body: await response.json() };
    setHistory(previous => [result, ...previous].slice(0, 16));
    onExperimentActionExecuted?.({ ...result });
    return result;
  }
  async function run(login: boolean) {
    setBusy(true); setError('');
    try {
      if (login) {
        const input: unknown = JSON.parse(payload);
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Use a JSON object with username and password fields.');
        await request('POST', 'login', input);
      }
      await request('GET', 'me');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  return <div className="injection-lab">
    <section className="inj-section" aria-label="Local login workbench">
      <h3>Local login workbench</h3>
      <p>One request pair at a time · {engine === 'sql' ? 'SQLite in memory' : engine === 'nosql' ? 'Mingo document predicates' : 'JavaScript equality'} · fictional accounts</p>
      <ActionExplanation title="Before choosing an example or implementation">
        <p>The implementation selector changes only the target for your next request. Load legitimate example and Load attack example replace the editable JSON below; neither sends a request. The legitimate SQL/document accounts are alex / paper-lantern and sam / cedar-path. The coercion account is pin-demo with the string PIN “0”. These are deliberately simple local fixtures, not production password storage.</p>
        <p>SQL validates strings in both implementations; only Protected binds parameters. The document pair uses Mingo’s real query evaluator with $eq and $ne only; Protected validates strings and constructs equality predicates. The coercion pair uses JavaScript == versus validated ===. These are distinct mechanisms.</p>
      </ActionExplanation>
      <label>Implementation<select value={world} disabled={busy} onChange={event => setWorld(event.target.value as World)}><option value="vulnerable">Vulnerable</option><option value="protected">Protected</option></select></label>
      <div className="inj-actions"><button disabled={busy} onClick={() => setPayload(JSON.stringify(examples[engine].legitimate, null, 2))}>Load legitimate example</button><button disabled={busy} onClick={() => setPayload(JSON.stringify(examples[engine].attack, null, 2))}>Load attack example</button></div>
      <ActionExplanation title="Before editing and sending JSON">
        <p>Edit username and password locally. Quoted text is a string; false and 0 are boolean and number values; braces create objects. Send login uses application/json and POST /api/labs/injection-attacks/{engine}/{world}/login, then automatically sends GET /me to prove the resulting identity. It sends only to the selected implementation. Open Network to inspect the actual Content-Type and payload yourself.</p>
        <p>Each evaluated login revokes the previous session in this engine and implementation. A match creates its own Secure, HttpOnly, SameSite=Strict cookie scoped to this API path. A no-match returns 401; invalid types or unsupported predicates return 400. Check current identity sends only GET /me. Browser Network shows the fictional input you supplied; responses, learning evidence and the inspector omit passwords and session tokens.</p>
        <p>The header’s Reset Experiment revokes all sessions in this lab and clears its inspector records, then reloads the page. It leaves the other labs intact. Restart Learning Progress clears saved study responses separately.</p>
      </ActionExplanation>
      <label>Login JSON<textarea rows={7} spellCheck={false} value={payload} onChange={event => setPayload(event.target.value)} /></label>
      <div className="inj-actions"><button className="inj-primary" disabled={busy} onClick={() => void run(true)}>Send login</button><button disabled={busy} onClick={() => void run(false)}>Check current identity</button></div>
      <p role="status">{busy ? 'Waiting for local server…' : history.length ? `Latest: ${history[0].implementation} ${history[0].method} ${history[0].path.split('/').at(-1)} · HTTP ${history[0].status}` : 'No requests sent in this workbench yet.'}</p>
      {error && <p role="alert">{error}</p>}
    </section>
    <section className="inj-section" aria-label="Redacted login evidence"><h3>Observed responses</h3><p>The newest result is first. POST shows parsed types and redacted query structure; GET /me shows the server identity. Historic results retain their implementation labels.</p>
      {history.map((result, index) => <details key={index} open={index < 2}><summary>{result.implementation} · {result.method} {result.path.split('/').at(-1)} · HTTP {result.status}</summary><pre>{JSON.stringify(result.body, null, 2)}</pre></details>)}
    </section>
  </div>;
}
