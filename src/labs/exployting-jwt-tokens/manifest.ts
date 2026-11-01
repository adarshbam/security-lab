import type { LabManifest } from '../../shared/contracts/lab.js';

export const jwtManifest: LabManifest = {
  id: 'exployting-jwt-tokens', title: 'JWT Tokens: Decode, Verify & Exploit',
  description: 'Log in with fictional accounts, edit real tokens, test historical library flaws and compare verified authentication. Everything stays on your local HTTPS application.',
  objectives: [
    'Distinguish reading claims from authenticating their signature.',
    'Reproduce RSA/HMAC confusion with jsonwebtoken 4.0.0 and an unsigned-token bypass with 8.5.1.',
    'Compare fixed-algorithm, issuer, audience and expiration checks using 9.0.3.',
    'Separate JWT format from cookie storage and measure the cost of extra claims.',
  ],
  experiments: [
    { id: 'jwt-decode', title: '1. Decode is not verification', summary: 'Edit a user claim and compare two real dashboard endpoints.' },
    { id: 'jwt-confusion', title: '2. Historical RSA → HMAC confusion', summary: 'Use the lab public key and an actual 2015 library version.' },
    { id: 'jwt-none', title: '3. Unsigned tokens & missing keys', summary: 'Investigate the exact unsafe defaults behind CVE-2022-23540.' },
    { id: 'jwt-storage', title: '4. JWT cookies & script access', summary: 'Compare independent readable and HttpOnly JWT cookies.' },
    { id: 'jwt-size', title: '5. Small claims vs a heavy token', summary: 'Measure actual request bytes without inventing database performance results.' },
  ],
  references: [
    { title: 'OWASP: JSON Web Token Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html' },
    { title: 'RFC 8725: JWT Best Current Practices', url: 'https://www.rfc-editor.org/rfc/rfc8725.html' },
    { title: 'CVE-2015-9235: Historical verification bypass', url: 'https://github.com/advisories/GHSA-c7hr-j4mj-j2w6' },
    { title: 'CVE-2022-23540: Unsigned tokens and unsafe defaults', url: 'https://github.com/auth0/node-jsonwebtoken/security/advisories/GHSA-qwph-4952-7xr6' },
    { title: 'MDN: Using HTTP Cookies', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies' },
    { title: 'Original project by Adarsh Singh', url: 'https://github.com/adarshbam/exployting-jwt-tokens' },
  ],
};
