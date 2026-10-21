import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp5ExpirationLifecycles: ExperimentDefinition = {
  id: 'exp5-expiration-lifecycles',
  title: 'Lifecycles: Session, Persistent & Server Invalidation',
  summary: 'Compare browser session cookies, Max-Age expiration, and server-side state invalidation.',
  startingConditions: ['Issue a browser session cookie and a Max-Age=5s persistent cookie.',
  'Issue a separate HttpOnly session cookie whose server-side session expires after 3s.',
  'Probe immediately, again after five seconds, then invalidate credentials explicitly.'],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'What happens if a user clicks Logout in the application?',
  predictionOptions: [
    {
      id: 'server_and_client_clear',
      label: 'The server revokes the session AND sends an expired Set-Cookie to remove it from the browser.',
      isCorrect: true,
      explanation: 'Correct! Robust logout requires both explicit server-side revocation (preventing token reuse) and clearing client cookies.',
    },
    {
      id: 'browser_only',
      label: 'Only the browser deletes the cookie; the server does not need to invalidate the session token.',
      isCorrect: false,
      explanation: 'Incorrect. A stolen copy can remain valid until server expiry unless the server invalidates it explicitly.',
    },
    {
      id: 'localstorage_expires_automatically',
      label: 'localStorage items have built-in 30-day expiration mechanisms matching cookies.',
      isCorrect: false,
      explanation: 'Incorrect! localStorage has NO native expiration mechanism. Items persist forever until JavaScript explicitly removes them or site data is cleared.',
    },
  ],
  learnMarkdown: `Browser expiry and server expiry are independent. Max-Age expires the persistent marker after five seconds; the server rejects its short-lived session after three seconds even while that HttpOnly browser cookie still exists.

A session cookie has neither Max-Age nor Expires. Browser session restoration can preserve it, so closing the browser is not a reliable logout mechanism. localStorage has no built-in expiry. Logout and reset revoke all Lab 1 credentials and clear the matching cookie domain/path combinations.

Challenge: lengthen the browser cookie lifetime without changing the server TTL. Does authentication last longer? Test it rather than assuming.`,
  codeSnippets: [],
};
