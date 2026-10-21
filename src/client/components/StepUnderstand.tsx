import React from 'react';
import { ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import type { ExperimentDefinition } from '../../shared/contracts/lab.js';

interface StepUnderstandProps {
  experiment: ExperimentDefinition;
  onNext: () => void;
}

export const StepUnderstand: React.FC<StepUnderstandProps> = ({ experiment, onNext }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-bold text-slate-100 mb-2">{experiment.title}</h3>
        <p className="text-sm text-slate-300 leading-relaxed mb-4">{experiment.summary}</p>

        {/* Starting Conditions Checklist */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 mb-6">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            Starting Conditions & Prerequisites
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
            {experiment.startingConditions.map((cond, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">&bull;</span>
                <span>{cond}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Understand Markdown Content */}
        <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-xs leading-relaxed space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
          <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            Core Concepts & Architectural Principles
          </div>
          <div className="whitespace-pre-line text-slate-300">
            {experiment.understandMarkdown}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onNext}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <span>Next: Record Your Prediction</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
