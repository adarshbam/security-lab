import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp2AuthMechanisms: ExperimentDefinition = {
  id: 'exp2-auth-mechanisms',
  title: 'Ambient Auth & Injected Script Harness',
  summary: 'Execute a fixed same-origin script to observe direct credential reads and an authenticated request.',
  startingConditions: [
    'User is logged in with HttpOnly cookie and localStorage bearer token.',
    'A fixed script executes on the app origin; JavaScript execution is the stated premise.',
    'The script attempts to steal tokens AND execute an unauthorized profile update.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'When the malicious script executes on the legitimate page, what will happen?',
  predictionOptions: [
    {
      id: 'httponly_blocks_everything',
      label: 'HttpOnly prevents the script from both reading the cookie AND making authenticated requests.',
      isCorrect: false,
      explanation: 'Incorrect. HttpOnly prevents reading document.cookie, but does NOT stop the browser from automatically sending the cookie with same-origin fetch calls.',
    },
    {
      id: 'exfiltration_blocked_ambient_succeeds',
      label: 'The script cannot steal the HttpOnly cookie string, BUT its fetch request succeeds because the browser automatically attaches the cookie!',
      isCorrect: true,
      explanation: 'Correct! The script cannot exfiltrate the HttpOnly session token, but the browser automatically attaches the cookie to same-origin requests, allowing the script to perform authenticated actions.',
    },
    {
      id: 'bearer_safer',
      label: 'Bearer tokens are safer because the script cannot access localStorage.',
      isCorrect: false,
      explanation: 'Incorrect. Malicious scripts have direct, unrestricted access to localStorage and can steal bearer tokens instantly.',
    },
  ],
  learnMarkdown: `### Key Security Takeaway
**HttpOnly mitigates credential theft, NOT session misuse or XSS.**

1. **What HttpOnly Accomplishes**:
   - The attacker cannot read the cookie value.
   - Direct document.cookie reads cannot copy the HttpOnly token for later replay. Other application leaks would require separate defenses.
2. **What HttpOnly Does NOT Accomplish**:
   - If malicious JavaScript runs in the victim's browser session, it can issue arbitrary same-origin \`fetch()\` or \`XMLHttpRequest\` calls.
   - The browser dutifully attaches the HttpOnly cookie to those calls.
   - If the application requires a same-origin CSRF token or nonce, the same-origin script can easily fetch the token first and include it!

**Conclusion**: Defending against XSS requires robust input sanitization, output encoding, and Content Security Policy (CSP). HttpOnly is an essential defense-in-depth measure, but not a replacement for XSS prevention.

### References
- [OWASP Session Management: HttpOnly](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#httponly-attribute)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)`,
  codeSnippets: [],
};
