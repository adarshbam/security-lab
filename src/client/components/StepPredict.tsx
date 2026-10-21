import React from 'react';
import { ArrowRight, HelpCircle, CheckCircle } from 'lucide-react';
import type { ExperimentDefinition } from '../../shared/contracts/lab.js';

interface StepPredictProps {
  experiment: ExperimentDefinition;
  selectedPredictionId: string | null;
  onSelectPrediction: (id: string) => void;
  onNext: () => void;
}

export const StepPredict: React.FC<StepPredictProps> = ({
  experiment,
  selectedPredictionId,
  onSelectPrediction,
  onNext,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-slate-100">Step 2: Formulate Your Hypothesis</h3>
        </div>

        <p className="text-sm font-medium text-slate-200 mb-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
          {experiment.predictionPrompt}
        </p>

        <div className="space-y-2.5 mb-6">
          {experiment.predictionOptions.map((opt) => {
            const isSelected = selectedPredictionId === opt.id;
            return (
              <label
                key={opt.id}
                onClick={() => onSelectPrediction(opt.id)}
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-sky-950/70 border-sky-500 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="prediction"
                  checked={isSelected}
                  onChange={() => onSelectPrediction(opt.id)}
                  className="mt-1 text-sky-500 focus:ring-sky-400"
                />
                <span className="text-xs font-medium leading-relaxed">{opt.label}</span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {selectedPredictionId ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Prediction recorded! Experiment execution is unlocked.
              </span>
            ) : (
              <span className="text-amber-400">
                Please select a hypothesis to enable experiment execution.
              </span>
            )}
          </div>

          <button
            onClick={onNext}
            disabled={!selectedPredictionId}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <span>Proceed to Experiment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
