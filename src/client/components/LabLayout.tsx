import React, { useEffect, useState } from 'react';
import { useLearnerProgress } from '../hooks/useLearnerProgress.js';
import { useInspector } from '../hooks/useInspector.js';
import { StepUnderstand } from './StepUnderstand.js';
import { StepPredict } from './StepPredict.js';
import { StepExperiment } from './StepExperiment.js';
import { StepCompare } from './StepCompare.js';
import { LearningPractice } from './LearningPractice.js';
import { RequestInspector } from './RequestInspector.js';
import { Check, Lock } from 'lucide-react';
import type { LabManifest, ExperimentDefinition } from '../../shared/contracts/lab.js';
import type { ExperimentStep } from '../../shared/contracts/progress.js';

// The Markdown renderer is needed only when the learner opens the explanation.
const loadStepLearn = () => import('./StepLearn.js');
const StepLearn = React.lazy(() => loadStepLearn().then(module => ({ default: module.StepLearn })));

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
  const { progress, update, setStep, setPrediction, setInvestigationNotes, recordAttempt } = useLearnerProgress(
    manifest.id,
    currentExperiment.id
  );
  const [openedExperimentId, setOpenedExperimentId] = useState<string | null>(null);
  useEffect(() => {
    if (progress.currentStep === 'experiment') setOpenedExperimentId(currentExperiment.id);
  }, [progress.currentStep, currentExperiment.id]);

  const { observations, error: inspectorError, isLoading: isInspectorLoading, refresh: refreshInspector, clearLogs, live, setLive } = useInspector(
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

  const isStepEnabled = (): boolean => true;

  return (
    <div className="space-y-6">
      {/* Lab Header & Experiment Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Interactive Lab
            </span>
            <h2 id="active-lab-heading" tabIndex={-1} className="text-xl font-bold text-slate-100 mt-0.5">{manifest.title}</h2>
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
              className="max-w-full min-w-0 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 font-medium"
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
              const enabled = isStepEnabled();

              return (
                <button
                  key={step}
                  onPointerEnter={() => { if (step === 'learn') void loadStepLearn(); }}
                  onFocus={() => { if (step === 'learn') void loadStepLearn(); }}
                  onClick={() => { setStep(step); if (step === 'learn') update({ explanationViewedAt: Date.now() }); }}
                  disabled={!enabled}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                      : enabled
                      ? 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 text-slate-600 border border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <span
                    aria-hidden="true"
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

      <p className="text-sm text-slate-300">Choose a guided step above, or <button className="underline" onClick={() => setStep('experiment')}>Explore freely</button>. Explanations are always available. An attempt is not a claim of mastery.</p>
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

        {(
          <div hidden={progress.currentStep !== 'experiment'}>
            <StepExperiment
              key={currentExperiment.id}
              experiment={currentExperiment}
              attempted={progress.attempted}
              notes={progress.investigationNotes || ''}
              onNotesChange={setInvestigationNotes}
              onNext={() => setStep('compare')}
            >
              {(progress.currentStep === 'experiment' || openedExperimentId === currentExperiment.id) &&
                children({ onExperimentActionExecuted: handleExperimentActionExecuted })}
            </StepExperiment>
          </div>
        )}

        {progress.currentStep === 'compare' && (
          <StepCompare
            experiment={currentExperiment}
            selectedPredictionId={progress.selectedPredictionId}
            observations={observations}
            evidence={progress.evidence}
            investigationNotes={progress.investigationNotes}
            onRetry={() => setStep('experiment')}
            onNext={() => { update({ explanationViewedAt: Date.now() }); setStep('learn'); }}
          />
        )}

        {progress.currentStep === 'learn' && (
          <React.Suspense fallback={<p role="status">Loading explanation…</p>}>
            <StepLearn
              experiment={currentExperiment}
              references={manifest.references}
              unlocked={true}
              experiments={experiments}
              onSelectExperiment={onSelectExperiment}
            />
          </React.Suspense>
        )}
      </div>

      <LearningPractice key={currentExperiment.id} experiment={currentExperiment} progress={progress} update={update} />
      {/* Request Inspector for the active experiment */}
      <label className="block"><input type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} /> Live inspector updates (off by default)</label>
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
