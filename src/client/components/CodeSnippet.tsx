import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { CodeSnippetItem } from '../../shared/contracts/lab.js';

interface CodeSnippetProps {
  snippets: CodeSnippetItem[];
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({ snippets }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleCopy = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setError(''); setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { setError('Clipboard access was denied. Select the source text to copy it.'); }
  };

  if (!snippets || snippets.length === 0) return null;

  return (
    <div className="space-y-3 my-4">
      {error && <p role="status">{error}</p>}
      {snippets.map((snip, idx) => (
        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden text-xs">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
            <span className="font-semibold text-slate-300 font-mono text-[11px]">{snip.title}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono text-slate-500">{snip.language}</span>
              <button
                onClick={() => handleCopy(snip.code, idx)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                title="Copy snippet"
              >
                {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <pre className="p-3 text-slate-300 font-mono overflow-auto max-h-96 leading-relaxed">
            {snip.code}
          </pre>
        </div>
      ))}
    </div>
  );
};
