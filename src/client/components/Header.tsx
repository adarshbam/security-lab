import React from 'react';
import { ShieldCheck, RotateCcw, BookOpen } from 'lucide-react';
import type { LabManifest } from '../../shared/contracts/lab.js';
import { ActionExplanation } from './ActionExplanation.js';

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
          <label className="learning-path-picker">Choose a lab
            <select value={activeLabId} onChange={event => onSelectLab(event.target.value)}>
              {labs.map((lab, index) => <option key={lab.id} value={lab.id}>{String(index + 1).padStart(2, '0')} · {lab.title}</option>)}
            </select>
          </label>
          <nav aria-label="Labs in learning order" className="hidden md:flex flex-wrap w-full sm:w-auto min-w-0 items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {labs.map((lab, index) => (
              <button
                key={lab.id}
                aria-current={activeLabId === lab.id ? 'page' : undefined}
                onClick={() => onSelectLab(lab.id)}
                className={`min-h-11 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeLabId === lab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')} · </span>{lab.title}
              </button>
            ))}
          </nav>

          {/* Control Actions */}
          <div className="space-y-2">
            <details className="text-xs text-slate-300 max-w-prose">
              <summary className="reset-explanation">What the reset controls change</summary>
              <ActionExplanation title="Server state and learning progress are separate">
                <p>Reset Experiment posts to this lab’s /reset endpoint, restores its fictional server state, invalidates its credentials, clears inspector logs for all its experiments, then reloads the page. It retains your predictions and notes. For the storage lab it also removes auth_token and app_specific_secret from localStorage. Other labs’ state is retained.</p>
                <p>Restart Learning Progress removes security_lab_learner_progress_v1 and security_lab_learner_progress_v2 from this origin’s localStorage and reloads. It clears predictions, notes and progress across all labs; it does not revoke server credentials or restore server state.</p>
              </ActionExplanation>
            </details>
            <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onResetExperimentState}
              title="Revert in-memory server state and invalidate session credentials"
              className="min-h-11 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              Reset Experiment
            </button>

            <button
              onClick={onRestartLearningProgress}
              title="Clear predictions, observations and practice records across all labs"
              className="min-h-11 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Restart Learning Progress
            </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
