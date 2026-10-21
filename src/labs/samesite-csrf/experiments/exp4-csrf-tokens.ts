import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp4CsrfTokens: ExperimentDefinition = {
  id: 'exp4-csrf-tokens',
  title: '4. Synchronizer CSRF Token Protection',
  summary: 'Verify how session-bound, unpredictable CSRF tokens block cross-site forged submissions.',
  startingConditions: [
    'A session cookie exists on app.security-lab.test.',
    'Endpoint /api/labs/samesite-csrf/update-token requires a valid synchronizer token.',
    'Attacker page submits a cross-site form POST without the victim\'s valid token.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'When the attacker submits a form POST targeting the token-protected endpoint, what will the server do?',
  predictionOptions: [
    {
      id: 'token_rejected',
      label: 'The server verifies the session cookie, but rejects the request with 403 Forbidden because the CSRF token is missing or invalid.',
      isCorrect: true,
      explanation: 'Correct! The server requires both a valid session cookie and an unpredictable session-bound CSRF token. Since the attacker cannot read the token, the attack is blocked.',
    },
    {
      id: 'token_accepted',
      label: 'The server accepts the request because the session cookie arrived.',
      isCorrect: false,
      explanation: 'Incorrect. The endpoint enforces token validation before modifying any state.',
    },
    {
      id: 'browser_blocks',
      label: 'The browser blocks the submission before it reaches the server.',
      isCorrect: false,
      explanation: 'Incorrect. The browser sends the request; the server receives it, checks the token, and rejects it with 403 Forbidden.',
    },
  ],
  learnMarkdown: `### Key Security Takeaways
- **Cryptographic Unpredictability**: CSRF tokens must be generated using cryptographically secure pseudorandom number generators (e.g. Node \`crypto.randomBytes\`).
- **Session-Bound**: The token must be tied to the specific user's session. If user A submits user B's token, the server must reject it.
- **Double Submit Cookie vs Synchronizer**: In stateless architectures, "Double Submit Cookie" or encrypted tokens are used, though synchronizer tokens remain the gold standard when server-side state is available.

### References
- [OWASP CSRF Prevention: Synchronizer Token Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern)`,
  codeSnippets: [],
};
