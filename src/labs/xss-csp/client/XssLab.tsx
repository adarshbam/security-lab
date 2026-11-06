import { useState } from 'react';
import { ActionExplanation } from '../../../client/components/ActionExplanation.js';
import { payloads, type Payload, type Rendering, type Policy, type RunView, XSS_ORIGIN } from '../model.js';
import './xss.css';

type Props = { activeExperimentId: string; onSelectExperiment: (id: string) => void; onExperimentActionExecuted?: (evidence?: Record<string, unknown>) => void };
type Result = { run: RunView; url: string };
const base = '/api/labs/xss-csp';
export function XssLab({ activeExperimentId, onExperimentActionExecuted }: Props) {
  const [payload, setPayload] = useState<Payload>('handler');
  const [rendering, setRendering] = useState<Rendering>('vulnerable');
  const [policy, setPolicy] = useState<Policy>(activeExperimentId === 'xss-csp' ? 'report' : 'absent');
  const [result, setResult] = useState<Result>();
  const [history, setHistory] = useState<RunView[]>([]);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function request(path: string, body: object) {
    const response = await fetch(base + path, { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-Security-Lab-Admin': 'true', 'X-Experiment-Id': activeExperimentId,
    }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }
  async function act(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }
  function record(run: RunView) {
    setHistory(previous => [run, ...previous.filter(item => item.id !== run.id)].slice(0, 8));
    onExperimentActionExecuted?.({ ...run, evidenceKind: 'Server counters read explicitly; absence of a marker is not by itself proof of blocking.' });
  }
  return <div className="xss-lab" aria-label="XSS and CSP workbench">
    <section>
      <h3>Follow input to the sink</h3>
      <p>{activeExperimentId === 'xss-dom' ? 'URL fragment → decodeURIComponent → innerHTML / textContent / narrow HTML rebuild' : activeExperimentId === 'xss-stored' ? 'Saved note → stored value → raw HTML / HTML text encoding / narrow HTML rebuild' : 'Query input → query decoding → raw HTML / HTML text encoding / narrow HTML rebuild'}</p>
      <ActionExplanation title="Before choosing a comparison">
        <p>These selectors change the next run only. The catalogue contains fixed, harmless local payloads: an SVG event handler, a script element, or legitimate strong formatting. There is no arbitrary JavaScript editor. This guard contains the exercise; it is separate from the vulnerable and protected renderers being compared.</p>
        <p>Protected rendering uses HTML text encoding for server output and textContent for the fragment. Sanitized HTML rebuilds only b, strong, em and br without attributes; everything else is discarded. This tiny teaching sanitizer is not a general rich-text library.</p>
        <p>Absent means no CSP header. Unsafe allows inline code but restricts resource destinations. Report-only monitors a nonce policy while an unsafe baseline remains enforced. Enforced requires a fresh nonce on trusted scripts. None of these modes changes the chosen rendering sink.</p>
      </ActionExplanation>
      <div className="xss-controls">
        <label>Payload<select value={payload} onChange={e => setPayload(e.target.value as Payload)}>{Object.entries(payloads).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
        <label>Rendering<select value={rendering} onChange={e => setRendering(e.target.value as Rendering)}><option value="vulnerable">Vulnerable HTML</option><option value="protected">Protected text</option><option value="sanitized">Sanitized formatting</option></select></label>
        <label>CSP response policy<select value={policy} onChange={e => setPolicy(e.target.value as Policy)}><option value="absent">Absent</option><option value="unsafe">Unsafe inline</option><option value="report">Nonce report-only</option><option value="enforce">Nonce enforced</option></select></label>
      </div>
      <pre aria-label="Selected input">{payloads[payload].html}</pre>
      <ActionExplanation title="Before creating a run">
        <p>Create isolated run sends POST /api/labs/xss-csp/runs, saves a bounded in-memory record, and loads an HTTPS document on {XSS_ORIGIN}. Stored release notes saves the catalogue note in that record. Reflected search input sends it as a query parameter. DOM fragment preview puts it only in the URL fragment; trusted frame code reads it after load.</p>
        <p>The frame automatically receives a path-scoped Secure HttpOnly dummy session and a readable fictional cookie. Both use SameSite=None and Partitioned so supported browsers can use them inside this cross-site frame. Browser privacy controls can still prevent the cookie control from working; check the actual cookie and marker response. Loading a vulnerable handler or server-parsed script can issue one authenticated marker POST and set mutations to 1. Counters are capped at 1; visits are counted separately. No external requests, credentials or targets are part of these payloads. The page does not automatically refresh your evidence.</p>
      </ActionExplanation>
      <button className="xss-primary" disabled={busy} onClick={() => void act(async () => { const next = await request('/runs', { experimentId: activeExperimentId, payload, rendering, policy }) as Result; setResult(next); setRevision(0); })}>Create isolated run</button>
      {error && <p role="alert">{error}</p>}
    </section>
    <section>
      <h3>Inspect the isolated document</h3>
      <p>The frame permits scripts and its own origin so the real cookie and fetch behavior can be observed. It cannot navigate the parent, open popups or submit forms. The dedicated port separates it from the shell and other lesson documents; it exposes no shell assets or administrative APIs.</p>
      <p>Ports separate origins, but cookies are not port-isolated. These cookies use the attacker hostname and a random run path; no application cookies are created on that host. This local sandbox is containment for fixed payloads, not an operating-system sandbox for arbitrary hostile code. Editing code in DevTools is outside that boundary.</p>
      {result ? <>
        <p>Loaded configuration: {result.run.rendering} · {result.run.policy} · {result.run.payload}. Changing a selector above does not change this document.</p>
        <iframe key={result.run.id + revision} src={result.url} title="Isolated XSS lesson document" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
        <ActionExplanation title="Before reading or revisiting">
          <p>Read actual state sends a guarded shell POST /state for this run and records the returned counters below. It executes no payload. Revisit reloads the same saved run URL, keeping its session and counters. A reset removes every run and revokes its dummy sessions; old frames may remain visible but their endpoints return 404. Inspect the frame’s Network document headers, Console violations and marker POST responses yourself, then refresh the Request Inspector.</p>
          <p>Inside the frame, Run legitimate code is a positive control: its nonce-authorized listener sends the same authenticated marker request with kind=legitimate. Inspect dummy state reads counters and cookie names. If HttpOnly hides xss_session from document.cookie yet a marker POST authenticates, you have evidence that HttpOnly does not stop authenticated requests by an executing script.</p>
        </ActionExplanation>
        <div className="xss-actions"><button disabled={busy} onClick={() => void act(async () => { const run = await request('/state', { id: result.run.id }) as RunView; setResult({ ...result, run }); record(run); })}>Read actual state</button>
          <button disabled={busy} onClick={() => setRevision(value => value + 1)}>Revisit saved document</button></div>
      </> : <p role="status">Create a run to load a document. No browser execution has been observed yet.</p>}
    </section>
    <section><h3>Recorded observations</h3><p>Only explicit state reads appear here. A zero attacker count may mean safe rendering, CSP blocking, an inert script element, or failed setup. Use the legitimate control, response body, Console and Network to distinguish them. Reports arrive asynchronously.</p>
      {history.length ? history.map(run => <details key={run.id}><summary>{run.rendering} · {run.policy} · {run.payload} · attacker {run.attacker}, legitimate {run.legitimate}, mutations {run.mutations}</summary><pre>{JSON.stringify(run, null, 2)}</pre></details>) : <p role="status">No state snapshot read yet.</p>}
      <ActionExplanation title="Before resetting this lab"><p>Reset XSS runs sends the guarded reset endpoint, clears every XSS run and report, and discards the frames and observations below. It does not reset another lab or your optional learning notes. The header’s reset also resets this lab and its inspector entries.</p></ActionExplanation>
      <button disabled={busy} onClick={() => void act(async () => { await request('/reset', {}); setResult(undefined); setHistory([]); })}>Reset XSS runs</button>
    </section>
  </div>;
}
