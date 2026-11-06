/** Pedagogical order only. IDs, experiments and each lab’s runtime state stay independent. */
export interface CurriculumStep {
  id: string;
  difficulty: 'Introductory' | 'Foundational' | 'Intermediate' | 'Advanced';
  rationale: string;
  knowledge: string;
  prerequisites: readonly { id: string; reason: string }[];
  checkpoint: string;
}

export const curriculum: readonly CurriculumStep[] = [
  {
    id: 'broken-access-control', difficulty: 'Introductory',
    rationale: 'Start with one change: request another person’s object ID. Separate being signed in from being allowed to access a resource.',
    knowledge: 'Recognize a request URL, an HTTP method and a response status. The primer below introduces these ideas.',
    prerequisites: [],
    checkpoint: 'Explain why Sam’s file needs an ownership check on every read and delete, then verify that Alex can still access Alex’s own file.',
  },
  {
    id: 'privilege-escalation', difficulty: 'Foundational',
    rationale: 'Move from accessing another member’s resources to gaining an administrator’s permissions. Trace how an unexpected profile field crosses a trust boundary.',
    knowledge: 'Read a small JSON request body and distinguish an ordinary member from an administrator.',
    prerequisites: [{ id: 'broken-access-control', reason: 'Reuse the distinction between identity, ownership and permission.' }],
    checkpoint: 'Show why accepting a client-supplied role changes future permissions, and why an allowed-field list preserves legitimate profile edits.',
  },
  {
    id: 'cookie-storage', difficulty: 'Foundational',
    rationale: 'Now examine how requests carry identity. Compare browser storage, automatic cookies and explicit bearer headers before investigating browser-based attacks.',
    knowledge: 'Understand signed-in identity and permissions; open the Application, Console and Network panels in browser Developer Tools.',
    prerequisites: [{ id: 'broken-access-control', reason: 'Separate proving identity from checking access; Lab 2 is useful practice but is not required here.' }],
    checkpoint: 'Predict which credential JavaScript can read and which the browser sends. Explain why HttpOnly does not prevent an executing script from making authenticated requests.',
  },
  {
    id: 'samesite-csrf', difficulty: 'Intermediate',
    rationale: 'Use automatic cookie attachment to investigate requests from another site. Distinguish sending a request, reading a response and changing server state.',
    knowledge: 'Compare origins and sites, and recognize GET, POST and automatically attached cookies.',
    prerequisites: [{ id: 'cookie-storage', reason: 'Cookie scope and ambient authentication explain how a forged request can carry a session.' }],
    checkpoint: 'Compare a real attacker-origin request with a legitimate control. Use received credentials and server state to explain SameSite, CSRF-token and Origin defenses.',
  },
  {
    id: 'injection-attacks', difficulty: 'Intermediate',
    rationale: 'Start a new branch: input becomes query structure instead of ordinary data. Compare SQL parameters, document operators and JavaScript type validation.',
    knowledge: 'Read JSON strings, objects, numbers and booleans, plus a simple SELECT query. The experiments introduce the query syntax.',
    prerequisites: [{ id: 'broken-access-control', reason: 'Reuse the request/response investigation method and verify the resulting identity. CSRF is a separate branch, not a requirement.' }],
    checkpoint: 'Explain why a string can alter concatenated SQL, why an operator object differs from an operator string, and why input validation and parameter binding have different jobs.',
  },
  {
    id: 'xss-csp', difficulty: 'Advanced',
    rationale: 'Apply the data-versus-code boundary in the browser. Trace reflected, stored and DOM input, then compare safe rendering with report-only and enforced CSP.',
    knowledge: 'Recognize HTML elements, JavaScript event handlers and DOM text versus HTML insertion. The worked examples introduce each sink.',
    prerequisites: [
      { id: 'injection-attacks', reason: 'Transfer the distinction between untrusted data and executable structure.' },
      { id: 'cookie-storage', reason: 'Explain script capabilities and the limits of HttpOnly after execution begins.' },
    ],
    checkpoint: 'Trace a source to its sink, verify a legitimate script still works, and distinguish safe rendering, a CSP report and actual browser enforcement.',
  },
  {
    id: 'exployting-jwt-tokens', difficulty: 'Advanced',
    rationale: 'Finish with signed identity claims and historical verifier failures. Combine permissions, credential handling and explicit trust decisions while inspecting real tokens.',
    knowledge: 'Read JSON claims; distinguish decoding from verification, public keys from shared secrets, and authentication from authorization. The lab introduces the cryptography vocabulary.',
    prerequisites: [
      { id: 'privilege-escalation', reason: 'Recognize the consequences of trusting an attacker-controlled role.' },
      { id: 'cookie-storage', reason: 'Compare bearer headers with independent readable and HttpOnly cookies.' },
      { id: 'samesite-csrf', reason: 'Understand the protected cookie mutation and the fixed same-origin script action.' },
    ],
    checkpoint: 'Explain why decoding proves nothing about a signature. Compare the same crafted token against historical and configured modern verifiers, then separate authentication from admin authorization.',
  },
];

export function curriculumPosition(id: string): number {
  const index = curriculum.findIndex(step => step.id === id);
  return index < 0 ? curriculum.length : index;
}
