import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ExperimentDefinition } from '../../shared/contracts/lab.js';
import { LessonBrief } from './LessonBrief.js';


interface StepExperimentProps {
  experiment: ExperimentDefinition;
  attempted: boolean;
  notes: string;
  onNotesChange: (notes: string) => void;
  onNext: () => void;
  children: React.ReactNode;
}

export const StepExperiment: React.FC<StepExperimentProps> = ({
  experiment, attempted, notes, onNotesChange, onNext, children,
}) => {
  const teaching = experiment.teaching;
  const [index, setIndex] = useState(0);
  const investigation = teaching ? { setup: teaching.objective, steps: teaching.steps.map(s => s.action), console: teaching.console, question: teaching.question } : undefined;
  const canCompare = true;
  return <div className="space-y-6">
    {investigation && <section className="investigation" aria-labelledby="investigation-title">
      <p className="investigation-label">Manual investigation · local lab only</p>
      <h3 id="investigation-title">Find the evidence yourself</h3>
      <p>{investigation.setup}</p>
      <p className="investigation-hint">Open Developer Tools with F12 or Ctrl+Shift+I. Select the named tab before running a Console snippet. Use only the fictional credentials and local hosts in this lab.</p>
      <ol className="investigation-steps">
        {investigation.steps.slice(index, index + 1).map((step) => <li key={step}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}
      </ol>
      <p aria-live="polite">Investigation step {index + 1} of {investigation.steps.length}</p>
      <details><summary>Hint and evidence to look for</summary><p>{teaching?.steps[index]?.hint}</p><p>{teaching?.steps[index]?.evidence}</p></details>
      <div className="flex gap-3"><button className="action secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous instruction</button><button className="action secondary" disabled={index === investigation.steps.length - 1} onClick={() => setIndex(index + 1)}>Next instruction</button></div>
      {investigation.console && <div className="investigation-console">
        <p>Run in the specified tab’s Console</p>
        <pre><code>{investigation.console}</code></pre>
        <p>Read the result in your browser. The app does not run this snippet for you.</p>
      </div>}
    </section>}

    {children}
    <LessonBrief id={experiment.id} />

    {investigation && <section className="investigation-reflection" aria-labelledby="investigation-question">
      <h3 id="investigation-question">Record what you saw</h3>
      <p>{investigation.question}</p>
      <label htmlFor="investigation-notes">Your observation and reasoning (optional, self-reported)</label>
      <textarea id="investigation-notes" value={notes} onChange={event => onNotesChange(event.target.value)}
        rows={4} placeholder="Name the request or storage entry, the observed result, and what explains it." />
      <p className="investigation-hint">Your notes stay in this browser’s localStorage. Keep credential values out of them.</p>
    </section>}

    <div className="investigation-next">
      <p aria-live="polite">{!attempted ? 'Run an experiment action to collect app evidence.' : !notes.trim() ? 'Notes are optional. Compare evidence when you are ready.' : 'Your observation and app evidence are ready to compare.'}</p>
      <button onClick={onNext} disabled={!canCompare} className="action">
        Compare Outcome &amp; Hypotheses <ArrowRight aria-hidden="true" className="w-4 h-4 ml-2" />
      </button>
    </div>
  </div>;
};
