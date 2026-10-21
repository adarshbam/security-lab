import React from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import type { ExperimentDefinition } from '../../shared/contracts/lab.js';

interface StepExperimentProps {
  experiment: ExperimentDefinition;
  attempted: boolean;
  onNext: () => void;
  children: React.ReactNode;
}

export const StepExperiment: React.FC<StepExperimentProps> = ({
  attempted,
  onNext,
  children,
}) => {
  return (
    <div className="space-y-6">
      {/* Interactive Controls Slot */}
      {children}

      {/* Code Snippets Section */}
      {attempted && <p className="text-sm text-slate-400">Executable implementation source is now available in Compare.</p>}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-400">
          {attempted ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Experiment action executed. You can now compare results!
            </span>
          ) : (
            <span>Run any experiment action above to enable comparison.</span>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!attempted}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <span>Compare Outcome & Hypotheses</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
