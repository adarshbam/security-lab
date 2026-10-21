import type { Router } from 'express';
import type { ComponentType } from 'react';

export interface LabReference {
  title: string;
  url: string;
  description?: string;
}

export interface ExperimentMetadata {
  id: string;
  title: string;
  summary: string;
}

export interface PredictionOption {
  id: string;
  label: string;
  isCorrect: boolean;
  explanation: string;
}

export interface CodeSnippetItem {
  title: string;
  language: string;
  code: string;
  explanation?: string;
}

export interface ExperimentDefinition {
  id: string;
  title: string;
  summary: string;
  startingConditions: string[];
  understandMarkdown: string;
  predictionPrompt: string;
  predictionOptions: PredictionOption[];
  learnMarkdown: string;
  codeSnippets: CodeSnippetItem[];
}

export interface LabManifest {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  experiments: ExperimentMetadata[];
  references: LabReference[];
}

export interface LabClientModule {
  manifest: LabManifest;
  experiments: Record<string, ExperimentDefinition>;
  Component: ComponentType<{
    activeExperimentId: string;
    onSelectExperiment: (id: string) => void;
    onExperimentActionExecuted?: (evidence?: Record<string, unknown>) => void;
  }>;
}

export interface LabServerModule {
  manifest: LabManifest;
  router: Router;
  hostRouters?: Partial<Record<'sibling' | 'attacker', Router>>;
  getInitialState: () => Record<string, any>;
  resetState: () => void;
  getState: () => Record<string, any>;
}
