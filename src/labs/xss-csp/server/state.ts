import { randomUUID } from 'node:crypto';
import type { RunView } from '../model.js';
export interface Run extends RunView { session: string; stored: string }
export const runs = new Map<string, Run>();
export function newRun(config: Pick<RunView, 'experimentId' | 'vector' | 'rendering' | 'policy' | 'payload'>): Run {
  if (runs.size >= 60) runs.delete(runs.keys().next().value!);
  const run: Run = { ...config, id: randomUUID(), session: randomUUID(), stored: '', visits: 0, attacker: 0, legitimate: 0, mutations: 0, reports: [] };
  runs.set(run.id, run); return run;
}
export function view(run: Run): RunView {
  return structuredClone({ id: run.id, experimentId: run.experimentId, vector: run.vector,
    rendering: run.rendering, policy: run.policy, payload: run.payload, visits: run.visits,
    attacker: run.attacker, legitimate: run.legitimate, mutations: run.mutations, reports: run.reports });
}
export function resetXss() { runs.clear(); }
