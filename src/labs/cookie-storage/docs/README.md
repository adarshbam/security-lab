# Lab 1 — HttpOnly Cookies vs localStorage

Use the application at `https://app.security-lab.test:8443`. All identities and credentials are fictional. Reset Experiment affects this lab; Restart Learning Progress affects the learning wizard.

## Working through the lab

For each experiment, read its starting conditions, record a prediction and perform the browser action before opening Compare or Learn. Login is preparation, not the experiment itself. Reissuing credentials resets Lab 1 and revokes its previous tokens.

| Experiment | Procedure | Evidence to collect |
| --- | --- | --- |
| Storage access | Issue credentials, then Inspect JavaScript Storage | localStorage value, document.cookie names, browser cookie attributes |
| Authentication and script actions | Compare Cookie and Bearer Authentication, then run the fixed harness | Three endpoint statuses; profile email before/after; request authentication and origin |
| Secure transport | Read HTTPS Probe, then open HTTP Probe in a new tab | Cookie names received on each transport, including the diagnostic control |
| Scope | Issue scoped cookies, compare both paths, open sibling page | Matching/outside path cookies, sibling cookie names and sibling localStorage |
| Lifetimes | Issue lifecycle cookies, probe immediately and after five seconds, then logout | Browser cookie metadata, server response, remaining cookie names, revoked bearer behavior |

The fixed script harness assumes same-origin JavaScript execution. It performs actual browser reads and obtains an actual CSRF token before attempting a harmless email update. It does not inject arbitrary HTML, transmit credentials elsewhere or implement a full XSS lab.

## Challenges

- Can the cookie-only endpoint be authenticated by supplying only the localStorage bearer?
- Can you distinguish the HttpOnly credential from the readable-cookie credential?
- Why must the Secure experiment use navigation rather than an HTTP fetch from the HTTPS page?
- Does changing a cookie Path create a JavaScript security boundary?
- What happens when a server session expires while its cookie remains present?
- Does resetting this lab invalidate Lab 2's cookie?
- Optional code edit: shorten the server TTL while keeping the browser cookie unchanged, then repeat the measurement.

<details>
<summary>Explanation — open after attempting the experiments</summary>

HttpOnly withholds the cookie value from document.cookie. It does not prevent same-origin script requests from using the browser's authentication. A same-origin script can also obtain CSRF tokens that the application makes available to its own JavaScript.

localStorage is origin-scoped and has no native expiration or automatic HTTP transmission. A bearer is supplied explicitly in Authorization. The protected cookie-only endpoint never falls back to the readable cookie or bearer.

Secure cookies are omitted from HTTP. A harmless non-Secure marker proves that the HTTP request could transmit cookies. Host-only cookies stay on the app hostname; a parent-domain cookie also reaches its sibling. Path determines cookie transmission, not a reliable JavaScript isolation boundary.

The persistent marker expires after five seconds. The server-only short session expires after three seconds despite its browser session cookie remaining present. Browser session restoration can preserve session cookies. Logout therefore revokes server credentials and removes the appropriate browser cookie tuples.

</details>

## Implementation and tests

`server/router.ts` owns credential issuance, separate authentication endpoints, profile mutation, probes and reset. `server/state.ts` owns random credentials, TTLs and revocation. `client/harness.ts` is the actual browser harness. Source snippets are imported from these implementations.

`tests/cookie-storage.spec.ts` exercises real browser behavior, including independent credentials, controls, expiration, reset and cross-lab isolation. No cookie jars or network responses are mocked.

## Primary references

- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
