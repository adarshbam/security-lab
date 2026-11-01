# Lab 3 — JWT Tokens: Decode, Verify & Exploit

Run the shared [trusted HTTPS setup](../../../../docs/setup.md), then `npm run dev`. Open `https://app.security-lab.test:8443` and select the JWT lab. Existing installations need `npm install` after updating the repository. No extra server, database, host mapping or account is required.

This local module uses fictional accounts and real signed tokens. The account picker supplies published demo passwords: `adarsh / pass123` is a user and `rahul / admin@123` is an admin. Those credentials are teaching fixtures, not password-storage guidance. Token lifetime is adjustable from 1 to 300 seconds.

Read the starting conditions, record a prediction and perform the experiment before opening Compare or Learn. Signing in, editing JSON and preparing a token do not count as an attempt. The inspector shows actual server observations; the workbench shows actual HTTP responses. Working bearer tokens are not persisted to localStorage.

The working token and response history remain available when moving between Experiment, Compare and Learn. Expand Response JSON to inspect a response in full. Reloading the page or switching experiments clears the in-memory workbench; learning progress is preserved separately.

## Experiments

| Experiment | Procedure | Evidence to collect |
| --- | --- | --- |
| Decode is not verification | Sign in as adarsh, change the payload role to admin, apply the payload while keeping the signature, then send it to both dashboards | Status, authentication decision, returned directory and `adminReads` before/after |
| Historical RSA/HMAC confusion | First send the original RS256 token to My profile. Edit the role, use the displayed public PEM to prepare HS256, then request the admin directory from both implementations | Installed verifier version, token algorithm, statuses, directory access and a wrong-PEM negative control |
| Unsigned token and missing key | Sign in, edit the role, prepare an unsigned token and send it to both implementations. Restore the signed token and compare again | The exact missing-key configuration, unsigned acceptance, signed-token failure on the broken route and success on the protected profile route |
| JWT cookies and script access | Issue cookies, inspect cookie visibility/authentication, then run the fixed same-origin JWT action | Readable cookie name, successful cookie-only profiles and the preference changing from blue to purple |
| Small versus heavy tokens | Choose extra claim bytes and requests per token; run the comparison | Received Authorization value bytes, totals over actual requests, verification samples and unchanged profile-projection counters |

For each bearer scenario, use three controls: an original user token can read My profile; that user token cannot read the admin directory; a legitimate admin token can read the directory. The intentionally missing-key endpoint is the documented exception: its normal signed token fails, so use the protected route for the signed positive controls.

The historical versions and their exact configurations are explained in [historical-versions.md](historical-versions.md). Editing a token successfully in the browser does not demonstrate server acceptance.

## What the evidence means

The bearer workbench omits cookies, and cookie profiles never fall back to a bearer. Cookie JWTs use a different audience from bearer JWTs. This keeps one authentication mechanism from hiding failure in another.

The independent cookies use Secure, host-only, Path=/ and SameSite=Lax attributes; only one is HttpOnly. The fixed script assumes JavaScript already runs on the app origin. It cannot directly read the HttpOnly value, but it can obtain the app's CSRF value and make a harmless authenticated preference change. This is not a general script-injection runner.

Reset Experiment and Logout / Revoke JWTs replace this lab's signing keys, clear its CSRF state and remove its cookies. They invalidate every JWT in the module, including copied ones, and leave the other labs alone. Browser session cookies have no explicit expiry, but the JWT inside them expires after five minutes. Signing in again does not replace the lab keys. Restart Learning Progress only clears predictions and learning progress.

The size comparison reports the Authorization value, including `Bearer `, not total network traffic. Extra claim data adds bytes on every request that carries the token. The timing samples cannot establish whether JWTs are faster or slower than sessions in another application. There is no database here: known-subject validation uses local fixtures, and profile/directory counters track a separate projection of fictional account data.

## Challenges

- Does an unchanged signature remain valid after changing the role or expiry?
- Can a real user authenticate successfully and still receive a 403? Compare this with a 401.
- What changes when one byte of the public PEM changes? What happens after Reset Experiment generates a new key?
- Why does the missing-key route reject an ordinary signed token while accepting its unsigned counterpart?
- Can a bearer-only request authenticate a cookie-only profile, or cookies authenticate a bearer-only dashboard?
- Can the HttpOnly cookie authenticate a mutation that lacks its CSRF header? Check the state as well as the response.
- Does multiplying request count multiply the reported header-value bytes? What does that leave unmeasured?

## My beginner takeaway

I used to think JWTs meant the server never had to check the database again. What I learned is that the server can verify a signed token without looking up a session each time, but it may still need the database for other work. If I put a whole user profile in the token, that extra data travels with every authenticated request. It adds overhead and can run into header or cookie limits. That does not mean JWTs are always slow or unsafe, but I would keep the claims small. For a simple browser app, I would usually start with a server-side session and a Secure, HttpOnly cookie. A JWT can also be stored in an HttpOnly cookie; the token format and storage choice are separate decisions.

## Implementation and references

`server/verifiers.ts` selects the real verification implementation. `server/state.ts` handles signing, claim checks, reset and fictional projections. `server/router.ts` owns the endpoints and inspector evidence. `client/tokens.ts` performs the local browser token operations. The learner's source panels import marked regions from these files.

The [source mapping](source-mapping.md) explains the original demo features and the teaching changes. The [verification record](../../../../docs/verification.md) distinguishes executed checks from historical baseline results.

- [jsonwebtoken API documentation](https://github.com/auth0/node-jsonwebtoken#readme): `decode` reads a payload without verifying its signature.
- [RFC 8725, section 3](https://www.rfc-editor.org/rfc/rfc8725.html#section-3): algorithm, issuer, subject and audience validation guidance.
- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies): cookie attributes are a separate concern from token format.
