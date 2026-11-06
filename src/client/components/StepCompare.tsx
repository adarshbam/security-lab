import type { ExperimentDefinition } from '../../shared/contracts/lab.js';
import type { ExperimentObservation } from '../../shared/contracts/inspector.js';
import { CodeSnippet } from './CodeSnippet.js';
import { LessonBrief } from './LessonBrief.js';

export function StepCompare({ experiment, selectedPredictionId, observations, evidence, investigationNotes, onNext, onRetry }: {
  experiment: ExperimentDefinition; selectedPredictionId: string | null;
  observations: ExperimentObservation[]; evidence?: Record<string, unknown>; investigationNotes?: string; onNext: () => void; onRetry: () => void;
}) {
  const prediction = experiment.predictionOptions.find(option => option.id === selectedPredictionId);
  return <div className="space-y-5">
    <LessonBrief id={experiment.id} />
    <section className="panel space-y-4">
      <h3 className="text-lg font-semibold">Compare prediction, evidence and reference</h3>
      <p>Your prediction: <strong>{prediction?.label || 'No prediction recorded.'}</strong></p>
      {investigationNotes && <div><h4 className="font-semibold">Your DevTools observation</h4><p className="whitespace-pre-wrap">{investigationNotes}</p></div>}
      {evidence && <pre className="result" data-testid="comparison-evidence">{JSON.stringify(evidence, null, 2)}</pre>}
      <p className="text-sky-300">{!prediction || prediction.id === 'unsure' ? 'Use the reference below to interpret your evidence.' : prediction.isCorrect ? 'Your prediction matches the reference expectation.' :
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
      {experiment.id.startsWith('access-') && <div className="overflow-x-auto">
        <h4 className="font-semibold">Ownership reference</h4>
        <table className="w-full text-left text-xs"><thead><tr><th className="p-2">Protected actor</th><th>Own file</th><th>Another file</th><th>Own folder delete</th><th>Another folder delete</th></tr></thead>
          <tbody>{[
            ['Alex · member', 'Allowed', 'Denied', 'Allowed', 'Denied'],
            ['Sam · member', 'Allowed', 'Denied', 'Allowed', 'Denied'],
          ].map(row => <tr key={row[0]} className="border-t border-slate-800">{row.map((cell, index) => <td key={index} className="p-2">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>}
      {experiment.id.startsWith('privilege-') && <div className="overflow-x-auto">
        <h4 className="font-semibold">Permission reference</h4>
        <table className="w-full text-left text-xs"><thead><tr><th className="p-2">Protected actor</th><th>Admin directory</th><th>Delete another user</th></tr></thead>
          <tbody>{[
            ['Alex · member', 'Denied', 'Denied'],
            ['Sam · member', 'Denied', 'Denied'],
            ['Taylor · admin', 'Allowed', 'Allowed'],
          ].map(row => <tr key={row[0]} className="border-t border-slate-800">{row.map((cell, index) => <td key={index} className="p-2">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>}
    </section>
    <section className="panel space-y-4"><h4 className="font-semibold">Defender review · executable implementation</h4>
      <p>Read the actual source below. Identify the check or browser rule that explains the outcome before you retry.</p>
      <CodeSnippet snippets={experiment.codeSnippets} />
      {experiment.defenderReplay && <p data-testid="defender-replay">{experiment.defenderReplay}</p>}
    </section>
    <div className="flex flex-wrap gap-3">
      <button className="action secondary" onClick={onRetry}>Return to experiment and retry</button>
      <button className="action" onClick={onNext}>Proceed to In-Depth Learning &amp; References</button>
    </div>
  </div>;
}
