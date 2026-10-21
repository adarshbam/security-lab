import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp5OriginValidation: ExperimentDefinition = {
  id: 'exp5-origin-validation',
  title: '5. Exact Origin Allowlisting',
  summary: 'Test how strict server-side Origin header validation stops cross-site attacks without tokens.',
  startingConditions: [
    'A session cookie exists on app.security-lab.test.',
    'Endpoint /api/labs/samesite-csrf/update-origin validates the Origin header against https://app.security-lab.test:8443.',
    'Attacker submits a form from attacker.csrf-lab.test.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'When attacker.csrf-lab.test submits a POST form to the origin-protected endpoint, what Origin header does the server see?',
  predictionOptions: [
    {
      id: 'attacker_origin_seen',
      label: 'The server sees Origin: https://attacker.csrf-lab.test:8443, detects the mismatch, and rejects the request with 403 Forbidden.',
      isCorrect: true,
      explanation: 'Correct! The browser accurately identifies the initiating origin in the Origin header. The server compares it against the allowlist and rejects the cross-site request.',
    },
    {
      id: 'origin_forged',
      label: 'The attacker script can forge the Origin header to match app.security-lab.test.',
      isCorrect: false,
      explanation: 'Incorrect. The Origin header is managed exclusively by the browser and cannot be spoofed by web scripts.',
    },
    {
      id: 'origin_empty',
      label: 'Browsers omit the Origin header on cross-site form submissions.',
      isCorrect: false,
      explanation: 'Incorrect. Browsers reliably send the Origin header on POST form submissions and cross-origin requests.',
    },
  ],
  learnMarkdown: `The origin-protected endpoint checks the browser's Origin header against the exact application origin, including scheme, hostname and port. This lab rejects missing and null origins, even when a Referer is available.

The sibling shares a site with the app but has a different origin. SameSite cookies may arrive on sibling requests while the origin check still rejects the mutation. Configure SameSite=None for the cross-site comparison so a 403 can be attributed to the origin defense rather than missing authentication.

The combined endpoint requires both the exact origin and a session-bound synchronizer token. Verify a legitimate request succeeds for every defense you test.`,
  codeSnippets: [],
};
