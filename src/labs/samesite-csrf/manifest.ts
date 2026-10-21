import type { LabManifest } from '../../shared/contracts/lab.js';

export const samesiteCsrfManifest: LabManifest = {
  id: 'samesite-csrf',
  title: 'SameSite & Cross-Site Request Forgery (CSRF)',
  description:
    'Investigate the mechanics of Cross-Site Request Forgery, evaluate SameSite=Strict, Lax, and None cookie policies across navigation contexts, and verify synchronizer tokens and Origin-based defenses.',
  objectives: [
    'Observe cookie transmission under SameSite=Strict, Lax, and None across top-level GET, POST, fetch, and embedded contexts.',
    'Execute actual cross-site form POST attacks against vulnerable endpoints and observe state mutation in separate tabs.',
    'Demonstrate why SameSite=Lax does NOT protect unsafe state-modifying GET endpoints.',
    'Implement and test unpredictable session-bound CSRF synchronizer tokens.',
    'Validate an exact Origin allowlist, failing closed for missing and null origins.',
    'Differentiate same-site cross-origin requests (sibling origin) from cross-site requests (attacker origin).',
  ],
  experiments: [
    {
      id: 'exp1-samesite-modes',
      title: '1. SameSite Modes (Strict, Lax, None)',
      summary: 'Configure session cookies with Strict, Lax, or None (Secure) and examine browser transmission rules.',
    },
    {
      id: 'exp2-csrf-top-level-post',
      title: '2. Cross-Site Top-Level POST Submission',
      summary: 'Launch cross-site form submissions from attacker.csrf-lab.test against vulnerable vs protected endpoints.',
    },
    {
      id: 'exp3-csrf-top-level-get',
      title: '3. Unsafe GET Mutation Flaw',
      summary: 'Demonstrate why SameSite=Lax sends cookies on top-level GET navigation and fails to protect unsafe GET endpoints.',
    },
    {
      id: 'exp4-csrf-tokens',
      title: '4. Synchronizer CSRF Token Protection',
      summary: 'Verify how session-bound, unpredictable CSRF tokens block cross-site forged submissions.',
    },
    {
      id: 'exp5-origin-validation',
      title: '5. Exact Origin Allowlisting',
      summary: 'Test how strict server-side Origin header validation stops cross-site attacks without tokens.',
    },
    {
      id: 'exp6-sibling-vs-attacker',
      title: '6. Sibling-Site vs Attacker-Site (Site vs Origin)',
      summary: 'Explore the crucial distinction between Same-Site (eTLD+1) and Same-Origin (scheme, host, port).',
    },
  ],
  references: [
    {
      title: 'OWASP Cross-Site Request Forgery (CSRF) Prevention Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html',
      description: 'Comprehensive guidelines for anti-CSRF tokens, SameSite cookies, and Origin verification.',
    },
    {
      title: 'MDN: SameSite Attribute',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesite',
      description: 'Detailed MDN reference on Lax, Strict, and None behaviors in modern browsers.',
    },
    {
      title: 'W3C: Fetch Metadata Request Headers',
      url: 'https://www.w3.org/TR/fetch-metadata/',
      description: 'Sec-Fetch-Site, Sec-Fetch-Mode, and Sec-Fetch-Dest specifications for origin verification.',
    },
  ],
};
