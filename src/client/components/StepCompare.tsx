import type { ExperimentDefinition } from '../../shared/contracts/lab.js';
import type { ExperimentObservation } from '../../shared/contracts/inspector.js';
import { CodeSnippet } from './CodeSnippet.js';

export function StepCompare({ experiment, selectedPredictionId, observations, evidence, onNext }: {
  experiment: ExperimentDefinition; selectedPredictionId: string | null;
  observations: ExperimentObservation[]; evidence?: Record<string, unknown>; onNext: () => void;
}) {
  const prediction = experiment.predictionOptions.find(option => option.id === selectedPredictionId);
  return <div className="space-y-5">
    <section className="panel space-y-4">
      <h3 className="text-lg font-semibold">Compare prediction, evidence and reference</h3>
      <p>Your prediction: <strong>{prediction?.label}</strong></p>
      {evidence && <pre className="result" data-testid="comparison-evidence">{JSON.stringify(evidence, null, 2)}</pre>}
      <p className="text-sky-300">{prediction?.isCorrect ? 'Your prediction matches the reference expectation.' :
        'Your prediction differs from the reference expectation.'}</p>
      <p>{prediction?.explanation}</p>
      <p className="text-sm text-slate-400">The reference describes the stated starting conditions. Check your actual
        configuration and observations below; a setup or privacy-policy difference is evidence to investigate.</p>
      <h4 className="font-semibold">Observed network evidence</h4>
      {observations.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs">
        <thead><tr><th className="p-2">Request</th><th>Context</th><th>Status</th><th>Authenticated</th><th>Decision</th></tr></thead>
        <tbody>{observations.slice(0, 12).map(o => <tr key={o.id} className="border-t border-slate-800">
          <td className="p-2">{o.method} {o.path}</td><td>{o.secFetchSite || 'not supplied'}</td>
          <td>{o.status}</td><td>{String(o.authResult.authenticated)}</td><td>{o.protectionDecision.reason || o.protectionDecision.ruleApplied || o.protectionDecision.decision}</td>
        </tr>)}</tbody></table></div> : <p>No network observation is recorded. Direct storage reads execute entirely in the browser.</p>}
      <p>Expand the Request Inspector to compare actual cookie names, origin headers and before/after state.</p>
    </section>
    <section className="panel"><h4 className="font-semibold mb-3">Executable implementation</h4>
      <CodeSnippet snippets={experiment.codeSnippets} /></section>
    <button className="action" onClick={onNext}>Proceed to In-Depth Learning &amp; References</button>
  </div>;
}
