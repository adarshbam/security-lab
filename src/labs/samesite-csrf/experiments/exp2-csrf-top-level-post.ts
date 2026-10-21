import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp2CsrfTopLevelPost: ExperimentDefinition = {
  id: 'exp2-csrf-top-level-post',
  title: '2. Cross-Site Top-Level POST Submission',
  summary: 'Launch cross-site form submissions from attacker.csrf-lab.test against vulnerable vs protected endpoints.',
  startingConditions: [
    'A session cookie exists on app.security-lab.test.',
    'An attacker page on attacker.csrf-lab.test submits a standard HTML <form method="POST">.',
    'Target is /api/labs/samesite-csrf/update-vulnerable.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'When the attacker site submits a form POST with SameSite=None versus SameSite=Lax, what happens?',
  predictionOptions: [
    {
      id: 'none_succeeds_lax_blocks',
      label: 'Under SameSite=None, the cookie is sent and the vulnerable profile is exploited; under SameSite=Lax, the browser withholds the cookie on cross-site POST.',
      isCorrect: true,
      explanation: 'Correct! SameSite=None allows cross-site POST cookie transmission, enabling the attack. SameSite=Lax prevents cookie attachment on cross-site POST form submissions.',
    },
    {
      id: 'cors_blocks_forms',
      label: 'CORS prevents cross-site HTML form submissions from executing.',
      isCorrect: false,
      explanation: 'Incorrect! CORS governs JavaScript fetch/XHR response access, NOT HTML form navigation. Standard forms have submitted cross-site requests since the 1990s.',
    },
    {
      id: 'both_succeed',
      label: 'Both Lax and None allow cross-site POST form submissions with cookies.',
      isCorrect: false,
      explanation: 'Incorrect. SameSite=Lax explicitly withholds cookies on cross-site POST form submissions.',
    },
  ],
  learnMarkdown: `### Key Security Takeaway
- **CORS does NOT protect against CSRF**:
  - Developers frequently confuse CORS with CSRF.
  - CORS controls whether client-side JavaScript can *read* a response from another origin.
  - HTML form submissions navigate the browser directly — they do NOT use CORS preflights, and the server receives and processes the request before CORS could ever intervene!
- **SameSite=Lax as Defense-in-Depth**:
  - \`SameSite=Lax\` provides automatic defense against cross-site POST form submissions.
  - However, older browsers or legacy configurations without SameSite require explicit CSRF tokens.

### References
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [PortSwigger: CSRF vs CORS](https://portswigger.net/web-security/csrf)`,
  codeSnippets: [],
};
