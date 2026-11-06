# Working through the labs

[Overview](../README.md) · [Setup](setup.md) · [Architecture](architecture.md) · [Verification](verification.md)

## The experiment loop

1. Read the starting conditions and question.
2. Record a prediction.
3. Issue dummy credentials as needed and perform the actual experiment.
4. Compare the server observation, browser result, and reference expectation.
5. Read the explanation, implementation snippet, limitations, and challenge.

Preparing credentials or opening a console does not unlock the explanation; completing the corresponding request flow does. Predictions and learner progress live in localStorage separately from dummy authentication.

## Read the right evidence

The inspector records the actual request's headers/cookie names, authentication, status, and before/after state. Raw credential values are redacted. It cannot let page JavaScript read HttpOnly credentials or cross-origin response bodies.

An unreadable response, missing UI text, or CORS error does not establish that the server rejected an action. Compare a vulnerable positive control, a legitimate protected action, and the blocked attempt. For CSRF, inspect received credentials, original Origin/Fetch Metadata, and actual state mutation.

## Local topology

| Address | Role |
| --- | --- |
| `https://app.security-lab.test:8443` | Legitimate application and lab APIs |
| `https://sibling.security-lab.test:8443` | Same-site, different-origin source |
| `https://attacker.csrf-lab.test:8443` | Cross-site source |
| `http://app.security-lab.test:8080` | Read-only Secure-cookie probe |

Every name resolves to 127.0.0.1. The different site/origin relationships are part of the experiment, not additional remote services. Cookies are not isolated by port; localStorage includes scheme, host, and port. The HTTP probe uses navigation to avoid confusing mixed-content blocking with Secure-cookie behavior.

## Reset precisely

**Reset Experiment** restores the active lab's dummy state, revokes its credentials, and clears the relevant cookie tuples/observations. **Restart Learning Progress** resets predictions and explanation access separately. Follow each module's instructions where a comparison-specific reset preserves the current dummy session.

Browser privacy settings can independently suppress third-party cookies. Inspect observed behavior; do not disable privacy or TLS protections to force a reference outcome.

## Choose a module

- [Cookies/localStorage](../src/labs/cookie-storage/docs/README.md): five experiments and challenges.
- [SameSite/CSRF](../src/labs/samesite-csrf/docs/README.md): six experiments, source consoles, and evidence worksheet.
- [JWT](../src/labs/exployting-jwt-tokens/docs/README.md): five experiments and real historical verifiers. JWT authentication and admin authorization are separate outcomes.

The fixed same-origin script scenarios assume script execution already exists; they are not a general arbitrary-XSS sandbox. JWT request-size samples measure the received bearer header and configured verification timing, not universal JWT/session performance.
