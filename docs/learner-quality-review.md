# Learner QA and educational review — 2 November 2026

## Scope and method

A supervised sequential Chromium UI walkthrough covered all seven labs and all 28 experiments in curriculum order. It selected every authored prediction (including uncertainty), visited all five stages, stepped forward/back through every manual instruction, entered observations, compared notes, loaded Learn, selected every concept-check answer, recorded a variation attempt, saved a review and reloaded to check persistence.

Coverage: **95 prediction choices, 67 concept-check choices, 82 instruction steps and 140 stage visits**, plus 28 saved-review reload checks. The durable [coverage ledger](learner-walkthrough-coverage.json) identifies each experiment. These interactions used the UI; they did not seed experiment-success evidence or mock security responses. The walkthrough’s generic QA notes and variation clicks are interface checks, not proof that a human completed the variation. Authored answer keys supplied the correct/incorrect labels; selecting them verifies feedback wiring, not an independent educational study of those keys.

Security mechanisms were checked separately through the complete browser suite and server/engine checks: real credentials, local attacker origins, vulnerable/protected comparisons, legitimate controls, state changes, resets and invalid inputs. One initial access-control concept check was also inspected directly through Chrome DevTools; the all-experiment traversal was browser-driven automation, not 28 unaided human sessions. No claim of perfection or exhaustive testing of every possible payload is made.

## Defects fixed

1. **Recall remained due after a fresh review.** Scheduling used the original concept-check timestamp even when newer reviews existed. It now schedules from the most recent saved review or concept check, with the existing one-day/one-week guidance.
2. **Help history vanished on reload.** Opening a reference explanation was only remembered in component memory, allowing a subsequent check to be labelled “before viewing help.” Reference access now persists in learner progress and contributes to concept-check help attribution.
3. **Incorrect answers lacked a clear verdict.** Feedback showed an explanation but did not explicitly distinguish correct and incorrect checks. It now says “Correct reasoning” or “Revisit your reasoning,” alongside the explanation; no mastery claim is added.
4. **Free comparison displayed a blank prediction.** It now explicitly says “No prediction recorded.”

Three new browser regressions cover help persistence, wrong/right feedback, saved-review help attribution, scheduling after a recent review and scheduling after a new concept check. Older cookie/JWT tests were repaired to match existing free exploration and redacted evidence, scope status messages correctly, and explicitly open the cookie lab in a second browser context now that access control is the default. These were test defects, not proof that the experiment defenses were broken.

## Educational assessment

Scores are subjective reviewer judgments of this developer-focused mini project, not measured learning outcomes. Overall: **8/10**. The strongest quality is pairing observable behavior with legitimate controls and executable implementations. The main weakness is the amount of scaffolding and terminology a beginner must navigate before getting a concise explanation.

| Lab | Score | Strong point | Most useful improvement |
| --- | --- | --- | --- |
| Broken Access Control | 8.5/10 | Concrete identity/ownership contrast and readable outcomes | Ask the learner to explain why hiding an ID or a button does not enforce ownership, using their actual request. |
| Privilege Escalation | 8/10 | Persisted role change followed by fresh permission checks | Make the timeline of profile input → stored role → new authority more explicit. |
| Cookies and Storage | 8/10 | Independent credentials, transport controls and scope evidence | Introduce cookie scope with one small diagram/table before domains, paths, origins and lifetimes are combined. |
| SameSite and CSRF | 8/10 | Real cross-site requests and server-side state evidence | Add an experiment-specific diagnostic checklist for browser privacy effects, expired sessions and incorrect source tabs. |
| Injection | 8.5/10 | Real evaluators, typed JSON distinctions and honest scope limits | Show a short before/after query-construction explanation immediately beside the observed identity. |
| XSS and CSP | 8.5/10 | Source/sink contrasts, real policies and legitimate-script controls | Add a compact source → transform → sink → browser decision recap for each run. |
| JWT | 7.5/10 | Actual historical verifiers, malformed inputs and permission separation | Split the reading into essential decode/verify concepts and optional historical cryptography details; reduce simultaneous controls. |

## Priorities for the next teaching iteration

1. Replace generic repeated worked examples and authentication/authorization terms in the five older modules with experiment-specific examples and vocabulary. Injection and XSS already provide stronger tailored scaffolding.
2. Give learners a short evidence checklist alongside each result: what identity was used, what boundary was checked, what changed, and whether the legitimate control still works. A completed click is not completed reasoning.
3. Reduce visible repetition: the prediction and later check can repeat the same question while both remain on screen. Keep free exploration, but make the intended primary next action clearer.
4. Preserve a small history of concept attempts instead of overwriting the last checked answer, so learners can see how their reasoning changed. Keep it descriptive rather than a mastery percentage.
5. Add the previously proposed authentication-abuse, CORS and clickjacking modules only after the present explanations are tightened. More topics alone will not solve cognitive overload.

## Limits

Chromium on the trusted local Windows setup was exercised. This does not verify Firefox/Safari, screen-reader usability, novice comprehension, every cookie-privacy configuration or every arbitrary attack payload. The previously measured mobile Lighthouse Performance score of 87 remains an open gap; performance was not re-audited for these small feedback changes. No new animation, dependency, color or layout system was introduced.

## Final verification

- Complete Chromium suite: **64 passed**, zero retries, trusted HTTPS, built assets, one worker (4.2 minutes).
- After the final recall/help edge-case refinement: all **3 focused practice regressions passed** on the rebuilt app. The full suite now discovers 65 unique cases; the 65-case suite was not rerun as one command after that refinement.
- Server/security engines: **24 passed**.
- All-experiment UI walkthrough: **28/28 passed** with the answer/instruction counts recorded above.
- Final TypeScript, ESLint, production build and 21st UI review passed; the existing bundle-size advisory remains.

## Teaching follow-up implemented

The older modules now have 21 experiment-specific worked examples and topic vocabulary. Every experiment has a trace-to-inspect recap and a four-part evidence checklist beside the workbench and in Compare. Cookie storage includes a scope reference table; CSRF adds a source/session/privacy diagnostic checklist; JWT separates essential reading from optional historical cryptography vocabulary. Practice is initially collapsed to remove duplicate questions from the main path, opens in Compare/Learn and retains the last ten descriptive concept attempts. Existing last-answer records are included when history first migrates. There is no mastery percentage.

A [30-minute review](manual-review-30-minutes.md) is linked inside the application, with seven real experiment links and explicit timings. It covers representative controls, not every variant. Additional authentication/CORS/clickjacking modules and the wider mobile performance issue remain separate work; no new attack module or dependency was added here.
