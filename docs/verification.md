# Verification record

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
