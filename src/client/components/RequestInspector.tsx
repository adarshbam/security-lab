import React, { useState } from 'react';
import { Activity, Trash2, RefreshCw, ChevronDown, ChevronRight, Shield, ShieldAlert, ArrowRight } from 'lucide-react';
import type { ExperimentObservation } from '../../shared/contracts/inspector.js';

interface RequestInspectorProps {
  observations: ExperimentObservation[];
  isLoading: boolean;
  onRefresh: () => void;
  onClear: () => void;
}

export const RequestInspector: React.FC<RequestInspectorProps> = ({
  observations,
  isLoading,
  onRefresh,
  onClear,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-8">
      {/* Inspector Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-slate-100 text-sm">Server Request Inspector</h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {observations.length} observed
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-md transition-colors text-xs flex items-center gap-1"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-md transition-colors text-xs flex items-center gap-1"
            title="Clear inspector observations"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {observations.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          No requests recorded for this experiment yet. Trigger an action above or submit a request to observe headers, cookies, and protection decisions.
        </div>
      ) : (
        <div className="divide-y divide-slate-800 text-xs font-mono">
          {observations.map((obs) => {
            const isExpanded = expandedId === obs.id;
            const isAllowed = obs.protectionDecision.allowed;
            const isSuccessStatus = obs.status >= 200 && obs.status < 300;

            return (
              <div key={obs.id} className="hover:bg-slate-950/40 transition-colors">
                {/* Collapsed Row */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleExpand(obs.id); } }}
                  onClick={() => toggleExpand(obs.id)}
                  className="p-3 flex items-center justify-between cursor-pointer gap-2 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-500">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        obs.method === 'GET'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {obs.method}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        isSuccessStatus
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : obs.status === 403
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {obs.status}
                    </span>

                    <span className="truncate text-slate-200 font-sans font-medium text-xs">
                      {obs.path}
                    </span>

                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Host: {obs.host}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Protection decision badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold flex items-center gap-1 ${
                        isAllowed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/80'
                      }`}
                    >
                      {isAllowed ? <Shield className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      {obs.protectionDecision.decision.toUpperCase()}
                    </span>

                    <span className="text-[11px] text-slate-500">
                      {new Date(obs.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Pane */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Headers & Fetch Metadata */}
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="font-sans font-semibold text-slate-300 text-xs">
                          Request Headers & Fetch Metadata
                        </div>
                        <div className="space-y-1 text-slate-300">
                          <div><span className="text-slate-500">Origin:</span> {obs.origin || '(omitted)'}</div>
                          <div><span className="text-slate-500">Referer:</span> {obs.referer || '(omitted)'}</div>
                          <div><span className="text-slate-500">Sec-Fetch-Site:</span> {obs.secFetchSite || '(omitted)'}</div>
                          <div><span className="text-slate-500">Sec-Fetch-Mode:</span> {obs.secFetchMode || '(omitted)'}</div>
                          <div><span className="text-slate-500">Sec-Fetch-Dest:</span> {obs.secFetchDest || '(omitted)'}</div>
                        </div>
                      </div>

                      {/* Cookies Audit */}
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="font-sans font-semibold text-slate-300 text-xs flex items-center justify-between">
                          <span>Cookies Received by Server</span>
                          <span className="text-[10px] text-amber-400 font-sans">Secrets Redacted</span>
                        </div>
                        {obs.cookies.length === 0 ? (
                          <div className="text-slate-500 italic text-[11px]">
                            No cookies attached to this request.
                          </div>
                        ) : (
                          <div className="space-y-1 text-slate-300">
                            {obs.cookies.map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="text-cyan-300 font-semibold">{c.name}:</span>
                                <span className="text-slate-500">{c.redactedValue}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Decision & State Diff */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Security Decision */}
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="font-sans font-semibold text-slate-300 text-xs">
                          Security Assessment
                        </div>
                        <div>
                          <span className="text-slate-500">Auth Status: </span>
                          <span className={obs.authResult.authenticated ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {obs.authResult.authenticated ? `Authenticated (${obs.authResult.identity})` : 'Unauthenticated'}
                          </span>
                        </div>
                        {obs.protectionDecision.ruleApplied && (
                          <div>
                            <span className="text-slate-500">Rule Applied: </span>
                            <span className="text-sky-300">{obs.protectionDecision.ruleApplied}</span>
                          </div>
                        )}
                        {obs.protectionDecision.reason && (
                          <div>
                            <span className="text-slate-500">Reason: </span>
                            <span className="text-rose-300">{obs.protectionDecision.reason}</span>
                          </div>
                        )}
                      </div>

                      {/* State Diff */}
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="font-sans font-semibold text-slate-300 text-xs">
                          State Transition Diff
                        </div>
                        {Object.keys(obs.stateBefore).length === 0 && Object.keys(obs.stateAfter).length === 0 ? (
                          <div className="text-slate-500 italic text-[11px]">
                            State snapshots were not recorded for this request.
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[11px] overflow-x-auto">
                            <div className="p-2 rounded bg-slate-950 border border-slate-800">
                              <div className="text-[10px] text-slate-500 font-sans">Before</div>
                              <pre className="text-slate-300">{JSON.stringify(obs.stateBefore, null, 1)}</pre>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                            <div className="p-2 rounded bg-slate-950 border border-slate-800">
                              <div className="text-[10px] text-slate-500 font-sans">After</div>
                              <pre className="text-slate-300">{JSON.stringify(obs.stateAfter, null, 1)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
