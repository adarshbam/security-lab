import { lessonGuidance } from '../../shared/lesson-guidance.js';

export function LessonBrief({ id }: { id: string }) {
  const guidance = lessonGuidance[id];
  if (!guidance) return null;
  return <aside className="investigation" aria-label="Evidence checklist">
    <h3>Explain this result</h3>
    <p><strong>Trace to inspect:</strong> {guidance.trace}. This describes what to investigate, not a recorded outcome.</p>
    <ol className="investigation-steps">
      <li>Identity: which account or credential did the server actually recognize?</li>
      <li>Boundary: which ownership, input, browser or verification rule was checked?</li>
      <li>Outcome: what response and fresh state read support your conclusion?</li>
      <li>Control: does the same permitted action still work for a legitimate user?</li>
    </ol>
    {((id.startsWith('exp') && id.includes('csrf')) || ['exp1-samesite-modes', 'exp5-origin-validation', 'exp6-sibling-vs-attacker'].includes(id)) ? <details>
      <summary>If your CSRF result differs</summary>
      <p>Confirm the named attacker or sibling tab submitted the request. First run the legitimate app control to check the session has not expired. Inspect the received Cookie and Origin, selected SameSite mode and defense. For embedded/fetch probes, check browser privacy restrictions; retry with the top-level form control. Refresh actual preferences and inspector logs. A CORS error alone does not show whether state changed.</p>
    </details> : null}
    {id.startsWith('jwt-') && <p><strong>Reading path:</strong> Start with “Decode is not verification.” Cookie storage and byte measurements reuse earlier concepts. RSA/HMAC confusion and unsigned historical defaults are optional advanced follow-ups; each applies to its stated version and configuration.</p>}
  </aside>;
}

export function CookieScopeGuide() {
  return <details className="investigation"><summary>Cookie scope at a glance</summary>
    <div className="overflow-x-auto"><table><caption>Separate storage visibility from transmission</caption>
      <thead><tr><th>Boundary</th><th>Question to check</th></tr></thead>
      <tbody>{[
        ['Domain', 'Which hosts receive it? A host-only cookie differs from a parent-domain cookie.'],
        ['Path', 'Which request paths match? Path is not an authorization boundary.'],
        ['Secure', 'Is the request HTTPS? Cookies are not isolated by port.'],
        ['SameSite', 'Which source site, method and navigation context are eligible?'],
        ['HttpOnly', 'Can page JavaScript read it? This does not prevent eligible authenticated requests.'],
        ['Lifetime', 'Did the browser expire it, or did the server revoke the session?'],
        ['localStorage', 'Which exact scheme, host and port owns it? It is not automatically sent.'],
      ].map(([name, question]) => <tr key={name}><th scope="row">{name}</th><td>{question}</td></tr>)}</tbody>
    </table></div>
  </details>;
}
