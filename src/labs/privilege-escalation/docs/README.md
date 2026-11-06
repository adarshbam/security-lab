# Lab 2 — Privilege Escalation · Team directory

**Learning path · Lab 2 of 7.** Recommended preparation: Lab 1 · Broken Access Control. See the [full path and readiness checkpoints](../../../../docs/learning-path.md). Prerequisites guide study; they do not lock this lab.

Alex is an ordinary member of the same fictional team. Sam is a colleague whose account is a target. Taylor is the seeded legitimate admin. This lab has its own vulnerable and protected worlds, sessions and reset; Team Files resources are separate.

## Make yourself admin

Sign in as `alex` in both worlds. A normal `PATCH /me` with `{"displayName":"A. Rivera"}` succeeds. Then send `{"displayName":"Alex Rivera","role":"admin"}`. The vulnerable world merges untrusted JSON into the persisted user. A fresh `GET /me` and `GET /admin/users` prove both the stored role and effective permission. The protected world accepts only a valid display name and rejects `role`, `id` and ownership fields. Sign in as `taylor` to prove the protected directory admits a legitimate admin.

## Delete other accounts

Before escalation, Alex’s `DELETE /admin/users/sam` receives 403. After a vulnerable role edit and fresh identity read, it succeeds. The confirmed bulk action asks for in-lab confirmation and sends a separate DELETE per other fictional account. The actor remains; deleted users’ sessions are revoked. The route checks the current server-side admin role and blocks self-deletion. Its failure comes from trusting a role the vulnerable profile endpoint let Alex write. In the protected world, Alex’s direct DELETE stays denied while Taylor may delete a non-self account.

## Challenges

1. Try a protected profile update containing `id` or `ownerId`, then refresh the role.
2. Sign in as Sam in another browser context. Delete Sam after escalation and test the old session.
3. Attempt self-deletion, then inspect the before/after state.
4. Reset this module and verify Team Files resources and JWT credentials are unchanged.

All mutations require an exact app Origin and session-bound CSRF token. The [Broken Access Control lab](../../broken-access-control/docs/README.md) separately explores horizontal file and folder ownership failures.
