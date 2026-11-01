import React, { useEffect } from 'react';
import { useLearnerProgress } from '../hooks/useLearnerProgress.js';
import { useInspector } from '../hooks/useInspector.js';
import { StepUnderstand } from './StepUnderstand.js';
import { StepPredict } from './StepPredict.js';
import { StepExperiment } from './StepExperiment.js';
import { StepCompare } from './StepCompare.js';
import { StepLearn } from './StepLearn.js';
import { RequestInspector } from './RequestInspector.js';
import { Check, Lock } from 'lucide-react';
import type { LabManifest, ExperimentDefinition } from '../../shared/contracts/lab.js';
import type { ExperimentStep } from '../../shared/contracts/progress.js';

interface LabLayoutProps {
  manifest: LabManifest;
  experiments: Record<string, ExperimentDefinition>;
  activeExperimentId: string;
  onSelectExperiment: (id: string) => void;
  children: (props: { onExperimentActionExecuted: (evidence?: Record<string, unknown>) => void }) => React.ReactNode;
}

const STEP_LABELS: { step: ExperimentStep; title: string; num: string }[] = [
  { step: 'understand', title: 'Understand', num: '1' },
  { step: 'predict', title: 'Predict', num: '2' },
  { step: 'experiment', title: 'Experiment', num: '3' },
  { step: 'compare', title: 'Compare', num: '4' },
  { step: 'learn', title: 'Learn', num: '5' },
];

export const LabLayout: React.FC<LabLayoutProps> = ({
  manifest,
  experiments,
  activeExperimentId,
  onSelectExperiment,
  children,
}) => {
  const currentExperiment = experiments[activeExperimentId] || Object.values(experiments)[0];
  const { progress, setStep, setPrediction, recordAttempt } = useLearnerProgress(
    manifest.id,
    currentExperiment.id
  );

  const { observations, error: inspectorError, isLoading: isInspectorLoading, refresh: refreshInspector, clearLogs } = useInspector(
    currentExperiment.id
  );

  useEffect(() => {
    // Only a completed request FROM another origin unlocks external experiments.
    const externalAttempt = observations.some(o => o.path === '/probe/cookies' || (o.secFetchSite && o.secFetchSite !== 'same-origin' &&
      (/\/update-|\/probe(?:$|\?)|\/probe\/cookies/.test(o.path) ||
        (currentExperiment.id === 'exp4-scope-boundaries' && o.host.startsWith('sibling.')))));
    if (!progress.attempted && externalAttempt) recordAttempt();
  }, [observations, progress.attempted, recordAttempt, currentExperiment.id]);

  const handleExperimentActionExecuted = (evidence?: Record<string, unknown>) => {
    recordAttempt(evidence);
    refreshInspector();
  };

  const isStepEnabled = (step: ExperimentStep): boolean => {
    if (step === 'understand' || step === 'predict') return true;
    if (step === 'experiment') return Boolean(progress.selectedPredictionId);
    if (step === 'compare') return progress.attempted;
    if (step === 'learn') return progress.unlockedLearn;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Lab Header & Experiment Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Interactive Lab
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-0.5">{manifest.title}</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {manifest.description}
            </p>
          </div>

          {/* Experiment Switcher Dropdown / Pills */}
          <div className="flex flex-wrap min-w-0 items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Select Experiment:</span>
            <select
              aria-label="Select Experiment"
              value={activeExperimentId}
              onChange={(e) => onSelectExperiment(e.target.value)}
              className="max-w-full min-w-0 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {manifest.experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5-Step Learning Journey Wizard Nav */}
        <div className="pt-6">
          <nav className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STEP_LABELS.map(({ step, title, num }) => {
              const isActive = progress.currentStep === step;
              const enabled = isStepEnabled(step);

              return (
                <button
                  key={step}
                  onClick={() => enabled && setStep(step)}
                  disabled={!enabled}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                      : enabled
                      ? 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 text-slate-600 border border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-white text-sky-700'
                        : enabled
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-900 text-slate-600'
                    }`}
                  >
                    {enabled && (step === 'understand' || (step === 'predict' && progress.selectedPredictionId) || (step === 'experiment' && progress.attempted)) ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : enabled ? (
                      num
                    ) : (
                      <Lock className="w-2.5 h-2.5" />
                    )}
                  </span>
                  <span className="truncate">{title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Step Content Area */}
      <div>
        {progress.currentStep === 'understand' && (
          <StepUnderstand
            experiment={currentExperiment}
            onNext={() => setStep('predict')}
          />
        )}

        {progress.currentStep === 'predict' && (
          <StepPredict
            experiment={currentExperiment}
            selectedPredictionId={progress.selectedPredictionId}
            onSelectPrediction={setPrediction}
            onNext={() => setStep('experiment')}
          />
        )}

        {progress.selectedPredictionId && (
          <div hidden={progress.currentStep !== 'experiment'}>
            <StepExperiment
              experiment={currentExperiment}
              attempted={progress.attempted}
              onNext={() => setStep('compare')}
            >
              {children({ onExperimentActionExecuted: handleExperimentActionExecuted })}
            </StepExperiment>
          </div>
        )}

        {progress.currentStep === 'compare' && (
          <StepCompare
            experiment={currentExperiment}
            selectedPredictionId={progress.selectedPredictionId}
            observations={observations}
            evidence={progress.evidence}
            onNext={() => setStep('learn')}
          />
        )}

        {progress.currentStep === 'learn' && (
          <StepLearn
            experiment={currentExperiment}
            references={manifest.references}
            unlocked={progress.unlockedLearn}
          />
        )}
      </div>

      {/* Request Inspector for the active experiment */}
      <RequestInspector
        observations={observations}
        isLoading={isInspectorLoading}
        onRefresh={refreshInspector}
        onClear={clearLogs}
      />
      {inspectorError && <p role="alert" className="text-rose-300">Inspector: {inspectorError}</p>}
    </div>
  );
};
