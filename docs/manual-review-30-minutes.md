# Your 30-minute manual review

This is a representative smoke test of all seven labs, not an exhaustive retest of all 28 experiments. Keep this guide open beside the app. I can guide you one checkpoint at a time in chat; send the observed outcome or any error and we will move on. Do not spend the time budget reading every source block.

## 0:00–2:00 · Prepare

Open https://app.security-lab.test:8443 and browser Developer Tools → Network. Use fictional fixtures only. For each lab, use Reset Experiment first, then Explore freely. Record one sentence: identity → boundary → response/state → legitimate control. Stop on unexpected behavior; use the diagnostic checklist instead of repeatedly clicking.

In Lab 1 only, try a wrong prediction and a right prediction, opening Compare after each. After the experiment, expand Practice and review, check both answers and inspect recent attempts. Reload to check persistence. For the other labs, prioritize the attack, protected retry and legitimate control.

## 02:00–05:00 · Lab 1: Read another member’s file

[Open this experiment](https://app.security-lab.test:8443/?lab=broken-access-control&experiment=access-files)

Sign in as Alex in Vulnerable; send GET /files/file-sam. Repeat in Protected, then sign in as Sam and retry.

**Check:** Vulnerable returns Sam’s file; Protected denies Alex and allows Sam.

## 05:00–08:00 · Lab 2: Follow a role change

[Open this experiment](https://app.security-lab.test:8443/?lab=privilege-escalation&experiment=privilege-role)

As Alex, send PATCH /me with {"displayName":"Alex Rivera","role":"admin"}. Refresh server identity and request /admin/users. Repeat in Protected; Taylor is the legitimate admin control.

**Check:** Vulnerable persists admin; Protected keeps Alex a member and denies the directory.

## 08:00–11:00 · Lab 3: Compare browser storage with script access

[Open this experiment](https://app.security-lab.test:8443/?lab=cookie-storage&experiment=exp1-storage-types)

Issue credentials. Inspect Application → Cookies and Local storage; click Inspect JavaScript Storage.

**Check:** HttpOnly is visible in DevTools but absent from document.cookie; localStorage and the readable cookie are script-readable.

## 11:00–15:00 · Lab 4: Submit a real cross-site form

[Open this experiment](https://app.security-lab.test:8443/?lab=samesite-csrf&experiment=exp2-csrf-top-level-post)

Choose SameSite=None, run the legitimate app action, then open the attacker console. Submit its vulnerable form, inspect state, and repeat against combined protection.

**Check:** The vulnerable form can mutate with eligible cookies; combined protection rejects the attack while the legitimate control succeeds.

## 15:00–19:00 · Lab 5: Compare query text with bound values

[Open this experiment](https://app.security-lab.test:8443/?lab=injection-attacks&experiment=injection-sql)

Load attack example, send login in Vulnerable, then repeat in Protected. Finally load legitimate example and send in Protected.

**Check:** The concatenated query accepts the attack; bound parameters reject it; the legitimate login works.

## 19:00–23:00 · Lab 6: Trace input into HTML

[Open this experiment](https://app.security-lab.test:8443/?lab=xss-csp&experiment=xss-reflected)

Create a Vulnerable run with the handler payload and absent CSP; read actual state. Repeat with encoded text. Run legitimate code in the frame as a control.

**Check:** The vulnerable handler executes; encoded text does not. Legitimate code must still work. Inspect the frame, not the shell.

## 23:00–28:00 · Lab 7: Decode versus verification

[Open this experiment](https://app.security-lab.test:8443/?lab=exployting-jwt-tokens&experiment=jwt-decode)

Issue the ordinary-user JWT, edit role to admin, apply payload while keeping signature, and send to both dashboards. Restore the original and request My profile on Protected.

**Check:** Decode-only can trust the edited admin claim; Protected rejects its signature. The original signed user token still opens its profile.

If the five-minute JWT expires while you are reading, issue a fresh token and repeat the comparison; distinguish expiry from a changed-signature rejection.

## 28:00–30:00 · Wrap up

Reload once to confirm notes and reasoning attempts remain. Use Restart Learning Progress only if you want to clear that record. Report any failure with lab/experiment, selected world or policy, action, actual status/state and the expected behavior. Do not include tokens.

If time is tight, test wrong/right feedback and persistence only in Lab 1 and use the remaining time for each lab’s vulnerable, protected and legitimate controls. Historical JWT confusion/unsigned variants, the full cookie-scope matrix, other SameSite modes and stored/DOM XSS remain deeper follow-up checks. They are intentionally outside this 30-minute pass.
