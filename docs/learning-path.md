# A practical web security learning path

This mini project teaches developers to investigate web security with local requests and browser evidence. It is a focused introduction, not a complete security qualification or coverage of every vulnerability class. Seven labs work today. Numbering describes a suggested study order; it does not introduce locks, shared sessions, automatic completion or a mastery score.

## Before Lab 1

Use the in-app primer to recognize a URL, method, JSON body and response. Open Developer Tools → Network. Distinguish authentication (“Who is this?”) from authorization (“May this person do this?”). Make one request, inspect its response and check a fresh state read. Compare a vulnerable action, its protected equivalent and a legitimate positive control.

The lab explains its own new vocabulary. HTML/JavaScript familiarity helps later; prior exploitation experience is not required.

## The seven working labs

Difficulty refers to the complete lab, including its later experiments. This ordering is a curriculum judgment based on the code and conceptual prerequisites, not a measured or universal ranking of vulnerability classes. An introductory JWT decode exercise can be easier than a later cookie-scoping experiment; the historical algorithm-confusion exercises make the complete JWT module the final lab here.

| Lab | Topic | Difficulty | Recommended earlier labs | What this adds |
| --- | --- | --- | --- | --- |
| 1 | Broken Access Control | Introductory | None | Edit an object ID; distinguish identity from object ownership. |
| 2 | Privilege Escalation | Foundational | 1 | Move from another member’s resources to admin permissions through profile mass assignment. |
| 3 | HttpOnly Cookies vs localStorage | Foundational | 1 | Examine how identity reaches the server: storage, bearer headers, scope, transport and expiry. |
| 4 | SameSite & CSRF | Intermediate | 3 | Investigate cross-site requests carrying automatic credentials; verify CSRF defenses with state evidence. |
| 5 | Injection Attacks | Intermediate | 1 | Begin the input-handling branch: distinguish data, query operators and executable query structure. |
| 6 | XSS Attacks & CSP | Advanced | 3, 5 | Transfer the data/code boundary to HTML and DOM sinks; distinguish safe rendering from CSP enforcement. |
| 7 | JWT Tokens: Decode, Verify & Exploit | Advanced | 2, 3, 4 | Combine permission decisions, credential transport and signature verification in historical and protected implementations. |

The default path is 1 → 2 → 3 → 4 → 5 → 6 → 7. The dependency branches are narrower: 1 → 2; 1 → 3 → 4; 1 → 5; 3 + 5 → 6; 2 + 3 + 4 → 7. Lab 4 is not a prerequisite for injection, and XSS is useful context rather than a strict prerequisite for JWT.

Lab 2 covers application-level privilege escalation, not operating-system privilege escalation. Lab 5’s coercion example is a comparison flaw, distinct from SQL/NoSQL injection. These boundaries should remain explicit.

## Readiness checkpoints

Use these as explanation prompts, supported by your own recorded requests. Revisiting a checkpoint is useful; a correct concept answer or self-reported attempt does not certify mastery.

1. **Access control:** explain why ownership must be checked on every read and delete, including a folder operation that affects its contents. Verify the owner still has access.
2. **Privileges:** show how accepting a client-supplied role persists permission changes. Demonstrate that allowed-field validation retains legitimate display-name edits.
3. **Credentials:** predict what page JavaScript can read and what the browser attaches. Explain why HttpOnly limits credential reading without preventing an already-executing script from making authenticated requests.
4. **CSRF:** compare a real attacker-origin action and a legitimate control. Explain why a CORS response-access error alone does not prove a mutation was prevented.
5. **Injection:** explain parameter binding versus string validation, an operator object versus an operator string, and loose versus validated strict equality.
6. **XSS/CSP:** trace an input source to a sink. Distinguish encoded text, sanitized intentional markup, a report-only policy and enforced blocking; verify legitimate code still executes.
7. **JWT:** explain why decoding is not verification. Compare one crafted token across verifiers and separate successful authentication from permission to access admin data.

## Recommended additions

These are proposed modules, **not implemented labs**. Keep the current seven-lab numbering stable until an addition is complete and tested; insert it at its conceptual position on release and renumber display labels from the shared curriculum. Stable lab/experiment IDs and saved progress must remain unchanged.

