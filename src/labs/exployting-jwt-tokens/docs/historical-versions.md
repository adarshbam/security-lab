# Historical JWT dependencies

The old packages are intentional local teaching dependencies. They share the Express process with the rest of the lab; a module boundary is not process isolation. Keep this application on its existing loopback listeners and use only the supplied fictional data.

| Import | Exact package | Lab purpose | Configuration |
| --- | --- | --- | --- |
| `jsonwebtoken` | 9.0.3 | Signing and protected verification; also the decode-misuse demonstration | Protected routes set the expected algorithm, issuer and audience, then apply lab claim checks |
| `jsonwebtoken-2015` | npm alias for jsonwebtoken 4.0.0 | Historical RSA/HMAC confusion | RSA public PEM passed to `verify` without an algorithm restriction |
| `jsonwebtoken-2022` | npm alias for jsonwebtoken 8.5.1 | Historical unsigned-token acceptance | `verify` called with a null key and no algorithms option |

Only `server/verifiers.ts` imports the aliases. The protected implementation never routes through either old package. The root lockfile records their exact dependency trees, so a clean checkout can reproduce the same package selection with `npm ci`.

## Historical cases and limits

The 2015 case concerns a verifier choosing HMAC for a token presented to an RSA-key application. The lab uses the exact public PEM bytes as HMAC input and calls the actual 4.0.0 verifier. The advisory lists versions below 4.2.2 as affected and 4.2.2 as patched; this reproduction makes claims about the pinned version and key format, not every old configuration. See [CVE-2015-9235](https://github.com/advisories/GHSA-c7hr-j4mj-j2w6) and the [original researcher explanation published by Auth0](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/).

The 2022 case requires an unsigned token, a falsy verification key and no specified algorithms. Version 8.5.1 accepts that combination; the corresponding missing-key endpoint cannot validate ordinary signed tokens. Version 9 removed the implicit unsigned default. This does not establish a bypass for every correctly configured 8.5.1 application. See the [maintainer advisory for CVE-2022-23540](https://github.com/auth0/node-jsonwebtoken/security/advisories/GHSA-qwph-4952-7xr6).

Decode-only authorization is a separate application error, demonstrated with 9.0.3. Replacing the package cannot turn `decode` into signature verification. The [maintainer API documentation](https://github.com/auth0/node-jsonwebtoken#jwtdecodetoken--options) distinguishes those operations.

## Audit and maintenance

Known advisories and npm warnings for the historical aliases and their dependency trees are expected. They are not evidence that a fresh installation has failed. No current clean-audit claim is made for this repository. A successful functional test run also does not make the historical packages safe for production.

Review new audit findings to identify unrelated dependencies that need updates. Preserve the explicit aliases and their tests when upgrading protected application dependencies. Do not use a blanket audit fix that silently replaces a historical verifier, and do not dismiss all findings merely because some packages are intentionally old.

Verification records should state the Node/platform versions, exact package versions, executed test counts and any audit data limitations. Existing cookie-only audit results remain historical records, not a substitute for checking this dependency set.
