# Mapping the original JWT project

The module follows [adarshbam/exployting-jwt-tokens](https://github.com/adarshbam/exployting-jwt-tokens), reviewed at commit [3bad181](https://github.com/adarshbam/exployting-jwt-tokens/tree/3bad18190f07d8ce141ecb518fa2240a84f94815). Its executable React pages and backend routes were used to identify the features; some README frontend filenames differ from that tree.

| Original feature | Integrated lab equivalent |
| --- | --- |
| Fictional sign-in and user/admin dashboard | Account picker, editable password, My profile and Admin directory requests |
| Payload editing and token copy | Editable JSON, working token field, apply/restore and copy controls |
| `decode` versus `verify` | Separate instrumented endpoints using the same current library |
| Readable JWT cookie | Independent readable/HttpOnly cookie experiment with real browser observations |
| Public RSA key retrieval and browser HMAC construction | Downloadable ephemeral public key, editable PEM input and WebCrypto preparation |
| Algorithm-confusion simulation | Actual pinned jsonwebtoken 4.0.0 verification compared with configured 9.0.3 |
| Returned user table and console output | Tables populated from actual endpoint responses, status history and shared inspector |
| Logout and frontend persistence | Module-wide credential revocation; learning progress persists separately from working tokens |

## Teaching changes

The original [algorithm-confusion backend](https://github.com/adarshbam/exployting-jwt-tokens/blob/3bad18190f07d8ce141ecb518fa2240a84f94815/backend/server.js) manually switches between HMAC and RSA while depending on a modern package. Here, the historical package itself makes the vulnerable verification decision. The new unsigned-token scenario is a separate historical case with its exact missing-key preconditions.

The lab adds prediction gates, actual source regions, positive controls, expiry/reset checks, token-size measurement and separate authentication/authorization evidence. It generates signing keys in memory and uses the established local HTTPS setup. Cookie and bearer endpoints are separate, removing ambiguity about which credential authenticated a request.

All ten familiar demo names remain, with two admin accounts. Passwords are published fixtures used only to prepare experiments; directory responses contain usernames, roles and fictional `example.test` email addresses. The old phone, salary and password columns are intentionally omitted: leaking a full user object is a separate mistake, and successful admin authorization should not teach that returning passwords is acceptable. This change preserves the unauthorized-directory-access demonstration.

The explanation also separates current-library misuse from historical package flaws, and explains that HttpOnly restricts direct cookie reads without preventing already-running same-origin JavaScript from making requests. The closing note distinguishes signature verification from later application-data lookups and avoids claiming that larger JWTs automatically remove every performance benefit.
