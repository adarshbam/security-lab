# Contributing

Use Node 24, complete the trusted local setup, then run `npm ci` and `npm run check`. Stop a manually running lab before tests.

Each lab owns its source, docs and tests. Follow [the architecture guide](docs/architecture.md) when adding a module. Keep vulnerable behavior explicit, limited to dummy data, and separate from the control plane.

Teach through an ordinary allowed action, a prediction, an attacker request, actual evidence, the relevant executable check, and a retry against a corrected or protected implementation. Include a legitimate positive control and an independent reset. Keep the mechanism-specific controls: historical JWT libraries remain installed for reproduction, and browser cookie/CSRF lessons must reflect actual browser behavior. The five shared steps organize the lesson; they do not require identical buttons or a pretend live fix.

A security claim needs a real browser experiment, a successful vulnerable control, a successful legitimate control and a server-state assertion. Do not make browser tests pass by mocking cookie behavior, seeding cookie jars, ignoring TLS errors, disabling security controls or weakening an assertion. For privacy-dependent experiments, attach and explain observed evidence.

Keep snippets sourced from the executable implementation. Gate explanations per experiment. Preserve accessibility, reset semantics and lab isolation. Add primary MDN/OWASP references and module-local challenges.

Run `npm run screenshots` after UI changes and review the generated images. Keep certificates, credentials, reports and local tooling out of Git. Never add a deployment job or public vulnerable endpoint.

Report defects with reproduction steps, Node/OS/browser versions and redacted observations. Do not include real credentials or private CA keys.
