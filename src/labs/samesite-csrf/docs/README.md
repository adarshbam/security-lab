# Lab 2 — SameSite & CSRF

The legitimate app is `https://app.security-lab.test:8443`. Its sibling is `https://sibling.security-lab.test:8443`; the cross-site attacker is `https://attacker.csrf-lab.test:8443`.

Select an experiment, record a prediction and configure a cookie. Open the appropriate source console from the learner page. Submit the source page's forms, links, fetch or embedded probe. Result tabs preserve your learner workspace; return to inspect original request headers and profile state.

## Experiments

1. **SameSite modes:** compare Strict, explicit Lax and None using read-only top-level GET and embedded probes.
2. **Cross-site POST:** submit the vulnerable form under each mode. Confirm whether authentication arrived, not just the result text.
3. **Unsafe GET:** under Lax, compare the deliberately unsafe GET mutation with the protected GET rejection.
4. **Synchronizer tokens:** configure None, prove the vulnerable form works, then submit the token endpoint without a token. Compare with the legitimate token action.
5. **Exact Origin:** repeat with the origin endpoint; inspect the browser's Origin header. Then test combined checks.
6. **Sibling versus attacker:** configure Strict, submit both source forms and compare same-site versus cross-site Fetch Metadata. Repeat against origin protection.

Cookie configuration invalidates prior sessions and restores initial preferences. **Reset Lab Preferences** preserves the current session for paired comparisons. **Reset Experiment** revokes the lab session and clears its cookie.

## Evidence worksheet

For every run, record: cookie mode; source origin; method and request context; received cookie names; authentication result; HTTP status; protection decision; profile state before/after.

For a rejected protected request, verify that authentication was true. Otherwise missing authentication could falsely appear to demonstrate a working token or origin check. Also run the legitimate positive control for the same endpoint defense.

For fetch, record the browser response-access error separately. The server may have processed the request. Embedded and fetch None-cookie behavior can vary with browser privacy settings; observe it rather than disabling those settings.

## Challenges

- Does the sibling share an origin with the app, or only a site?
- Can a Strict cookie arrive with a mismatched Origin?
- Is a GET mutation safe merely because the cookie uses Lax?
- Does missing CORS permission stop a simple cross-origin POST from reaching the server?
- What happens with an old, wrong or other-session CSRF token?
- Why does this lab reject missing and null origins even if Referer exists?
- Optional code edit: remove one combined defense at a time and use browser/server evidence to identify what changed.

<details>
<summary>Explanation — open after attempting the experiments</summary>

Strict withholds cookies on cross-site navigations. Explicit Lax permits top-level safe GET navigation while withholding cross-site POST and embedded cookies. None permits cross-site use and requires Secure, but does not override independent third-party-cookie restrictions.

SameSite concerns sites; origin checks include scheme, hostname and port. The sibling can send a Strict app cookie in a same-site POST while the exact-origin endpoint rejects its different origin.

The vulnerable endpoint accepts an authenticated mutation without CSRF validation. The token endpoint verifies a random session-bound synchronizer token. The origin endpoint requires the exact app Origin, failing closed on missing/null values. Combined requires both. Protected GET mutations return 405.

CORS controls script access to responses. Simple URL-encoded requests need no preflight; the vulnerable server may mutate state even while the source script receives a CORS error. A frontend error is not evidence of CSRF prevention.

</details>

## Implementation and tests

`server/router.ts` owns cookie configuration, read-only probes and all four mutation variants. `server/csrf.ts` owns exact-origin validation. `server/console.ts` supplies real attacker and sibling pages through module-owned auxiliary routers.

`tests/samesite-csrf.spec.ts` covers the navigation matrix, vulnerable/protected/legitimate controls, session-bound tokens, opaque-origin forms, CORS, privacy-dependent evidence and control-plane isolation.

## Primary references

- [MDN: Set-Cookie / SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesite)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [OWASP: CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
