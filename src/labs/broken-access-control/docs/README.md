# Lab 1 — Broken Access Control · Team Files

**Learning path · Lab 1 of 7.** Recommended preparation: No earlier lab. Use the in-app request/response primer. See the [full path and readiness checkpoints](../../../../docs/learning-path.md). Prerequisites guide study; they do not lock this lab.

Alex is an ordinary team member testing a fictional Team Files service. Sam is another member whose private file and folder are the target. The vulnerable and protected worlds start with identical, independent in-memory resources. All requests stay on the local HTTPS lab.

## Read a colleague’s file

Sign in as `alex` in each world. Read `file-alex` as a successful control, then change the path to `file-sam`. The vulnerable world returns Sam’s fictional content. The protected world returns 404 without revealing whether the file exists. Sign in as `sam` in a separate browser context to prove the real owner can read it.

## Delete a colleague’s file

Send `DELETE /files/file-alex` as Alex to establish that members can delete their own files. After reset, target `file-sam`. The vulnerable world deletes it by ID. The protected world checks ownership and preserves it when Alex calls directly. Sam can delete their own protected file. A fresh GET and the inspector’s before/after state prove whether deletion happened.

## Delete a colleague’s folder

Target `folder-sam` as Alex. Vulnerable deletion removes the folder and its contained `file-sam`. The protected route denies Alex before any cascade; Sam can delete their own folder and file. Reset restores both worlds. Deletions require an exact app Origin and a session-bound CSRF token, so the lesson isolates object authorization rather than CSRF.

## Challenges

1. Compare a nonexistent file ID with a real but unowned file in the protected world.
2. Try a direct DELETE with no CSRF token. Does authenticating the member alone authorize the target?
3. After folder deletion, request both the folder and its file. Compare the two worlds’ state.
4. Reset Broken Access Control and verify a Privilege Escalation session remains valid.

The [Privilege Escalation lab](../../privilege-escalation/docs/README.md) uses the same fictional team to teach admin role gain and account deletion as a separate lesson.
