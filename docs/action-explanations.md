# Explanations of lab actions

The experiment controls explain their actual browser and server behavior before use.
These additions complement the separate manual DevTools investigation guides.
They do not change credential handling, request execution, authorization or local-host safeguards.

## Coverage

| Lab | Explained actions and evidence |
| --- | --- |
| Cookie storage | Fictional credential issuance, independent opaque credentials, localStorage write, readable/HttpOnly cookies, profile checks, logout, direct storage reads, three-request authentication comparison, fixed script harness, HTTPS/HTTP probes, domain/path scope and browser/server expiration. |
| SameSite and CSRF | Session configuration and revocation, diagnostic preference reads, preference-only reset, attacker/sibling navigation, forms, top-level GET, simple credentialed fetch, iframe probe and automated legitimate token/mutation sequence. |
| JWT | Demo password check, signed claims, in-memory token editor, local edits versus server verification, unsigned preparation, public-key download and HMAC signing, vulnerable/protected dashboard decisions, JWT cookies, fixed same-origin action, token-size request automation and revocation. |
| Broken access control | Independent world sessions, owned-resource list loading, browser cookies, automatic CSRF-token lookup, ID-based reads/deletion, ownership rejection, folder cascade and fresh server identity. |
| Privilege escalation | World/account selection versus login, mass assignment, protected field allowlist, persistent server role versus cached UI identity, admin authorization, account/session deletion and confirmed bulk-delete sequence. |

Shared guidance explains server reset versus browser learning-progress reset, inspector refresh/clear,
control headers, experiment identifiers, filtered helper requests, redaction and missing instrumentation.
The server inspector is supplementary evidence; browser Network and Application remain the sources for
the original requests, responses and stored credentials.

## Implementation and verification

The shared `ActionExplanation` component uses existing typography, color and spacing tokens.
It adds no animation, dependencies, requests or learner-state changes. Existing controls and event
handlers remain in place. The reset explanation is a keyboard-operable native disclosure.

Verified on November 1, 2026:

- TypeScript, ESLint, production build and 21st UI review passed.
- All 20 server tests passed. The concurrent DevTools-guide chat completed all 49 Chromium tests in this shared checkout successfully.
- Read-only browser verification covered every experiment at 375, 768, 1280 and 1920px, in light and dark themes with reduced motion. Including both source consoles, 176 checks passed without horizontal page overflow or page errors. The final JWT-size wording was checked again at all four widths in both themes.
- Keyboard expansion/collapse of the reset disclosure passed; explanation text measured at least 16px.
- Lighthouse mobile accessibility scored 95 on the start page and 96 on the storage-authentication experiment; best practices scored 100. Existing active blue navigation buttons still fail the individual contrast audit.
- A local Chrome trace of the experiment page, with no CPU or network throttling, measured LCP 619ms and CLS 0.00. This is not a throttled Lighthouse Performance score or an INP measurement.

The existing main-bundle size warning remains. A Lighthouse Performance score of 90 and the INP
budget have not been established by these checks. Button-placement redesign remains deferred.
