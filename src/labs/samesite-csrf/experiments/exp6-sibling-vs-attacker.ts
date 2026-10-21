import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp6SiblingVsAttacker: ExperimentDefinition = {
  id: 'exp6-sibling-vs-attacker',
  title: '6. Sibling-Site vs Attacker-Site (Site vs Origin)',
  summary: 'Explore the crucial distinction between Same-Site (eTLD+1) and Same-Origin (scheme, host, port).',
  startingConditions: [
    'app.security-lab.test and sibling.security-lab.test share registrable domain security-lab.test (Same-Site).',
    'attacker.csrf-lab.test has a different registrable domain csrf-lab.test (Cross-Site).',
    'Evaluate how Sec-Fetch-Site and SameSite treat sibling vs attacker requests.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'When a request originates from sibling.security-lab.test, what does Sec-Fetch-Site report?',
  predictionOptions: [
    {
      id: 'same_site',
      label: 'Sec-Fetch-Site is "same-site", and SameSite=Lax cookies are sent!',
      isCorrect: true,
      explanation: 'Correct! The sibling shares the eTLD+1 (security-lab.test), so the browser treats it as same-site and attaches Lax cookies.',
    },
    {
      id: 'cross_site',
      label: 'Sec-Fetch-Site is "cross-site", and Lax cookies are withheld.',
      isCorrect: false,
      explanation: 'Incorrect. Sibling domains sharing the eTLD+1 are same-site, not cross-site.',
    },
    {
      id: 'same_origin',
      label: 'Sec-Fetch-Site is "same-origin".',
      isCorrect: false,
      explanation: 'Incorrect. Different hostnames mean different origins.',
    },
  ],
  learnMarkdown: `### Key Security Takeaways
- **SameSite is Not SameOrigin**:
  - \`SameSite=Lax\` does not protect you from requests originating from other subdomains on your domain!
  - If an attacker compromises \`blog.example.com\`, they can submit forms to \`app.example.com\` and \`SameSite=Lax\` will happily send the cookies!
- **Fetch Metadata (\`Sec-Fetch-Site\`)**:
  - Modern browsers send \`Sec-Fetch-Site: same-origin | same-site | cross-site | none\`.
  - You can use Fetch Metadata to enforce that sensitive actions must be strictly \`same-origin\`.

### References
- [web.dev: Understanding Same-Site and Same-Origin](https://web.dev/same-site-same-origin/)
- [W3C: Sec-Fetch-Site Header](https://w3c.github.io/webappsec-fetch-metadata/#sec-fetch-site-header)`,
  codeSnippets: [],
};
