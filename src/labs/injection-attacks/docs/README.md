# Lab 5 — Injection Attacks

**Learning path · Lab 5 of 7.** Recommended preparation: Lab 1 · Broken Access Control; basic JSON and a simple SELECT. CSRF is a separate branch. See the [full path and readiness checkpoints](../../../../docs/learning-path.md). Prerequisites guide study; they do not lock this lab.

Beginner lab with three deliberately bounded, executable mechanisms. All accounts and credentials are fictional. The existing HTTPS server binds to 127.0.0.1; Host validation rejects other hosts and forwarded headers. Nothing targets an external service.

## Stable links

- [SQL concatenation and parameters](https://app.security-lab.test:8443/?lab=injection-attacks&experiment=injection-sql)
- [Object-shaped query operators](https://app.security-lab.test:8443/?lab=injection-attacks&experiment=injection-nosql)
- [Coerced credential comparisons](https://app.security-lab.test:8443/?lab=injection-attacks&experiment=injection-coercion)

## Actual implementations

`server/engine.ts` is the executable source displayed by the teaching panel. SQLite uses Node 24’s built-in `node:sqlite`, an in-memory database with query-only mode, and a SELECT through `prepare().get()`. Both variants validate nonempty strings of at most 256 characters. Vulnerable SQL concatenates those strings; protected SQL binds parameters. String validation alone therefore demonstrably fails to stop the string payload `sam' --`.

Mingo 7.2.1 evaluates Mongo-style query predicates over two local documents. It is not a MongoDB server and does not model MongoDB transport, version differences or its entire language. Its explicit operator context and endpoint bounds allow only strings or a single `$eq`/`$ne` string operand for each field; script evaluation is disabled. The vulnerable implementation inserts field values directly into predicates; the protected implementation validates strings and constructs `$eq` predicates explicitly. A quoted operator string differs from an operator object. No ad hoc string recognizer is labelled a database engine.

The coercion experiment runs JavaScript `==` against a fictional stored string PIN `"0"`; the protected route validates strings then uses `===`. Boolean false, numeric zero and `[0]` match under loose equality. An empty array and the string `"false"` do not. This is an application comparison flaw, not SQL injection, a PHP magic hash, or a universal property of login systems.

These fixtures intentionally store simple plaintext credentials for inspection of predicates; they are not production authentication examples. Real authentication also needs password hashing and verification, session lifecycle controls, abuse protections and deployment controls. Parameter binding, query construction, validation, equality semantics and authentication have distinct responsibilities.

## Workflow and evidence

Each experiment prepares terms/state, asks one prediction with uncertainty available, gives sequential manual Network instructions, an experiment-specific worked example, misconception feedback, an independent variation, a distinct transfer check, and later retrieval prompts. The existing teaching shell never requires a correct answer to explore or read explanations. Notes and progress use the existing local learning store; request evidence contains no submitted credential values. Study intervals are suggestions, not comparative efficacy claims.

Example controls only edit JSON. Send login performs one POST followed by an automatic GET /me. Check current identity performs only GET /me. Both implementations have legitimate successful fixtures. Requests use application/json so learners can inspect object/boolean/number/string differences; other Content-Types receive 415. Nonlocal Origins receive 403. Evaluated failed logins revoke that scope’s earlier session, preventing stale success from masquerading as the result of an attack. Transport/Origin rejection does not evaluate or revoke a prior session.

Cookies are separate per engine and implementation, Secure/HttpOnly/SameSite=Strict with scoped API paths. The server stores bounded opaque sessions independently of other labs. Reset revokes this lab’s sessions; the shell clears only its experiment logs. Database fixtures are immutable. The session bound is 200; reaching it clears this lab’s sessions, which is a local resource limit rather than a production session policy.

Response and inspector evidence includes parsed field types, decisions, public fictional actor IDs, and session snapshots without tokens. SQL shows a redacted construction template, **not** the complete executed statement or parse tree. Document query structure retains operator keys but redacts string operands. A fresh GET /me proves which session identity exists. Full submitted fixture inputs remain visible in browser Network and the editor, as required for manual investigation; do not use real credentials. Source examples are extracted from executable source regions. SQL SELECT projections are mapped back to known public fixture identities so injected column aliases cannot reflect stored password fields.

## Verification commands

```powershell
node --import tsx --test src/labs/injection-attacks/tests/engine.test.ts
npx playwright test --config src/labs/injection-attacks/tests/playwright.config.ts
npm run typecheck
npm run build
```

The lab-specific Playwright configuration reuses a running trusted local server when available. The repository-wide Playwright suite also discovers `injection.spec.ts`; engine tests use `.test.ts` to stay outside browser discovery. Engine tests verify actual evaluator behavior, alternate identities, positive controls, rejected operators, type distinctions and redaction. Browser tests verify cookies, login/identity state, scope reset, inspector redaction, request guards, workbench interactions, deep links, four widths, both themes, reduced motion and keyboard focus. Screenshots are in this directory when browser checks have run. Automated checks do not establish learning effectiveness or replace a screen-reader audit.

## Recorded verification — 2 November 2026

- Production `npm run build` passed, including TypeScript. Scoped ESLint passed. 21st review: zero findings.
- Engine tests: 4 passed. Existing shared server suite: 20 passed. Injection browser suite: 4 passed against built assets and trusted HTTPS, without TLS or browser security bypasses.
- Browser checks: 375, 768, 1280 and 1920px; light/dark; reduced motion; visible keyboard focus; no horizontal overflow; no recorded page errors. Desktop/mobile screenshots are supplied here.
- Lighthouse 12.8.2 desktop navigation: Performance **97**, Accessibility **100**, LCP **1.0s**, CLS **0**, TBT **0ms**. Full report: `lighthouse-desktop.json`.
- Lighthouse 12.8.2 mobile navigation with its default simulated mobile throttling: Performance **73**, Accessibility **100**, LCP **4.5s**, CLS **0**, TBT **40ms**. Full report: `lighthouse-mobile.json`. **The mobile performance/LCP budget is not met.** The shared app entry is about 626kB before gzip and is delivered without transfer compression by the existing server. Shared entry loading and delivery need follow-up work outside this module’s ownership. A passing desktop score is not a claim about mobile performance.
- A Chrome trace of a saved Experiment view initially found CLS 0.2232 from the asynchronously inserted workbench. The small workbench now loads synchronously with its styles; a repeat trace recorded CLS **0.00**, LCP **132ms** on the unthrottled local machine. These local trace numbers do not substitute for the throttled mobile audit. No field INP or real-user measurements are available; TBT is not INP.

The bounded NoSQL language is intentionally not a complete MongoDB service. No screen-reader user study or educational outcome study was conducted. The Node 24 runtime currently emits its experimental SQLite API warning. The existing shared build still warns about its main chunk size; no unrelated labs, theme tokens or shared shell components were rewritten to address it.
