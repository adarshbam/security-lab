import type { LabManifest } from '../../shared/contracts/lab.js';
import { curriculum } from '../../shared/curriculum.js';
import { quickTour } from '../../shared/quick-tour.js';
import './learning-path.css';

interface LearningPathProps {
  labs: LabManifest[];
  activeLabId: string;
  onSelectLab: (id: string) => void;
}

export function LearningPath({ labs, activeLabId, onSelectLab }: LearningPathProps) {
  const index = curriculum.findIndex(step => step.id === activeLabId);
  const step = curriculum[index];
  if (!step) return null;
  const labName = (id: string) => labs.find(lab => lab.id === id)?.title || id;

  return <section className="learning-path" aria-labelledby="learning-path-heading">
    <div className="learning-path-intro">
      <h1 id="learning-path-heading">Learn web security, one boundary at a time</h1>
      <p>Seven labs, from direct access checks to token verification. Follow the suggested order or revisit any topic. Each lab starts with its own fictional state.</p>
    </div>
    <details className="learning-path-outline">
      <summary>30-minute guided review · one check per lab</summary>
      <p>Allow 2 minutes for setup, 26 for these seven checks, and 2 to review notes. This is a representative pass; all 28 experiments need more time. Open Developer Tools → Network, reset the selected lab, and choose Explore freely.</p>
      <ol>{quickTour.map((check, position) => <li key={check.lab}>
        <span className="learning-path-number">{position + 1}</span>
        <div><a href={`?lab=${check.lab}&experiment=${check.experiment}`}>{check.title} · {check.minutes} minutes</a>
          <p>{check.action}</p><details><summary>Expected evidence</summary><p>{check.expected}</p></details>
        </div>
      </li>)}</ol>
      <p>For each check, explain identity → boundary → resulting state → legitimate control. Try wrong/right feedback and a reload in Lab 1. If something differs, report the lab, control, status and state; keep credentials out of notes.</p>
    </details>
    <details className="learning-path-outline">
      <summary>View all {curriculum.length} labs in order</summary>
      <nav aria-label="Full learning path">
        <ol>
          {curriculum.map((item, position) => <li key={item.id}>
            <span className="learning-path-number" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
            <div>
              <button onClick={() => onSelectLab(item.id)} aria-current={item.id === activeLabId ? 'step' : undefined}>
                {labName(item.id)}
              </button>
              <p>{item.rationale}</p>
            </div>
            <span className="learning-path-difficulty">{item.difficulty}</span>
          </li>)}
        </ol>
      </nav>
    </details>
    <div className="learning-path-context">
      <p className="learning-path-label" role="status">Lab {String(index + 1).padStart(2, '0')} of {String(curriculum.length).padStart(2, '0')} · {step.difficulty}</p>
      <h2>Why this comes next</h2>
      <p>{step.rationale}</p>
      {step.prerequisites.length ? <ul className="learning-path-prerequisites">
        {step.prerequisites.map(prerequisite => <li key={prerequisite.id}>
          <button onClick={() => onSelectLab(prerequisite.id)}>Lab {curriculum.findIndex(item => item.id === prerequisite.id) + 1} · {labName(prerequisite.id)}</button>
          <p>{prerequisite.reason}</p>
        </li>)}
      </ul> : <p>No earlier lab is needed. Start here.</p>}
      <details key={step.id} className="learning-path-primer">
        <summary>Knowledge and readiness checkpoint</summary>
        <p><strong>Useful knowledge:</strong> {step.knowledge}</p>
        <p className="learning-path-checkpoint"><strong>Before moving on:</strong> {step.checkpoint}</p>
        <p>Prerequisites are study guidance. No lab is locked, and these checkpoints do not certify mastery.</p>
      </details>
      <details className="learning-path-primer">
        <summary>Quick primer: requests, identity and evidence</summary>
        <dl>
          <dt>Request and response</dt><dd>The browser asks a server to do something at a URL. GET usually reads; POST, PATCH and DELETE can change state. A JSON body carries fields such as a name or object ID.</dd>
          <dt>Identity and permission</dt><dd>Authentication asks “Who is this?” Authorization asks “May this person do this?” A valid session does not grant access to every file or every admin action.</dd>
          <dt>Status and state</dt><dd>200 indicates success, 401 usually means authentication is needed, and 403 indicates refusal. Inspect the response and a fresh state read; a status or an unchanged screen alone does not establish that a defense worked.</dd>
          <dt>Your investigation loop</dt><dd>Open Developer Tools → Network. Make one prediction, run the request, inspect its method, URL, headers and response, then compare vulnerable and protected behavior. Verify a permitted action still works.</dd>
        </dl>
      </details>
    </div>
  </section>;
}

export function LearningPathNavigation({ labs, activeLabId, onSelectLab }: LearningPathProps) {
  const index = labs.findIndex(lab => lab.id === activeLabId);
  const previous = labs[index - 1];
  const next = labs[index + 1];
  return <nav className="learning-path-navigation" aria-label="Continue learning">
    {previous && <button onClick={() => onSelectLab(previous.id)}>Previous: Lab {index} · {previous.title}</button>}
    {next ? <button onClick={() => onSelectLab(next.id)}>Next: Lab {index + 2} · {next.title}</button>
      : <p>You’ve reached the last lab in the path. Revisit any checkpoint to practice explaining the evidence.</p>}
  </nav>;
}
