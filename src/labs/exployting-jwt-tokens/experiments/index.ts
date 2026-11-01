import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';
import { jwtManifest } from '../manifest.js';
import { sourceRegion } from '../../../client/source.js';
import verifierSource from '../server/verifiers.ts?raw';
import stateSource from '../server/state.ts?raw';
import routerSource from '../server/router.ts?raw';
import tokenSource from '../client/tokens.ts?raw';
import clientSource from '../client/JwtLab.tsx?raw';

export const closingNote = `I used to think JWTs meant the server never had to check the database again. What I learned is that the server can verify a signed token without looking up a session each time, but it may still need the database for other work. If I put a whole user profile in the token, that extra data travels with every authenticated request. It adds overhead and can run into header or cookie limits. That does not mean JWTs are always slow or unsafe, but I would keep the claims small. For a simple browser app, I would usually start with a server-side session and a Secure, HttpOnly cookie. A JWT can also be stored in an HttpOnly cookie; the token format and storage choice are separate decisions.`;

type Lesson = Pick<ExperimentDefinition, 'startingConditions' | 'understandMarkdown' | 'predictionPrompt' | 'predictionOptions' | 'learnMarkdown' | 'codeSnippets'>;
function options(wrong: string, correct: string, explanation: string) {
  return [{ id: 'first', label: wrong, isCorrect: false, explanation }, { id: 'second', label: correct, isCorrect: true, explanation }];
}
const lessons: Record<string, Lesson> = {
  'jwt-decode': {
    startingConditions: ['Local HTTPS is running with fictional accounts.', 'adarsh has the user role; rahul is a legitimate admin.', 'No experiment request has been sent yet.'],
    understandMarkdown: `### A token is more than its readable JSON
Sign in as adarsh. Inspect the header and payload, change only the role to admin, and apply the payload while keeping the existing signature. Request the admin directory from both dashboards.

As controls, restore the signed token and request My profile. Then issue a token for rahul and request the admin directory. Record authentication and authorization separately.`,
    predictionPrompt: 'After editing the role without signing again, which dashboard will return the admin directory?',
    predictionOptions: options('Both dashboards will reject it because the library is current.', 'The decode-only dashboard may trust it; the verified dashboard should reject it.', 'Decoding never checks a signature, including in the latest library. Authorization must use verified claims.'),
    learnMarkdown: `### Reading claims is not authenticating claims
The vulnerable endpoint calls jsonwebtoken 9.0.3 decode. Changing the JSON can therefore change its trusted role. This is application misuse, not a historical package bug; upgrading alone cannot fix it.

The protected endpoint verifies a fixed HS256 algorithm, issuer, audience, expiry, known claim shape and this lab's reset generation. A genuine user token authenticates but receives 403 for the admin directory. A valid admin token succeeds. Rejected signatures receive 401 before any directory read.

Signed JWT payloads are readable, not encrypted. Never put passwords or private profile data in them. Both dashboard implementations return only safe fictional projections; an admin directory still must not return passwords.

### Challenge
Try a wrong password, malformed token, changed sub, wrong audience and an expired token. Does editing an expiry date also require a new signature? Check actual server observations.`,
    codeSnippets: [sourceRegion(verifierSource, 'decode-misuse', 'Actual vulnerable decode call'), sourceRegion(stateSource, 'verified-claims', 'Actual protected verification'), sourceRegion(routerSource, 'dashboard', 'Authentication, authorization and directory access')],
  },
  'jwt-confusion': {
    startingConditions: ['The server generates a fresh RSA key pair in memory.', 'Login issues RS256; only the public key can be downloaded.', 'The vulnerable route uses the actual jsonwebtoken 4.0.0 package.'],
    understandMarkdown: `### Which side chooses the algorithm?
First send an unmodified signed token to My profile on both implementations. Then edit the role, use the supplied public PEM as HMAC input, and send the prepared token to the admin directory on both implementations.

The browser performs HMAC using WebCrypto. You can download the public key or change its bytes. No private key is supplied to the browser. A public key is intended to be public.`,
    predictionPrompt: 'Will a token signed with the public PEM text be accepted as an admin by either implementation?',
    predictionOptions: options('Neither can accept it because an RSA public key can only verify RSA.', 'The historical unrestricted verifier may accept it as HMAC; the fixed RS256 verifier should reject it.', 'Version 4.0.0 trusts the token algorithm and treats public PEM text as an HMAC secret. The protected verifier fixes the algorithm and key type.'),
    learnMarkdown: `### A real historical library flaw
jsonwebtoken 4.0.0 accepts the crafted HS256 signature using the exact public PEM bytes, even though legitimate login issued RS256 tokens. The verifier is the installed historical library, not the original project's hand-written simulation.

The modern 9.0.3 verifier requires RS256 and an asymmetric public key. A forged token fails before directory access; a legitimate signed user profile and admin directory are positive controls. Changing a single PEM byte produces a different HMAC and must fail even in the old verifier.

The public advisory documents CVE-2015-9235 and a fix in 4.2.2. This lab pins 4.0.0 because we verified this exact key format and attack with it; it does not claim every affected release behaves identically for every configuration.

### Challenge
Repeat with an unchanged user role, a different HMAC key, and a reset-generated public key. Explain why downloading the public key is normal, but using it as a shared secret is unsafe.`,
    codeSnippets: [sourceRegion(verifierSource, 'historical-confusion', 'Actual jsonwebtoken 4.0.0 verification'), sourceRegion(tokenSource, 'browser-confusion', 'Actual browser WebCrypto operation'), sourceRegion(stateSource, 'verified-claims', 'Fixed-algorithm current verifier')],
  },
  'jwt-none': {
    startingConditions: ['Login produces a genuine HS256 token for controls.', 'The historical route models a missing verification key: null, without an algorithm allowlist.', 'The installed historical version is jsonwebtoken 8.5.1.'],
    understandMarkdown: `### Missing configuration meets an unsigned token
Sign in as adarsh and keep the original signed token. Edit the role, prepare an unsigned token, and send it to both dashboards. Compare those observations with the original signed token.

The historical endpoint intentionally has a missing key configuration. It cannot validate a normal signed token either. Use the protected My profile endpoint as the signed-login positive control and rahul as the legitimate admin control.`,
    predictionPrompt: 'With an unsigned token, a null verification key and no allowed algorithms, what will the historical route do?',
    predictionOptions: options('A verify call must always require a cryptographic signature.', 'Version 8.5.1 can accept it under these exact defaults; the protected route should reject it.', 'CVE-2022-23540 requires all three conditions: unsigned token, falsy verification key and no explicit algorithms. This is not a blanket bypass for correctly configured 8.5.1 applications.'),
    learnMarkdown: `### Verify still needs safe configuration
The old route calls jsonwebtoken 8.5.1 verify(token, null) with no algorithms option. Under these exact preconditions, it accepts alg none. Signed tokens fail on that broken endpoint because the verification key is missing.

Version 9 rejects that unsigned default call. Our protected route additionally supplies a real secret and explicitly requires HS256, issuer, audience and valid claims. Those configuration checks matter even when the library is current. This demo does not claim that all applications using 8.5.1 accept unsigned tokens.

### Challenge
Compare missing signature, altered signature, malformed JSON and an expired unsigned token. Use the response, inspector authentication result and directory-read counter together. A 401 alone does not demonstrate a complete usable authentication system; the legitimate controls must work.`,
    codeSnippets: [sourceRegion(verifierSource, 'historical-none', 'Exact historical unsafe configuration'), sourceRegion(tokenSource, 'browser-tamper', 'Actual unsigned-token construction'), sourceRegion(stateSource, 'verified-claims', 'Configured protected verification')],
  },
  'jwt-storage': {
    startingConditions: ['No JWT cookies have been issued for this attempt.', 'The cookies use different credentials and a cookie-specific audience.', 'The fixed script runs on the legitimate app origin; script execution is assumed.'],
    understandMarkdown: `### Keep format, storage and authentication separate
Issue JWT cookies, then inspect actual JavaScript access and cookie-only authentication. Run the fixed same-origin action and inspect the harmless preference change.

The bearer dashboards do not accept these cookies. Cookie profiles do not accept a bearer fallback. Neither the inspector nor the issuance JSON supplies HttpOnly credential values.`,
    predictionPrompt: 'What can an already-running same-origin script do with an HttpOnly JWT cookie?',
    predictionOptions: options('It can neither read the token nor make authenticated requests.', 'It cannot directly read the cookie but can make authenticated same-origin requests.', 'HttpOnly prevents direct cookie reads. It does not stop an already-running same-origin script from obtaining a CSRF token and acting through browser-managed credentials.'),
    learnMarkdown: `### A JWT can live in an HttpOnly cookie
The readable and HttpOnly cookies carry independent signed JWTs. Both authenticate browser requests, but document.cookie exposes only the readable one. Their Secure, host-only, Path=/ and SameSite=Lax attributes are real browser settings.

The fixed script gets a session-bound CSRF token and changes a fictional preference using the HttpOnly cookie. The same origin can read that token endpoint. This assumes script execution; it is not a general XSS injection lab. CSRF protection remains necessary for cookie authentication, but it does not solve XSS.

These session cookies have no browser expiry attribute, while the JWT has a five-minute server-checked exp. Browser session restoration can preserve session cookies. Reset or logout rotates the lab keys and invalidates all JWT credentials. The CSRF example deliberately keeps server state; JWT format does not imply a completely stateless application.

### Challenge
Send only a bearer token to the cookie profile, and only cookies to the bearer dashboard. Remove the CSRF header and confirm authentication succeeds but the mutation is rejected.`,
    codeSnippets: [sourceRegion(routerSource, 'cookie-jwt', 'Executable JWT cookies and protected mutation'), sourceRegion(clientSource, 'cookie-script', 'Fixed actual same-origin script')],
  },
  'jwt-size': {
    startingConditions: ['All data is fictional; no database server is involved.', 'The experiment signs both a small token and a token with extra profile-note bytes.', 'The same protected verifier handles both kinds of token.'],
    understandMarkdown: `### Measure the bytes, then discuss the tradeoff
Choose extra claim bytes and the number of requests. The browser sends each token explicitly to the server. Compare the received Authorization value sizes, repeated-request totals and individual verification timings.

The measurement excludes other headers, TLS and responses. Do not infer whole-application performance or database speed from a local timing sample.`,
    predictionPrompt: 'What is a defensible conclusion from adding a large user object to a JWT?',
    predictionOptions: options('Any large JWT automatically loses all benefits and proves JWT authentication is always slower.', 'Extra claims increase repeated request bytes; the overall performance tradeoff depends on the application.', 'Token size grows and travels with each request. Local measurements do not prove that every advantage disappears or that database work is eliminated.'),
    learnMarkdown: `### Authentication is not every database operation
Signature verification can avoid a session-record lookup for each request. An application may still query profiles, permissions or other business data. This lab checks subjects against an in-memory fictional account list. Its profileReads counter measures the separate profile/directory projection, not every account-list access or a real database query.

JWT JSON and base64url encoding add bytes. The experiment reports actual received Authorization values, with no fictional database latency or universal speed claim. Individual timing samples are noisy. Cookie and header size limits differ across browsers and servers; the lab bounds padding to 4096 bytes and sends these requests without cookies to keep measurements independent.

Keep claims small and non-sensitive. Signed role claims can become stale, expiration limits token lifetime, and immediate per-user revocation may require state or a new authorization lookup. This lab uses key rotation to invalidate all its tokens; that is not a production per-user logout design.

### My beginner takeaway
${closingNote}

### Challenge
Compare one and five repeated requests. Inspect the real code and explain why the extra bytes alone cannot determine whether JWTs or server sessions suit every application.`,
    codeSnippets: [sourceRegion(stateSource, 'signing', 'Actual claim generation and signing'), sourceRegion(routerSource, 'token-size', 'Actual received bytes and verification timing')],
  },
};

export const jwtExperiments: Record<string, ExperimentDefinition> = Object.fromEntries(
  jwtManifest.experiments.map(meta => [meta.id, { ...meta, ...lessons[meta.id] }]),
);
