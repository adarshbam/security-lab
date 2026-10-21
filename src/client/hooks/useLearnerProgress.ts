import { useCallback, useState } from 'react';
import type { ExperimentStep, ExperimentProgress } from '../../shared/contracts/progress.js';

const STORAGE_KEY = 'security_lab_learner_progress_v1';
type ProgressStore = Record<string, Record<string, ExperimentProgress>>;
const initialProgress: ExperimentProgress = {
  currentStep: 'understand', selectedPredictionId: null, attempted: false, unlockedLearn: false,
};
function readStore(): ProgressStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
export function useLearnerProgress(labId: string, experimentId: string) {
  const [store, setStore] = useState<ProgressStore>(readStore);
  const progress = { ...initialProgress, ...store[labId]?.[experimentId] };
  const update = useCallback((changes: Partial<ExperimentProgress>) => {
    setStore(previous => {
      const next = { ...previous, [labId]: { ...previous[labId], [experimentId]: {
        ...initialProgress, ...previous[labId]?.[experimentId], ...changes,
      } } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [labId, experimentId]);
  const setStep = (currentStep: ExperimentStep) => update({ currentStep });
  const setPrediction = (selectedPredictionId: string) => update({ selectedPredictionId });
  const recordAttempt = useCallback((evidence?: Record<string, unknown>) => update({ attempted: true, unlockedLearn: true, evidence }), [update]);
  return { progress, setStep, setPrediction, recordAttempt };
}
