# Lab 6 — XSS Attacks & CSP

**Learning path · Lab 6 of 7.** Recommended preparation: Labs 3 and 5 · browser credential behavior and the data/code boundary. See the [full path and readiness checkpoints](../../../../docs/learning-path.md). Prerequisites guide study; they do not lock this lab.

For beginner web developers. Start with the existing trusted HTTPS setup (`npm run setup`, `npm run dev`). The normal server starts an additional HTTPS listener on **127.0.0.1:8444**, using the existing certificate for `attacker.csrf-lab.test`. If that port is unavailable, startup fails closed. No extra runtime dependency was added.

Stable teaching links:

- [Reflected search input](https://app.security-lab.test:8443/?lab=xss-csp&experiment=xss-reflected)
- [Stored release notes](https://app.security-lab.test:8443/?lab=xss-csp&experiment=xss-stored)
- [DOM fragment preview](https://app.security-lab.test:8443/?lab=xss-csp&experiment=xss-dom)
- [Nonce policy comparison](https://app.security-lab.test:8443/?lab=xss-csp&experiment=xss-csp)

## How to investigate

Prepare the terms and the named worked example. Record a prediction, including uncertainty, or explore freely. Each experiment has specific DevTools instructions, misconception feedback, a separate transfer question, an independent variation and a later recall prompt. Explanations never depend on passing a check. Review intervals are suggestions; there is no claim of universal learning superiority or verified mastery.

Each action explains its requests and automatic effects before its controls. Create isolated run stores a new run and loads its real document. Read actual state explicitly fetches server counters. Run legitimate code inside the frame is the positive control. Refresh the shared inspector after frame actions. Cookie values are redacted there. Notes and self-reported learning progress stay in the existing browser-local learning system.

Select the **isolated frame** in DevTools Console. In Network, inspect its document response, `/marker` requests and `/reports` requests. The shell’s headers do not describe the frame’s CSP. Do not filter exclusively to `/api/labs/`: frame requests use `/runs/<id>/…`.

| Experiment | Source and transformation | Vulnerable sink | Protected comparison |
| --- | --- | --- | --- |
| Reflected search input | `input` query → Express decoding | Server response HTML text position | Encode HTML text metacharacters before the browser parses it |
| Stored release notes | Catalogue note → in-memory `stored` value → later document request | Same raw server HTML sink | Encode on output; persistence does not confer trust |
| DOM fragment preview | `location.hash` → URI decoding → catalogue guard | `innerHTML` | `textContent`, or reconstruct a narrow formatting language |
| Nonce policy comparison | Reflected input → raw rendering → browser CSP check | Same raw HTML sink under different headers | Nonce enforcement plus independently safe rendering |

`sourceRegion` extracts the displayed code from executable source, rather than separate illustrative implementations. `server/document.ts` generates the actual document, header policies, text encoder and DOM sink comparison. `server/isolated.ts` implements authenticated, bounded mutations. Script elements inserted through `innerHTML` are inert in this exercise; SVG handlers can still execute. The reflected parser-inserted script provides the independent contrast.

The intentional-HTML mode rebuilds only `b`, `strong`, `em` and `br` nodes, with no attributes; unsupported subtrees are discarded. This is a small teaching language, not a general-purpose rich-text sanitizer. Production applications should use a maintained sanitizer configured for their required HTML language. The text encoder is specifically for HTML text, not a universal JavaScript, CSS, attribute or URL encoder.

## Actual CSP modes

- **Absent:** no CSP response header. Fixed catalogue payloads provide the containment boundary.
- **Unsafe inline:** enforced resource restrictions plus `script-src 'unsafe-inline'`.
- **Nonce report-only:** an unsafe-inline baseline is enforced; a restrictive nonce policy is sent in `Content-Security-Policy-Report-Only` with a local `report-uri`. Inline violations are reported, not prevented by that report-only policy.
- **Nonce enforced:** `script-src 'nonce-<fresh unpredictable value>'` in `Content-Security-Policy`. Only the trusted script receives the nonce. Attacker catalogue handlers and script elements receive none. Legitimate listeners still work.

Restricted modes deny default resources, images, objects, base URLs and forms; `connect-src 'self'` permits the local marker/state/report functionality, and frame ancestors are limited to the shell. Inline styling is permitted for the document’s own styles; the script policy is the comparison under investigation. The global shell policy and other labs are not relaxed. Reports retain only a bounded directive and disposition, never script samples, cookie values or arbitrary report bodies. Reports are observational, asynchronous and forgeable outside the fixed exercise; they are not cryptographic proof.

Use evidence from headers, Console, actual marker responses, DOM and resulting state together. A zero counter alone could mean a blocked handler, safe text, an inert script node, an expired run or cookie failure. A successful HTTP document response alone does not prove execution. Enforcement does not remove markup: legitimate strong formatting in raw HTML remains formatted under a nonce policy. A nonce authorizes code, not its input.

## Isolation and limitations

The payload origin is `https://attacker.csrf-lab.test:8444`, distinct from the teaching shell and the existing auxiliary origin on port 8443. It serves only this lesson’s routes, never shell assets or admin APIs. Host, listener port and forwarded headers are checked. The frame allows scripts and its own origin, while denying forms, popups and parent navigation. There is no cross-origin message bridge or permissive CORS endpoint.

Only three exact catalogue inputs are accepted: a local SVG marker, a local script marker and fictional emphasis text. Reflected input is checked server-side; DOM fragments must match the configured catalogue input before reaching the sink. This guard is containment, **not** the rendering fix being tested. There is no arbitrary HTML/JavaScript editor, remote target or external exfiltration destination. DevTools can modify code independently; the exercise is not an OS sandbox for arbitrary hostile scripts.

Ports isolate origins, **not cookies**. The isolated cookies use the auxiliary hostname and a random run path. Both have Secure, SameSite=None and Partitioned; the dummy session also has HttpOnly. This supports the cross-site frame in tested Chromium. Privacy controls or unsupported cookie partitioning can change the result; use the legitimate control to diagnose it. The teaching shell’s theme selector controls the shell; the isolated document follows its browser color-scheme preference.

The browser hides the HttpOnly value from `document.cookie`, but still attaches it to an eligible same-origin `fetch`. An executing handler can therefore make the dummy authenticated mutation. Marker counters and the mutation are capped at one, visits at 99, reports at 12, and active runs at 60. Stored notes persist only in this Node process. Reset removes runs and revokes their sessions; old cookies may remain in browser storage but cannot authenticate a removed run. Reloading a saved document counts another visit; it does not reset marker counters. The UI keeps at most eight explicit snapshots.

## Verification

From the repository root:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
node --import tsx --test tests/server/*.spec.ts src/labs/xss-csp/tests/xss-server.node.ts
node node_modules/@playwright/test/cli.js test --config src/labs/xss-csp/tests/playwright.config.ts
```

The dedicated Playwright configuration uses built assets and its own ignored artifacts directory. It can reuse an already running lab server to avoid interrupting concurrent work. **Restart an older server before validating changed server source.** Do not run multiple XSS suites against the same in-memory runs simultaneously.

The browser suite verifies paired rendering, real execution, inert DOM scripts, positive controls, real CSP headers and report dispositions, dummy cookie visibility, authenticated state changes, redacted inspector snapshots, independent stored revisits, route guards, reset, deep links, free exploration, keyboard activation and touch targets. It checks no horizontal overflow at 375, 768, 1280 and 1920px in light/dark themes with reduced motion. No new animation was added.

Optional audit tools are installed only in the ignored cache, leaving runtime dependencies unchanged:

```powershell
npm install --prefix .cache/xss-audit --no-save --package-lock=false lighthouse @axe-core/playwright
node --import tsx src/labs/xss-csp/tests/audit.mjs
```

The audit captures eight screenshots, runs axe on the workbench and separately on a fresh source-generated lesson document served over loopback HTTPS, records uncaught page errors, and runs mobile Lighthouse on the built teaching page. The independent lesson semantic check does not exercise authenticated marker routes; those are verified by the integrated browser suite. This also avoids reporting an older concurrent server’s document markup as current source. Results live in `tests/artifacts/audit/`. Lighthouse is a synthetic run, not a field INP measurement; it does not certify all possible payload/configuration combinations. The existing shared bundle still exceeds Vite’s 500 kB warning threshold; this lab’s workbench is lazy-loaded separately.

The existing project components and warm-neutral tokens were reused; no 21st component dependency was installed. The 21st catalogue search supplied no useful replacement for the existing workbench primitives. The local `21st review` command was unavailable in this environment.

Verified on 2 November 2026: type checking and scoped ESLint passed; Vite built successfully; 22 server tests and five XSS browser tests passed. All eight width/theme checks had no horizontal overflow or workbench axe violations; the independently served current lesson document had no axe violations, and no uncaught page errors were recorded. The last mobile Lighthouse run scored Performance **98** and Accessibility **100**, with LCP approximately **1.05 s** and CLS **0**. Scores varied across local runs and are not field performance guarantees. Field INP and non-Chromium browser behavior remain unmeasured.
