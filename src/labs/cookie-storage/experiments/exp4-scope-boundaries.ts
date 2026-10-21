import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp4ScopeBoundaries: ExperimentDefinition = {
  id: 'exp4-scope-boundaries',
  title: 'Scope Boundaries: Domains, Paths & Origins',
  summary: 'Test host-only vs parent-domain cookies, cookie path matching, and origin isolation in localStorage.',
  startingConditions: [
    'A host-only cookie (cookie_host_only) is set for app.security-lab.test (no Domain attribute).',
    'A domain cookie (cookie_parent_domain) is set for Domain=.security-lab.test.',
    'A path-scoped cookie is set for Path=/api/labs/cookie-storage/subpath.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'Will sibling.security-lab.test be able to access the cookies and localStorage from app.security-lab.test?',
  predictionOptions: [
    {
      id: 'sibling_sees_domain_only',
      label: 'sibling.security-lab.test receives cookie_parent_domain, but NOT cookie_host_only, and has completely isolated localStorage.',
      isCorrect: true,
      explanation: 'Correct! Domain cookies are shared across all subdomains/siblings, while host-only cookies and localStorage are strictly isolated.',
    },
    {
      id: 'sibling_sees_everything',
      label: 'sibling.security-lab.test can access all cookies and localStorage because they share the domain security-lab.test.',
      isCorrect: false,
      explanation: 'Incorrect. Host-only cookies and localStorage do not cross origin or host boundaries.',
    },
    {
      id: 'path_is_security_boundary',
      label: 'Paths provide cryptographic security boundaries preventing any scripts at "/" from accessing "/subpath" cookies.',
      isCorrect: false,
      explanation: 'Incorrect! RFC 6265 explicitly warns that cookie paths do NOT provide security isolation. Any script on the origin can read or overwrite non-HttpOnly subpath cookies.',
    },
  ],
  learnMarkdown: `### Key Security Takeaways
1. **Omit the Domain attribute whenever possible**:
   - Setting \`Domain=.example.com\` broadens the attack surface to every subdomain on your domain.
   - If any subdomain has an XSS flaw, an attacker on that subdomain can steal or overwrite domain cookies!
   - Host-only cookies (omitting \`Domain\`) provide superior isolation.
2. **Cookie Paths are NOT Security Boundaries**:
   - RFC 6265 warns: *"The Path attribute does not protect cookies from modification or observation by other paths on the same origin."*
   - Any script on \`/\` can read non-HttpOnly cookies for \`/subpath\` or fetch subpath endpoints to receive cookies.
3. **localStorage is Origin-Isolated**:
   - \`localStorage\` adheres strictly to the Same-Origin Policy. \`https://app.security-lab.test:8443\` and \`https://sibling.security-lab.test:8443\` have entirely separated storage pools.

### References
- [MDN: Scope of Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies#scope_of_cookies)
- [RFC 6265bis Section 8.5: Weak Confidentiality for Path Matching](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis#section-8.5)`,
  codeSnippets: [],
};
