# Verification record

Results below apply to the code and dependency set described in each dated entry. The current JWT extension deliberately includes vulnerable historical libraries; the earlier clean dependency audits describe only the cookie/CSRF baseline.

Recorded on **13 October 2026**, using Windows x64, Node **24.11.1**, Playwright **1.64.0** and its pinned Chromium **156.0.8078.4**.

| Check | Result |
| --- | --- |
| Guided local setup | Passed after explicit Windows UAC approval for CA trust and three hosts mappings |
| Trusted HTTPS doctor | All three hostnames resolved to loopback and loaded in Chromium without TLS bypass |
| ESLint and TypeScript | Passed |
| Vite frontend build | Passed |
| Focused server tests | 11 passed |
| Real-browser tests | 29 passed, zero retries, zero skipped |
| Full command | `npm run check` passed |
| Built-runtime browser smoke | Passed: credential issuance, script action, vulnerable CSRF form and legitimate combined protection |
| Desktop/mobile learner journeys | Reviewed through the five stages; no unexpected JavaScript page errors or mobile horizontal overflow |
| Documentation screenshots | Captured from actual trusted browser sessions |
| Dependency audit | Zero reported advisories at the recorded time |
| GitHub Actions definition | YAML parsed successfully; Windows/macOS/Linux matrix configured |

The browser suite asserts actual server-observed cookies, authentication, original origins and Fetch Metadata, status codes and state transitions. It uses positive vulnerable/legitimate controls. Combined protection is also tested with each check isolated, so one defense cannot mask the absence of the other.

Privacy-dependent None-cookie embedded/fetch cases attach actual observations. They do not disable privacy controls or silently skip cases. Core vulnerable/protected CSRF checks use top-level navigation.

The built-runtime smoke exercised the same Express runtime with `LAB_BUILT=true`, serving the generated frontend rather than Vite middleware. It reported zero unexpected page errors.

## Limits

Only Windows was executed in this workspace. The macOS/Linux GitHub Actions jobs must be run and their results reviewed after publishing the repository. No hosted application or public experiment endpoints were created.

The setup adds a development CA and local hosts entries only through explicit system steps. Leaf keys and certificates, local tooling, traces and reports remain ignored by Git. State and identities are fictional; this application must stay local.

## Cookie baseline recheck — 21 October 2026

`npm run check` passed again on Windows with the same Node and Chromium versions: lint, TypeScript, production build, 11 server tests and 29 browser tests. No tests were skipped or retried. The lockfile for this baseline has no JWT dependencies; unfinished historical-library experiments are kept separately until their module is ready. The offline dependency audit reported zero known advisories. The public repository is `adarshbam/security-lab`; publishing source does not expose the loopback application.

## JWT extension — 1 November 2026

Verified on Windows x64 with Node 24.11.1. The extension uses `jsonwebtoken` 9.0.3 and intentional historical aliases for 4.0.0 and 8.5.1.

| Check | Result |
| --- | --- |
| `npm run check` | Passed: ESLint, TypeScript and production Vite build |
| Server tests | 16 passed, including historical verifier behavior, protected checks, revocation and isolation |
| Real-browser tests | 39 passed, zero failures or skips; 10 exercise JWT learner and request flows |
| `LAB_BUILT=true; npm run screenshots` | Passed against the built Express runtime; no unexpected page errors |
| JWT layout | No horizontal overflow at 375, 768, 1280 or 1920px; dark and light screenshots captured |
| Accessibility smoke | Keyboard Tab focus visible; reduced-motion preference exercised |
| Built JavaScript | Main chunk 497.92 kB minified / 149.22 kB gzip; JWT workbench loads separately at 18.90 kB / 5.99 kB gzip |

The browser cases cover a valid user profile, an authenticated user denied admin access, a legitimate admin allowed access, manipulated tokens accepted only by their designated vulnerable verifiers, expiration and reset, cookie/bearer isolation, redaction and measured request bytes. The missing-key unsigned-token case also verifies that its broken historical configuration cannot validate the original signed token. Screenshots are real browser observations, including [dark](screenshots/jwt-workbench.png), [light](screenshots/jwt-light.png) and [mobile](screenshots/jwt-mobile.png) views.

The responsive and focus checks are targeted smoke checks. Lighthouse scores, Core Web Vitals, full WCAG contrast and keyboard audits were not measured, so the global design thresholds are not claimed. Existing shared lab views still use older Tailwind spacing and type classes outside the JWT workbench.

Known historical dependency advisories are expected. No new dependency audit was run for this entry. Any future audit must separate those intentional reproduction packages from unrelated findings and state whether it used live or cached advisory data. Do not rewrite the old aliases merely to make an audit report clean: doing so changes the experiment under test. See [historical-version notes](../src/labs/exployting-jwt-tokens/docs/historical-versions.md).
