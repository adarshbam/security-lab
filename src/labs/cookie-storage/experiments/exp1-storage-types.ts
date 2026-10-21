import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp1StorageTypes: ExperimentDefinition = {
  id: 'exp1-storage-types',
  title: 'Storage Primitives & JavaScript Accessibility',
  summary: 'Compare how localStorage, document.cookie, and HttpOnly cookies behave when queried by client-side JavaScript.',
  startingConditions: [
    'User authenticates to establish credentials.',
    'A bearer token is stored in localStorage.',
    'A JavaScript-readable session cookie (session_readable) is set.',
    'An HttpOnly session cookie (session_httponly) is set with Secure and SameSite=Lax.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'When JavaScript executes on this origin, which stored credentials will it be able to read directly?',
  predictionOptions: [
    {
      id: 'all',
      label: 'JavaScript can read localStorage, document.cookie, AND the HttpOnly cookie.',
      isCorrect: false,
      explanation: 'Incorrect. The browser strictly hides cookies marked with HttpOnly from document.cookie and DOM APIs.',
    },
    {
      id: 'local_and_readable',
      label: 'JavaScript can read localStorage and session_readable, but CANNOT read session_httponly.',
      isCorrect: true,
      explanation: 'Correct! localStorage and non-HttpOnly cookies are fully exposed to client-side scripts, whereas the HttpOnly cookie is completely hidden from JavaScript.',
    },
    {
      id: 'none',
      label: 'Browser security policies prevent JavaScript from reading any stored credentials.',
      isCorrect: false,
      explanation: 'Incorrect. Any script on the origin has full access to localStorage and non-HttpOnly cookies.',
    },
  ],
  learnMarkdown: `### Key Security Takeaway
The \`HttpOnly\` flag creates an architectural barrier that prevents client-side JavaScript from reading or exfiltrating the credential string.

- **Mitigation value**: If an attacker finds a Cross-Site Scripting (XSS) vulnerability, they cannot execute \`document.cookie\` or \`localStorage.getItem()\` to exfiltrate the \`session_httponly\` token to an external server.
- **Limitation**: While HttpOnly prevents *direct token exfiltration*, the browser will still attach the cookie to ambient requests made by the attacker's script (as investigated in Experiment 2!).

### References
- [MDN: HttpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly)
- [OWASP Session Management: Cookie Attributes](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookie-attributes)`,
  codeSnippets: [],
};
