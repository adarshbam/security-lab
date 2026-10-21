import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp3SecureTransport: ExperimentDefinition = {
  id: 'exp3-secure-transport',
  title: 'Secure Flag & HTTP/HTTPS Transport Security',
  summary: 'Observe browser transmission of Secure and non-Secure diagnostic cookies over HTTPS (8443) versus plain HTTP (8080).',
  startingConditions: [
    'The server issues secure_session with the Secure flag over HTTPS (8443).',
    'The server issues plain_diagnostic WITHOUT the Secure flag as a positive control.',
    'A dedicated diagnostic probe listener runs on plain HTTP (port 8080).',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'When making a request to the HTTP probe on port 8080, which cookies will the browser send?',
  predictionOptions: [
    {
      id: 'only_diagnostic',
      label: 'The browser sends plain_diagnostic, but strictly withholds secure_session.',
      isCorrect: true,
      explanation: 'Correct! The Secure attribute instructs modern browsers to never send the cookie over unencrypted HTTP. The positive control cookie plain_diagnostic is transmitted normally.',
    },
    {
      id: 'both_cookies',
      label: 'The browser sends both secure_session and plain_diagnostic because the host matches.',
      isCorrect: false,
      explanation: 'Incorrect. Matching hostname is not enough; the Secure attribute overrides and prevents transmission over unencrypted HTTP.',
    },
    {
      id: 'neither_cookie',
      label: 'The browser refuses to send any cookies to port 8080.',
      isCorrect: false,
      explanation: 'Incorrect. Cookies without the Secure attribute are sent freely over plain HTTP.',
    },
  ],
  learnMarkdown: `### Key Security Takeaway
Cookies transmitted over unencrypted HTTP can be intercepted by anyone on the local network path (Wi-Fi eavesdropping, ARP spoofing, rogue routers).

- **The Secure Attribute**: Ensures session tokens are never leaked in plaintext over HTTP.
- **Positive Diagnostic Control**: In security testing, proving a negative (that a credential was NOT sent) requires a positive control (verifying that the channel worked and non-protected items WERE sent).
- **HSTS (HTTP Strict Transport Security)**: Supplements the Secure flag by instructing browsers to never attempt plain HTTP requests in the first place.

### References
- [MDN: Secure Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure)
- [RFC 6265bis: Section 4.1.2.5 The Secure Attribute](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis#section-4.1.2.5)`,
  codeSnippets: [],
};
