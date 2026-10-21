# Architecture and adding a lab

## Runtime boundaries

One npm package contains a React/Vite client and an Express server. Express owns HTTPS on 127.0.0.1:8443; Vite runs in middleware mode with HMR on the same HTTPS listener. Built mode serves the frontend from dist while retaining the same lab APIs. A separate HTTP server on 127.0.0.1:8080 exposes only read-only diagnostics.

Host validation and proxy-header rejection precede routing. Application APIs mount at `/api/labs/<id>`. Auxiliary hostname routers mount module-owned pages at `/labs/<id>/`; root source URLs select a module through `labId` and redirect there. No shared global CSRF middleware suppresses the deliberately vulnerable requests.

Control calls use POST, an exact app Origin and the X-Security-Lab-Admin header. These are browser-origin guardrails, not authentication against other local programs. A local program with access to the machine can manufacture HTTP headers; this lab is not a sandbox for hostile local software.

State is in memory and intentionally models one local learner at a time. Reconfiguration revokes that lab's prior credentials. Browser tests run serially to prevent shared-state races. Different modules own different stores and cookie names.

## Contracts

- **LabManifest:** stable id, title, objectives, experiment metadata and primary references.
- **LabClientModule:** manifest, experiment definitions and learner controls.
- **LabServerModule:** app router, optional sibling/attacker routers, initial state, state accessor and reset.
- **ExperimentObservation:** captured headers, cookie names, authentication, protection result, status and state snapshots.

Browser and server registries are separate. Server-only implementations are never imported as executable browser modules. Explicit `?raw` imports provide source text for snippets after an attempt.

## Add one module

1. Create `src/labs/<id>/` with `manifest.ts`, `experiments/`, `client/`, `server/`, `docs/README.md` and `tests/<id>.spec.ts`.
2. Export a LabClientModule and a LabServerModule. Register them in the corresponding client/server registries. Use a unique id, cookie names and storage keys.
3. Mount experiment routes relative to the module router. Protect configuration, reset and observation controls with adminGuard; keep explicitly vulnerable and corrected routes independently executable.
4. If the lab needs source-origin pages, provide its own `hostRouters.sibling` or `hostRouters.attacker` Express router. Link to `https://<source-host>:8443/labs/<id>/` or pass `labId=<id>` at the source root. Existing modules do not change.
5. Give each experiment starting conditions, predictions, instructions, learning material and executable source snippets. Use marked source regions and sourceRegion; do not maintain an illustrative duplicate of implementation code.
6. Implement lab-local reset to revoke credentials, restore dummy state and clear exact cookie domain/path tuples. Coordinate removal of browser localStorage keys in the module's client.
7. Add browser tests alongside the module. The Playwright glob discovers them automatically. Establish state through real app/browser flows, pair controls and assert authoritative server state.
8. Document challenges and primary references, run npm run check, and capture actual screenshots if the learner flow changes.

Only the two initial labs are implemented. This architecture does not introduce speculative databases, plugin loaders, a general arbitrary-script runner or later vulnerability modules.

## Instrumentation and learning state

The inspector captures path/URL before Express subrouter mounting, then records the response on finish. It deep-copies state snapshots and stores a bounded 200-observation ring. Cookie values and token query parameters are redacted; inspector polling is excluded.

Experiment identifiers correlate observations and never authenticate a request. Correlation is instrumentation for a trusted local learner, not a security boundary. Server logs cannot expose HttpOnly tokens or make a cross-origin response readable.

Learner predictions and per-experiment progress live in a separate localStorage key. Direct storage evidence is persisted only as a redacted summary. The Compare view separates reference expectations from actual observations. This UI gating does not hide the public source repository.
