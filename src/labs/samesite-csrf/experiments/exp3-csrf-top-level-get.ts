import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp3CsrfTopLevelGet: ExperimentDefinition = {
  id: 'exp3-csrf-top-level-get',
  title: '3. Unsafe GET Mutation Flaw',
  summary: 'Demonstrate why SameSite=Lax sends cookies on top-level GET navigation and fails to protect unsafe GET endpoints.',
  startingConditions: [
    'A session cookie is configured with SameSite=Lax.',
    'An endpoint /api/labs/samesite-csrf/update-get modifies state when receiving a GET request.',
    'Attacker site contains an <a> link or window.open targeting the vulnerable GET URL.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'If session_csrf is set to SameSite=Lax, will the browser send the cookie when the user clicks a top-level GET link from attacker.csrf-lab.test?',
  predictionOptions: [
    {
      id: 'lax_sends_get',
      label: 'Yes! SameSite=Lax permits cookie transmission on top-level GET navigations, and the unsafe GET endpoint will be exploited!',
      isCorrect: true,
      explanation: 'Correct! SameSite=Lax intentionally sends cookies on top-level GET navigations. Because this endpoint unsafely mutates state on GET, Lax does not protect it.',
    },
    {
      id: 'lax_blocks_all_cross_site',
      label: 'No, SameSite=Lax blocks cookies on all cross-site requests regardless of HTTP method.',
      isCorrect: false,
      explanation: 'Incorrect. That is the behavior of SameSite=Strict. Lax permits top-level GET navigations.',
    },
    {
      id: 'browsers_rewrite_get_to_post',
      label: 'Browsers automatically convert state-changing GET links to POST requests.',
      isCorrect: false,
      explanation: 'Incorrect. Browsers perform GET navigation verbatim.',
    },
  ],
  learnMarkdown: `### Key Security Takeaway
- **Never allow state mutations on GET requests**:
  - GET requests are intended to be idempotent and safe.
  - \`SameSite=Lax\` relies fundamentally on this contract.
  - If your backend changes passwords, transfers funds, or updates emails on a GET request, \`SameSite=Lax\` offers zero protection against cross-site link clicks!
- **Strict Method Enforcement**:
  - Always enforce state-changing mutations exclusively via \`POST\`, \`PUT\`, \`PATCH\`, or \`DELETE\`.
  - Reject GET requests on mutation routes with \`405 Method Not Allowed\`.

### References
- [OWASP CSRF Prevention: Use Built-In CSRF Protections & Safe HTTP Methods](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-built-in-csrf-mitigations)
- [RFC 7231: Section 4.2.1 Safe Methods](https://datatracker.ietf.org/doc/html/rfc7231#section-4.2.1)`,
  codeSnippets: [],
};
