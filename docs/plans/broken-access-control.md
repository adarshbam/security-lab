# Broken Access Control lab — implementation handoff

Status: implemented with the user’s later scope correction on 1 November 2026. The work is split into independent **Broken Access Control** (horizontal file/folder read and delete) and **Privilege Escalation** (mass assignment, persisted admin role and account deletion) modules. The combined chain below is retained as the original planning record; the module guides and verification notes describe the shipped behavior.

## Learner story

Build a small fictional **Team Files** website on the existing `https://app.security-lab.test:8443` origin. A regular member signs in, sees their own documents, and uses a visible request workbench to try another document ID. In the vulnerable mode, the server returns a colleague's private document. The member then submits a normal profile update with an extra `role: "admin"` field. The vulnerable server saves that field. A fresh server request confirms the new role, opens the admin view, and permits deleting every *other* fictional account one at a time. Reset restores all users and files. No real data or external target is involved.

The three faults must be explained separately: missing object ownership check (horizontal access), mass assignment of a privileged field (vertical escalation), and a destructive admin operation that trusts a role the user was allowed to change. The delete route may check `role === "admin"`; the chain is still vulnerable because the role source was corrupted by the profile update. A hidden or disabled button is never treated as an access control.

## Module and worlds

Add `src/labs/broken-access-control/` with `manifest.ts`, `experiments/`, `client/`, `server/`, `docs/README.md`, and `tests/`. Register one client and one server module in the existing explicit registries. Keep all state, cookie names, request IDs, reset logic and documentation inside the module. Playwright discovers module tests automatically. Use executable `?raw` source regions in Compare after an attempted request.

Use two independent in-memory worlds seeded from the same fictional users and files: **Vulnerable** and **Protected**. Each has its own opaque, host-only `Secure; HttpOnly; SameSite=Lax` session cookie; the session stores only a user ID, and each request reads that world's current role. This makes the role change persist across a fresh request and prevents a protected result from being contaminated by the vulnerable world's state. Reconfiguration and reset revoke that world's sessions; module reset restores both worlds without touching the cookie, CSRF or JWT labs. No database or new host is needed.

For state-changing routes in both worlds, require an exact app `Origin` and a session-bound CSRF token. This keeps the access-control lesson distinct from the existing CSRF lab. The existing `adminGuard` protects lab reset/configuration/inspector controls only; its custom header must never stand in for the fictional user's role.

## Learner journeys

Every experiment uses **Understand → Predict → Experiment → Compare → Learn**, with an actual request required before answers unlock. The UI shows request method, path, supplied JSON, status, actor ID and role as resolved by the server, authorization decision, and state before/after from the shared inspector. It never prints session or CSRF credential values.

1. **Read a colleague's file.** Sign in as `alex` (member), read an owned file as a positive control, then change the file ID to one owned by `sam`. Vulnerable GET returns the other user's fictional content; protected GET denies it (prefer 404 without disclosing existence). A legitimate `sam` session can read that file on the protected route.
2. **Make yourself admin.** Show an ordinary allowed `displayName` edit, then send `PATCH /me` with `role: "admin"`. Vulnerable mode merges untrusted JSON into the persisted user object. Protected mode explicitly accepts only `displayName` and rejects attempts to set `role`, `id`, or ownership fields. After the vulnerable update, a new `/me` request and a fresh admin-directory request prove the stored role and effective permission. Protected member remains a member and cannot enter the admin route. A seeded admin can enter it normally.
3. **Delete other accounts.** Before escalation, an ordinary member's DELETE request is denied. After escalation in the vulnerable world, the same member can DELETE a colleague and use a clear **Delete remaining demo users** action that sends a separate request for each other ID. Show each response and a final fresh server-state read: the actor remains, every other user is absent, and their sessions stop authenticating. In the protected world, a member remains denied even if they manually call the endpoint. A seeded legitimate admin can delete a non-self account. The UI requires an explicit in-lab confirmation for the bulk demo action, because it is dramatic, and reset restores the fictional data immediately.

Keep two browser contexts where appropriate so `alex`, `sam`, and the seeded admin can prove their own permissions without synthetic cookie headers. The deletion UI should be available after a server-confirmed role change, while the request editor should remain usable to prove that hiding controls is insufficient.

## Proposed route shape

All learner routes sit under `/api/labs/broken-access-control/:world/` where `:world` is `vulnerable` or `protected`:

| Route | Meaning |
| --- | --- |
| `POST /login`, `POST /logout`, `GET /me` | Fictional login and server-resolved identity |
| `GET /files`, `GET /files/:id` | File list and file read; owner check differs |
| `PATCH /me` | Editable display name; vulnerable mass assignment vs protected field allowlist |
| `GET /admin/users` | Server-enforced role gate; shows surviving fictional users |
| `DELETE /admin/users/:id` | Server-enforced role gate, no self-deletion, one target per request |
| `GET /csrf-token` | Same-origin, session-bound token for mutations |

Add module-level `POST /reset` under the existing exact-origin control guard. Only the documented vulnerable read/profile behaviors differ; both worlds use the same sensible HTTP methods and independent authentication. Never make state-changing GET endpoints.

## UI direction

Use the project's existing token system, extending it deliberately before building UI: one cool neutral ramp, one accent, semantic success/warning/error, 4/8-based spacing, one 8px radius, visible focus and reduced-motion rules. Support light and dark themes. No gradient hero, decorative metrics or repetitive card grid. Make the file list, profile editor, request builder and server response the visual hierarchy. Keep buttons at least 44px tall and labels beside inputs. Use a compact permission table in Compare to clarify what `alex`, `sam`, and an admin may do. Do not show expected outcomes until the learner has sent a request.

## Verification and completion

- Server tests: ownership predicate, explicit update-field allowlist, current-role lookup, session revocation on deletion, self-deletion guard and reset isolation.
- Playwright: fresh contexts, trusted local HTTPS, real login and requests, no mocked responses or injected cookie headers. Pair each denied request with successful vulnerable and legitimate controls. Inspect authenticated actor, role, status, decision and persisted state. Verify that the member's delete is denied before escalation, the vulnerable role change persists, deletions succeed afterward, a protected member remains denied, and a legitimate protected admin succeeds.
- Test a manual direct request to the protected route to prove the frontend is not the protection. Check prediction gating, reset, cross-lab isolation, desktop/mobile layout at 375/768/1280/1920px, keyboard focus, reduced motion and console errors.
- Add module-local learner guide and challenges, update README, capture actual screenshots, run `npm run check`, then review both five-stage journeys. Keep the current loopback-only runtime and no deployment job.

## Primary references

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): deny by default, validate permissions on every request, test authorization logic.
- [OWASP Insecure Direct Object Reference Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html): scope object reads to the current user.
- [OWASP Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html): use an allowlist for profile updates.
- [OWASP Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/): broader access-control failure context.
