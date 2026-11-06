# Verification record

## Reading this record

[Overview](../README.md) · [Setup](setup.md) · [Architecture](architecture.md)

Commands and historical results are separate. `npm run check` is the full local entry point; `npm test` runs server/browser checks; `npm run test:e2e -- --headed` opens the browser journey. `npm run screenshots` captures real learner flows. Stop a running lab before test/screenshot commands.

The 6 November 2026 documentation review did not rerun product suites. The last inspected hosted run for the JWT source revision is [41288012004](https://github.com/adarshbam/security-lab/actions/runs/41288012004): Ubuntu and macOS completed checks successfully; Windows was cancelled during trust/hosts setup before its tests. This is not an all-platform green result or a statement about later runs.

## Dated local evidence

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

## Access control and privilege escalation extensions — 1 November 2026

`npm run check` passed on Windows x64 with Node 24.11.1: ESLint, TypeScript, production Vite build, **20 server tests** and **49 Chromium tests** with zero failures or skips. Ten browser cases cover the two new modules. The full browser suite also exercised the existing cookie, CSRF and JWT labs.

In Broken Access Control, real browser contexts proved Alex could read and delete Sam’s file and folder in the vulnerable world, while the protected world denied Alex and allowed Sam. Folder deletion cascaded to its file only after authorization. In Privilege Escalation, tests proved a persisted role change followed by fresh `/me` and admin reads; member denial before escalation; per-user deletion, session revocation and self-deletion protection; and a confirmed bulk-delete flow. Both modules enforce exact-Origin and session-bound CSRF checks. Tests also verified their resets do not revoke each other’s sessions or a JWT credential. The inspector records the current actor, decision, supplied profile JSON and world state without credential values.

Both new workbenches were checked at 375, 768, 1280 and 1920px with no horizontal page overflow. Keyboard Tab focus, light theme, reduced-motion preference and page-error checks passed. [Files desktop](screenshots/access-workbench.png), [files mobile](screenshots/access-mobile.png), [directory desktop](screenshots/privilege-workbench.png) and [directory mobile](screenshots/privilege-mobile.png) screenshots came from the built local HTTPS runtime.

Lighthouse scores and Core Web Vitals were not measured, so the global performance and accessibility score targets are not claimed. The production bundle still reports a main JavaScript chunk over Vite’s 500 kB warning threshold; both new workbenches are loaded separately.

## Shared teaching flow integration — 1 November 2026

The final `npm run check` passed on Windows x64 with Node 24.11.1: ESLint, TypeScript, production Vite build, 20 server tests and 49 Chromium tests. A browser test now follows the Broken Access Control workbench from prediction gating through a vulnerable request, actual source review, one-click return, protected replay, inspector evidence and Learn. The Compare view was checked at 375, 768, 1280 and 1920px with no horizontal page overflow, including light theme and reduced motion. Existing browser cases also passed for legitimate controls, protected failures and module reset isolation.

The existing cookie, CSRF and JWT modules now give mechanism-specific defender retry cues without changing their server behavior. The cookie UI reports direct storage access by boolean and cookie name without printing credential values. JWT historical libraries remain installed; protected replay uses the existing modern verifier. The 21st UI review reported zero findings on the three changed component files. Lighthouse, Core Web Vitals and a full accessibility audit remain unmeasured. The main bundle remains above Vite’s 500 kB warning threshold.

## Manual DevTools investigation — 1 November 2026

All 21 experiments now have specific browser tasks in the Experiment step. The tasks direct learners to inspect actual Application, Console and Network evidence, run a small local snippet or request where appropriate, and write an observation before Compare or Learn unlocks. Compare displays the learner’s note above the app evidence and reference. Existing workbenches, dummy credentials, server inspector and source review remain in place. The storage exercise distinguishes a cookie visible in DevTools Application from one readable through `document.cookie`; notes request names and decisions rather than credential values.

Verification: TypeScript, ESLint, Vite production build and 21st review completed. The final Chromium run passed all **49 tests** with tracing off against the active local HTTPS server. The shared access-control journey checked 375, 768, 1280 and 1920px, visible keyboard focus, light theme and reduced motion. The production build still warns about the main chunk size. Lighthouse, Core Web Vitals and full contrast scores were not measured.

## Progressive curriculum — 2 November 2026

The seven implemented labs now share a pedagogical order in `src/shared/curriculum.ts`, used by the browser and server registries. The UI provides lab numbers, difficulty, recommended prerequisite links, a request/identity primer, readiness prompts, an ordered overview and previous/next navigation. Existing IDs and browser-local learning records remain valid. Future authentication-abuse, CORS and clickjacking modules are documented proposals only.

Validation on Windows with Node 24.11.1: TypeScript, ESLint and the Vite production build passed; 21st review reported zero findings. All **20 server tests** passed. All **14 affected Chromium browser tests** passed against built assets with trusted HTTPS, one worker, zero retries and no browser-security bypasses. This is a scoped regression run, not a claim that the entire historical browser suite was rerun. The older access-flow assertions were updated to reflect the existing free-exploration behavior rather than locked explanations.

Four new curriculum cases cover the fresh-start default, the entire seven-lab sequence and server manifest order; saved progress, stable deep links, prerequisite navigation and browser history; all seven labs at 375, 768, 1280 and 1920px in light/dark and reduced motion, keyboard focus, minimum touch sizes for the new controls and no overflow or introduction console/page errors; and on-demand workbench mounting with identity retained across guided stages. The ten existing access/privilege cases additionally cover real ownership checks, role persistence, deletion, legitimate positive controls, CSRF guards and module-reset isolation.

A production check found the Markdown explanation renderer loaded unnecessarily on introduction pages. It now loads on Learn, with focus/hover preloading. The initial JS chunk decreased from about 636.6 kB to 513.6 kB before gzip. Vite’s 500 kB advisory remains; no new dependency was introduced.
Final production audit with Lighthouse **13.6.0** and trusted Chromium: desktop Performance **100**, Accessibility **100**, LCP **0.285 s**, CLS **0**, TBT **57 ms**; default simulated mobile Performance **87**, Accessibility **100**, LCP **1.057 s**, CLS **0**, TBT **502 ms**. **Mobile Performance remains below the requested 90 target.** Deferring the renderer reduced initial transfer/parse input but did not resolve the remaining main-thread cost. The earlier pre-split mobile runs varied from 87 to 90; the final 87 is the recorded result, not a best-of score. A wider shell-loading/performance pass remains necessary before claiming all global budgets are met. No field INP measurement is available; TBT is not INP.

Axe found zero violations in the changed header, curriculum and continuation navigation at all four widths in both themes, including expanded prerequisite/primer content. Introduction browsing produced no console or page errors. These automated checks do not replace a screen-reader user study. Lighthouse measured the fresh introduction, not every saved learning stage or workbench. [Compact audit evidence](curriculum-verification.json); full local Lighthouse reports are in ignored `.cache/curriculum/`. [Desktop](screenshots/learning-path-desktop.png) and [mobile](screenshots/learning-path-mobile.png) path screenshots were captured from the production build.

## Complete learner QA — 2 November 2026

A sequential UI walkthrough exercised all 28 experiments, 95 prediction choices, 67 concept-check choices, 82 manual-instruction steps, all five stages, notes, variations and saved-review reloads. The complete browser suite passed **64/64** against built assets and trusted HTTPS with zero retries; server/engine checks passed **24/24**. After a final recall/help edge-case refinement, **3/3 focused practice regressions** passed on the rebuilt app. The current suite contains 65 unique browser cases; no single final 65-case run is claimed.

Fixed recall scheduling, persistent reference-help attribution, explicit correct/incorrect concept feedback and an empty prediction label in free Compare. Repaired stale gating assertions and ambiguous status selectors in older tests. Build, TypeScript, ESLint and 21st review passed. [Scope, findings, per-lab scores and teaching recommendations](learner-quality-review.md) · [Experiment coverage ledger](learner-walkthrough-coverage.json). This was direct browser inspection plus browser-driven sequential automation, not an unaided human study; authored answer-key traversal does not independently validate those keys. Existing mobile performance limitations remain.

## Teaching clarity and timed manual review — 2 November 2026

Added 21 tailored examples and topic vocabulary for the older modules, 28 evidence traces, a cookie-scope reference table, CSRF diagnostics, essential/advanced JWT reading guidance, initially collapsed practice and the last ten concept attempts. The in-app thirty-minute review links one representative experiment per lab; its budget is 2 minutes setup + 26 minutes checks + 2 minutes wrap-up. It does not promise exhaustive coverage of all 28 experiments. [Manual checklist](manual-review-30-minutes.md). Existing design tokens and semantic disclosures were reused; no UI dependency or animation was added. The 21st catalog CLI search was unavailable, so existing project primitives were used; local 21st review reported no findings.

The complete browser run exercised 68 cases: 67 passed; one old curriculum test used a selector that became ambiguous when the second outline disclosure was added. That selector was corrected and the curriculum, practice and teaching suites are rerun below against rebuilt assets. All 24 server/engine tests passed. TypeScript, ESLint and production build passed. New tests cover all seven tour links and the thirty-minute total, collapsed practice, ten-attempt retention after reload, expanded tour and cookie table at 375/768/1280/1920 in both themes, reduced motion and keyboard focus. The scope guide was also inspected in the browser. No claim is made that the previous mobile Lighthouse gap has been resolved.

Final focused rerun: all **10 curriculum, practice and teaching browser tests passed** on the final production build after the selector fix and table-alignment adjustment. This verifies the case that failed in the 68-case run; no single second full 68-case run is claimed. All four widths, both themes, reduced motion and keyboard focus passed in the affected checks.
