import React, { useState } from 'react';
import { clientRegistry } from './registry.js';
import { Header } from './components/Header.js';
import { LabLayout } from './components/LabLayout.js';
import { controlRequest } from './api.js';

export const App: React.FC = () => {
  const labs = clientRegistry.getAll().map((m) => m.manifest);

  const [activeLabId, setActiveLabId] = useState<string>(() => {
    return localStorage.getItem('security_lab_active_lab') || labs[0]?.id || 'cookie-storage';
  });

  const currentModule = clientRegistry.get(activeLabId) || clientRegistry.getAll()[0];
  const [error, setError] = useState('');

  const [activeExperimentId, setActiveExperimentId] = useState<string>(() => {
    const saved = localStorage.getItem('security_lab_active_exp');
    return saved && currentModule.experiments[saved] ? saved : currentModule.manifest.experiments[0].id;
  });

  const handleSelectLab = (labId: string) => {
    setActiveLabId(labId);
    localStorage.setItem('security_lab_active_lab', labId);
    const mod = clientRegistry.get(labId);
    if (mod && mod.manifest.experiments[0]) {
      const firstExp = mod.manifest.experiments[0].id;
      setActiveExperimentId(firstExp);
      localStorage.setItem('security_lab_active_exp', firstExp);
    }
  };

  const handleSelectExperiment = (expId: string) => {
    setActiveExperimentId(expId);
    localStorage.setItem('security_lab_active_exp', expId);
  };

  const handleResetExperimentState = async () => {
    try {
      await controlRequest(`/api/labs/${currentModule.manifest.id}/reset`);
      for (const experiment of currentModule.manifest.experiments) {
        await controlRequest('/api/inspector/clear?experimentId=' + experiment.id);
      }
      if (currentModule.manifest.id === 'cookie-storage') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('app_specific_secret');
      }
      window.location.reload();
    } catch (e) { setError(String(e)); }
  };

  const handleRestartLearningProgress = () => {
    localStorage.removeItem('security_lab_learner_progress_v1');
    window.location.reload();
  };

  const LabComponent = currentModule.Component;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Header
        labs={labs}
        activeLabId={activeLabId}
        onSelectLab={handleSelectLab}
        onResetExperimentState={handleResetExperimentState}
        onRestartLearningProgress={handleRestartLearningProgress}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <p role="alert" className="text-rose-300">{error}</p>}
        <LabLayout
          manifest={currentModule.manifest}
          experiments={currentModule.experiments}
          activeExperimentId={activeExperimentId}
          onSelectExperiment={handleSelectExperiment}
        >
          {({ onExperimentActionExecuted }) => (
            <React.Suspense fallback={<p role="status">Loading lab…</p>}>
              <LabComponent
                key={currentModule.manifest.id + activeExperimentId}
                activeExperimentId={activeExperimentId}
                onSelectExperiment={handleSelectExperiment}
                onExperimentActionExecuted={onExperimentActionExecuted}
              />
            </React.Suspense>
          )}
        </LabLayout>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          Local Educational Environment &bull; MIT License &bull; Bound to loopback 127.0.0.1
        </div>
      </footer>
    </div>
  );
};
