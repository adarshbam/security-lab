import type { LabManifest } from '../../shared/contracts/lab.js';

export const cookieStorageManifest: LabManifest = {
  id: 'cookie-storage',
  title: 'HttpOnly Cookies vs localStorage',
  description:
    'Examine browser storage primitives, direct JavaScript access risks, ambient cookie authentication vs bearer tokens, transport security over HTTPS/HTTP, scoping boundaries, and session lifecycles.',
  objectives: [
    'Compare direct script access across localStorage, document.cookie, and HttpOnly cookies.',
    'Execute a same-origin script harness demonstrating that HttpOnly prevents token theft while ambient authority still enables authenticated actions.',
    'Verify that Secure cookies are strictly omitted over plain HTTP (port 8080) while positive-control non-Secure cookies arrive.',
    'Examine host-only vs parent-domain scoping, path matching, and origin-scoped localStorage.',
    'Contrast session cookies, persistent cookies (Max-Age), browser expiration, and server-side session invalidation.',
  ],
  experiments: [
    {
      id: 'exp1-storage-types',
      title: '1. Storage Primitives & JavaScript Accessibility',
      summary: 'Inspect how localStorage, document.cookie, and HttpOnly cookies behave when queried by client-side JavaScript.',
    },
    {
      id: 'exp2-auth-mechanisms',
      title: '2. Ambient Auth & Injected Script Harness',
      summary: 'Execute a fixed same-origin script to test direct token reads and authenticated actions.',
    },
    {
      id: 'exp3-secure-transport',
      title: '3. Secure Flag & HTTP/HTTPS Transport Security',
      summary: 'Observe browser transmission of Secure and non-Secure diagnostic cookies over HTTPS (8443) versus plain HTTP (8080).',
    },
    {
      id: 'exp4-scope-boundaries',
      title: '4. Scope Boundaries: Domains, Paths & Origins',
      summary: 'Test host-only vs parent-domain cookies, cookie path matching, and origin isolation in localStorage.',
    },
    {
      id: 'exp5-expiration-lifecycles',
      title: '5. Lifecycles: Session, Persistent & Server Invalidation',
      summary: 'Compare browser session cookies, Max-Age expiration, and server-side state invalidation.',
    },
  ],
  references: [
    {
      title: 'MDN: Using HTTP Cookies',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies',
      description: 'Comprehensive guide on cookie attributes, HttpOnly, Secure, SameSite, and scoping.',
    },
    {
      title: 'OWASP Session Management Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html',
      description: 'Standard security guidelines for secure cookie storage, TTLs, and session revocation.',
    },
    {
      title: 'RFC 6265bis: Cookies: HTTP State Management Mechanism',
      url: 'https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis',
      description: 'The updated Internet standard specification for browser cookie processing.',
    },
  ],
};
