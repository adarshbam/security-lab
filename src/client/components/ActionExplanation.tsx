import type { ReactNode } from 'react';
import './action-explanation.css';

/** Visible before the controls it explains; adds no requests or learner-state changes. */
export function ActionExplanation({ title, children }: { title: string; children: ReactNode }) {
  return <div className="action-explanation"><p><strong>{title}</strong></p>{children}</div>;
}
