import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';

export const exp1SameSiteModes: ExperimentDefinition = {
  id: 'exp1-samesite-modes',
  title: '1. SameSite Modes (Strict, Lax, None)',
  summary: 'Configure session cookies with Strict, Lax, or None (Secure) and examine browser transmission rules.',
  startingConditions: [
    'User selects a SameSite policy (Strict, Lax, or None).',
    'Server issues session_csrf with the selected policy over HTTPS.',
    'Browser stores the cookie and evaluates it against subsequent request contexts.',
  ],
  understandMarkdown: "Investigate the question below using actual browser actions. Establish the listed starting conditions, record your prediction, and compare the result with the request inspector. Explanations and executable implementation source unlock after an attempt.",
  predictionPrompt: 'If you configure SameSite=Strict and click a top-level link from attacker.csrf-lab.test, will the cookie be sent?',
  predictionOptions: [
    {
      id: 'strict_withholds_link',
      label: 'No, SameSite=Strict withholds the cookie even on top-level GET link navigations.',
      isCorrect: true,
      explanation: 'Correct! SameSite=Strict never sends the cookie on any cross-site request, including top-level links.',
    },
    {
      id: 'strict_sends_link',
      label: 'Yes, all cookies are sent on top-level GET links regardless of SameSite setting.',
      isCorrect: false,
      explanation: 'Incorrect. Only Lax and None send cookies on top-level GET links. Strict strictly withholds them.',
    },
    {
      id: 'none_without_secure',
      label: 'SameSite=None can be used over unencrypted HTTP without the Secure attribute.',
      isCorrect: false,
      explanation: 'Incorrect. RFC 6265bis and browser engines reject SameSite=None unless the Secure flag is present.',
    },
  ],
  learnMarkdown: `Strict withholds cookies on cross-site navigations. Explicit Lax allows top-level safe navigations such as GET, but withholds cookies on cross-site POST forms and embedded requests. None permits cross-site cookie use and requires Secure, but third-party-cookie/privacy rules may still block cookies in embedded or fetch contexts.

All cookies in this lab specify SameSite explicitly. Some browsers use a more permissive recent-cookie POST rule when the attribute is omitted; that is not the explicit Lax behavior tested here.

Use top-level GET and POST requests as the reference cases, then investigate iframe and fetch behavior separately.`,
  codeSnippets: [],
};
