import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { ExperimentDefinition, LabReference } from '../../shared/contracts/lab.js';
import Markdown from 'react-markdown';

interface StepLearnProps {
  experiment: ExperimentDefinition;
  references: LabReference[];
  unlocked: boolean;
}

export const StepLearn: React.FC<StepLearnProps> = ({
  experiment,
  references,
  unlocked,
}) => {
  if (!unlocked) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
        <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="font-semibold text-slate-300 text-sm">Step 5 is Locked</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          To maximize active learning, in-depth explanations and reference guides unlock after attempting the experiment and evaluating your prediction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">Step 5: Architectural Breakdown & Authoritative References</h3>
        </div>

        {/* Learn Markdown */}
        <div className="markdown bg-slate-950 p-5 rounded-lg border border-slate-800/80 text-sm text-slate-300 leading-relaxed">
          <Markdown>{experiment.learnMarkdown}</Markdown>
        </div>

        {/* References */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs uppercase font-semibold text-slate-400">Primary References & Standards</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {references.map((ref, idx) => (
              <a
                key={idx}
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors block text-xs group"
              >
                <div className="font-semibold text-sky-400 group-hover:text-sky-300 flex items-center justify-between">
                  <span>{ref.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-300" />
                </div>
                {ref.description && (
                  <p className="text-[11px] text-slate-400 mt-1">{ref.description}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
