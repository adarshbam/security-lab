import type { LabManifest } from '../../shared/contracts/lab.js';
export const xssManifest: LabManifest = {
  id: 'xss-csp', title: 'XSS Attacks & CSP',
  description: 'Trace untrusted input into a browser sink, compare safe rendering, and observe what CSP actually blocks in isolated local documents.',
  objectives: ['Trace reflected, stored and DOM-based XSS.', 'Choose encoding, text APIs or narrowly sanitized HTML.', 'Compare report-only and enforced nonce policies without treating CSP as a rendering fix.'],
  experiments: [
    { id: 'xss-reflected', title: 'Reflected search input', summary: 'Does query input become HTML or remain text?' },
    { id: 'xss-stored', title: 'Stored release notes', summary: 'Does persistence make an HTML value trustworthy?' },
    { id: 'xss-dom', title: 'DOM fragment preview', summary: 'Can a fragment that never reaches the server execute?' },
    { id: 'xss-csp', title: 'Nonce policy comparison', summary: 'Does a report-only policy prevent an inline handler?' },
  ],
  references: [
    { title: 'MDN: Content Security Policy', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP' },
    { title: 'OWASP: XSS prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html' },
    { title: 'MDN: HttpOnly cookies', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly' },
  ],
};
