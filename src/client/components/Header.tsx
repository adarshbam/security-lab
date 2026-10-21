import React from 'react';
import { ShieldCheck, RotateCcw, BookOpen } from 'lucide-react';
import type { LabManifest } from '../../shared/contracts/lab.js';

interface HeaderProps {
  labs: LabManifest[];
  activeLabId: string;
  onSelectLab: (id: string) => void;
  onResetExperimentState: () => void;
  onRestartLearningProgress: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  labs,
  activeLabId,
  onSelectLab,
  onResetExperimentState,
  onRestartLearningProgress,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between min-h-16 py-3 gap-4">
          {/* Logo & Host badge */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 tracking-tight flex flex-wrap items-center gap-2">
                Web Security Laboratory
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Local HTTPS (8443)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Host: app.security-lab.test
              </div>
            </div>
          </div>

          {/* Lab Selector Tabs */}
          <nav className="flex flex-wrap w-full sm:w-auto min-w-0 items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {labs.map((lab) => (
              <button
                key={lab.id}
                onClick={() => onSelectLab(lab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeLabId === lab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {lab.title}
              </button>
            ))}
          </nav>

          {/* Control Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onResetExperimentState}
              title="Revert in-memory server state and invalidate session credentials"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              Reset Experiment
            </button>

            <button
              onClick={onRestartLearningProgress}
              title="Clear wizard predictions and lock explanations back to step 1"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Restart Learning Progress
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
