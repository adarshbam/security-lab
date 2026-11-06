import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { ExperimentDefinition, LabReference } from '../../shared/contracts/lab.js';
import Markdown from 'react-markdown';

interface StepLearnProps {
  experiment: ExperimentDefinition;
  references: LabReference[];
  unlocked: boolean;
  experiments: Record<string, ExperimentDefinition>;
  onSelectExperiment: (id: string) => void;
}

export const StepLearn: React.FC<StepLearnProps> = ({
  experiment,
  references,
  unlocked,
  experiments,
  onSelectExperiment,
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
      {experiment.id.startsWith('jwt-') && <section className="investigation" aria-label="JWT reading path">
        <h3>{['jwt-confusion', 'jwt-none'].includes(experiment.id) ? 'Advanced follow-up · historical verifier behavior' : 'Essential JWT concepts'}</h3>
        <p>First explain claims → signature verification → identity → permission using Decode is not verification. Cookie handling and request size reuse earlier skills. Study the historical RSA/HMAC and unsigned-token reproductions afterwards; their results depend on the stated library and configuration.</p>
        <details><summary>Cryptography vocabulary for the historical exercises</summary><p>RSA signs with a private key and verifies with a public key. HMAC signs and verifies with one shared secret. A verifier must fix the expected algorithm and key type rather than trusting the token’s algorithm header. An unsigned token carries no signature; a missing verification key is a configuration failure, not a property of every JWT implementation.</p></details>
      </section>}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">Step 5: Architectural Breakdown & Authoritative References</h3>
        </div>

        {/* Learn Markdown */}
        <div className="markdown bg-slate-950 p-5 rounded-lg border border-slate-800/80 text-sm text-slate-300 leading-relaxed">
          <Markdown components={{
            a: ({ href, children, ...props }) => {
              const id = href?.startsWith('#experiment-') ? href.slice('#experiment-'.length) : undefined;
              const target = id ? experiments[id] : undefined;
              if (id && target) return <a {...props} href={'?lab=' + encodeURIComponent(new URLSearchParams(location.search).get('lab') || localStorage.getItem('security_lab_active_lab') || 'cookie-storage') + '&experiment=' + encodeURIComponent(id)} onClick={(event) => {
                event.preventDefault();
                onSelectExperiment(id);
              }}>{target.title}</a>;
              return <a {...props} href={href}>{children}</a>;
            },
          }}>{experiment.learnMarkdown}</Markdown>
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
