export type ExperimentStep = 'understand' | 'predict' | 'experiment' | 'compare' | 'learn';

export interface ExperimentProgress {
  referenceViewedAt?: number;
  explanationViewedAt?: number;
  challengeAttemptedAt?: number;
  checkedAnswer?: { id: string; correct: boolean; withHelp: boolean; at: number };
  conceptAttempts?: { id: string; correct: boolean; withHelp: boolean; at: number }[];
  reviewResponses?: { answer: string; at: number; withHelp: boolean }[];
  currentStep: ExperimentStep;
  selectedPredictionId: string | null;
  attempted: boolean;
  unlockedLearn: boolean;
  lastOutcome?: 'correct' | 'incorrect' | 'attempted';
  evidence?: Record<string, unknown>;
  investigationNotes?: string;
}

export interface LabProgress {
  labId: string;
  activeExperimentId: string;
  experiments: Record<string, ExperimentProgress>;
}