### First priority: authentication and session abuse controls

**Placement:** after Cookies and Storage, before CSRF. The current expiry/invalidation experiments cover part of session management, but they do not teach login throttling, account enumeration or rotation across authentication.

Use fictional accounts to compare generic and account-revealing errors, session rotation after login and invalidation after logout, and a bounded login quota. Pair every denied action with a legitimate control. Show the identity and lifecycle effects with actual server state. Avoid presenting the existing simple fixture logins as production password-storage examples.

For rate limiting, a proposed exercise can allow three requests in a short window and issue `429 Too Many Requests` with `Retry-After` on the fourth. Use a few manual requests or a capped sequential action; show the counter, limit key, window and recovery. Verify that another fictional account is not unintentionally locked out. A resettable test clock can make the recovery check deterministic. These are exercise design values, not production configuration advice.

This demonstrates application throttling. Repeated refreshes do not model a **distributed** denial-of-service attack, and making the app hang is neither necessary nor a useful success condition. Network exhaustion and upstream DDoS mitigation belong to a separate infrastructure course. See [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP REST assessment](https://cheatsheetseries.owasp.org/cheatsheets/REST_Assessment_Cheat_Sheet.html) and [MDN’s 429 reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429).

### Second priority: CORS misconfiguration

**Placement:** immediately after SameSite & CSRF. CSRF already introduces the difference between sending a request and reading a response, but the platform has no focused vulnerable-versus-protected CORS exercise.

Use the existing local auxiliary origins to compare an explicit origin allowlist with unsafe origin reflection and credentialed response access. Demonstrate a permitted origin, a rejected origin and a simple request that can reach the server even when its response cannot be read. Treat preflight, cookie eligibility, authorization and response access as separate observations. A wildcard origin combined with credentials is rejected by browsers; do not label that combination a successful credentialed data leak. See [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) and [OWASP REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

### Third priority: clickjacking and framing defenses

**Placement:** after CORS and before Injection. It needs browser-origin and cookie knowledge but not the advanced script-policy material in XSS.

Use an inspectable local overlay over a fictional action in an iframe. Compare the frameable response with response-header `Content-Security-Policy: frame-ancestors` restrictions and `X-Frame-Options`. Include a legitimate direct-navigation control and an allowed framing control where appropriate. Show the actual browser frame refusal; isolate cookie failures so they cannot masquerade as a framing defense. Existing XSS isolation headers are not a dedicated clickjacking experiment. See [OWASP clickjacking defenses](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html).

If all three are implemented, the extended sequence would be: Access Control → Privilege Escalation → Cookies → Authentication/Session Abuse → CSRF → CORS → Clickjacking → Injection → XSS/CSP → JWT. This is a proposal; the app currently presents only the seven working labs.

### Keep beyond this mini project

SSRF, path traversal/file upload, password recovery/MFA, race conditions and supply-chain security are valuable future topics. They need distinct foundations, isolation and evidence. They are not prerequisites for the present seven labs and are not needed to make this focused introduction coherent. Do not add empty or simulated modules merely to claim complete OWASP coverage.

## Maintaining the path

`src/shared/curriculum.ts` is the source of display order, difficulty, prerequisites, reasons and checkpoints. Both registries use it. The app defaults to Lab 1 for new learners, restores valid saved selections, preserves deep links and leaves all labs accessible. Each module still owns its credentials, reset behavior and fictional runtime state.

The interface reuses the existing reading palette, focus styles and small radius, with a semantic numbered list inspired by 21st’s stepper patterns. It adds no UI dependency or motion. Workbenches start on exploration, and the Markdown explanation renderer loads when Learn is opened (or its control is focused/hovered). [Desktop path](screenshots/learning-path-desktop.png) · [Mobile path](screenshots/learning-path-mobile.png).

When adding a lab, use the architecture guide, add its curriculum metadata and check that prerequisites point to earlier working modules. Test fresh starts, deep links, saved learning state, previous/next navigation and the server manifest order. Never infer completion from opening the final lab.
