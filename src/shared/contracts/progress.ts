export type ExperimentStep = 'understand' | 'predict' | 'experiment' | 'compare' | 'learn';

export interface ExperimentProgress {
  currentStep: ExperimentStep;
  selectedPredictionId: string | null;
  attempted: boolean;
  unlockedLearn: boolean;
  lastOutcome?: 'correct' | 'incorrect' | 'attempted';
  evidence?: Record<string, unknown>;
}

export interface LabProgress {
  labId: string;
  activeExperimentId: string;
  experiments: Record<string, ExperimentProgress>;
}
