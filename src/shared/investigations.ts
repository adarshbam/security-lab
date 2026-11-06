export interface Investigation {
  setup: string;
  steps: string[];
  console?: string;
  question: string;
}

// These are browser tasks, not simulated outcomes. Keep snippets limited to this local lab.
export const investigations: Record<string, Investigation> = {
  'exp1-storage-types': {
    setup: 'Sign in with the fictional account. Keep DevTools attached to the app tab.',
    steps: [
      'In Application → Storage, inspect Cookies for this HTTPS origin. Record the names and HttpOnly column. Open Local storage for the same origin and find auth_token.',
      'In Console on this app tab, run the reads below. Compare the cookie names with Application. Do not paste credential values into your notes.',
      'Use “Inspect JavaScript Storage” to capture the app’s result. Explain why Application can display a cookie that page JavaScript cannot read.',
    ],
    console: "({ localStoragePresent: Boolean(localStorage.getItem('auth_token')), cookieNames: document.cookie.split(';').map(x => x.trim().split('=')[0]).filter(Boolean) })",
    question: 'Which cookie appears in Application but not document.cookie, and which boundary explains the difference?',
  },
  'exp2-auth-mechanisms': {
    setup: 'Question: does storing a credential mean every request sends it? Sign in with the fictional account. A credential is a value the server can check to recognize this session. Keep DevTools on the app tab.',
    steps: [
      'First check storage: run the Console commands below one at a time. true means auth_token exists in localStorage; it does not prove any request sent it. The second command lists only cookie names that page JavaScript can read. Array(2) simply means the list contains two items.',
      'Now check transmission: open Network and enter /api/labs/cookie-storage/ in its Filter box. This hides the repeated inspector/read polling requests, which refresh the lab’s evidence display. Clear the visible log, then click “Compare Cookie and Bearer Authentication” once.',
      'Select the profile request. In Headers → Request Headers, look for Cookie. Then open Preview: authenticated tells you whether the server recognized the session; authMethod tells you which mechanism it accepted; user is the fictional profile it returned. These response fields describe the server’s result, not what JavaScript could read.',
      'Select each bearer-profile request in order. Look for Authorization in Request Headers, and compare each response. Record which request has that header and whether it succeeded. Change only this one feature when explaining the difference.',
      'Before running the fixed script harness, predict: can a script send an authenticated request without reading the HttpOnly credential? Run it, then inspect its request and the server’s actual outcome. Use the inspector to compare your observations.',
    ],
    console: "// 1. Is a bearer credential stored? This does not send a request.\nBoolean(localStorage.getItem('auth_token'))\n\n// 2. Which cookie names can page JavaScript read?\ndocument.cookie.split(';').map(x => x.trim().split('=')[0]).filter(Boolean)",
    question: 'Which request needed an explicit bearer header, and why can an already-running same-origin script still act with an HttpOnly cookie?',
  },
  'exp3-secure-transport': {
    setup: 'Sign in on HTTPS, then keep Network open in both the HTTPS and HTTP tabs.',
    steps: [
      'Run the HTTPS probe. Inspect its scheme, Request Headers and response in Network.',
      'Open the HTTP probe in its own tab. Inspect that navigation in Network; do not use a mixed-content fetch from the HTTPS Console.',
      'Compare cookie names sent on each request with Application → Cookies. Use the inspector to confirm the server saw the requests.',
    ],
    question: 'Which diagnostic cookie was withheld on HTTP, and what does Secure change about transmission?',
  },
  'exp4-scope-boundaries': {
    setup: 'Issue scoped cookies, then inspect the app and sibling tabs separately.',
    steps: [
      'In Application → Cookies, compare Domain and Path for each scoped cookie. Run the two path probes and inspect their Cookie request headers in Network.',
      'Open the sibling site and its own DevTools. Compare its cookie evidence with its Local storage. Run the safe origin read below in each tab.',
      'Return to the app and compare the app and sibling requests in the inspector.',
    ],
    console: "({ origin: location.origin, marker: localStorage.getItem('app_specific_secret') })",
    question: 'Which state crossed the sibling host boundary, and which stayed isolated by origin?',
  },
  'exp5-expiration-lifecycles': {
    setup: 'Issue the lifecycle cookies and keep Application → Cookies visible.',
    steps: [
      'Record which cookies have an Expires/Max-Age value and which show a session lifetime. Probe immediately and inspect Network.',
      'Wait more than five seconds. Refresh Application, run the probe again, and compare browser cookie presence with the server response.',
      'Log out, probe once more, and separate browser removal from server-side invalidation.',
    ],
    console: "document.cookie.split(';').map(x => x.trim().split('=')[0]).filter(Boolean)",
    question: 'What changed after time passed, and what changed only after explicit logout?',
  },
  'exp1-samesite-modes': {
    setup: 'Configure one cookie mode and open the attacker source page in a second tab.',
    steps: [
      'In Application → Cookies on the app tab, inspect SameSite and Secure for the session cookie.',
      'From the attacker tab, use its top-level link or request control. In Network, inspect the resulting app request and its Cookie header.',
      'Repeat with another mode and compare the inspector’s source context and authentication result.',
    ],
    question: 'For which navigation did the browser send a session cookie, and how did SameSite change that?',
  },
  'exp2-csrf-top-level-post': {
    setup: 'Configure a cookie mode and use the attacker page’s form controls.',
    steps: [
      'Submit the cross-site form to the vulnerable endpoint. In Network, inspect method, Origin, Cookie and response status.',
      'Repeat against the protected endpoint, then change the cookie mode and retry.',
      'Refresh the fictional profile and compare actual state changes with inspector decisions. A form submission does not require CORS read access.',
    ],
    question: 'Which condition stopped the update: cookie withholding, endpoint defense, or both?',
  },
  'exp3-csrf-top-level-get': {
    setup: 'Choose SameSite=Lax and open the attacker page.',
    steps: [
      'Use its top-level GET link. In Network, inspect method, Cookie header, source tab and response.',
      'Refresh the fictional profile to check whether the state actually changed.',
      'Compare with a protected POST control in the inspector; identify why a state-changing GET is unsafe.',
    ],
    question: 'Why can a Lax cookie accompany this navigation even though the source is cross-site?',
  },
  'exp4-csrf-tokens': {
    setup: 'Configure a session, then use both the legitimate action and attacker form.',
    steps: [
      'Run the legitimate action. In Network, find the csrf-token response and subsequent POST body or header.',
      'Submit the attacker form to the token-protected endpoint and inspect its request and response.',
      'Compare the server’s authentication and CSRF decisions in the inspector. Do not copy a real token to another site.',
    ],
    question: 'Was the rejected request unauthenticated, missing a valid CSRF token, or both?',
  },
  'exp5-origin-validation': {
    setup: 'Use the legitimate action and the attacker page against the origin-protected endpoint.',
    steps: [
      'In Network, inspect the browser-supplied Origin for each POST and the response status.',
      'Compare the exact scheme, host and port with the app origin. Check the fictional profile for a real update.',
      'Use the inspector to distinguish an Origin rejection from a missing cookie.',
    ],
    console: 'location.origin',
    question: 'Which exact Origin was accepted, and why is a sibling host a different origin?',
  },
  'exp6-sibling-vs-attacker': {
    setup: 'Open both source pages and their own DevTools; keep the app inspector available.',
    steps: [
      'In Console on each source page, read location.origin. Compare the hosts and their registrable site names.',
      'Run the same source-page request from the sibling and attacker tabs. Inspect Cookie, Origin and Sec-Fetch-Site in Network.',
      'Check the inspector and fictional profile state. Separate browser SameSite behavior from server Origin validation.',
    ],
    console: 'location.origin',
    question: 'How can the sibling be same-site while still being cross-origin to the app?',
  },
  'jwt-decode': {
    setup: 'Sign in as the fictional member and keep the original signed JWT for a control.',
    steps: [
      'In Network, inspect the login response and the Authorization header on a profile request. Treat the token as dummy lab data.',
      'In Console, decode only the payload with the snippet below. Change the role in the workbench, keep the old signature and send to both dashboards.',
      'Compare status, authentication and directory access in Network and the inspector. Restore the signed token for a positive control.',
    ],
    console: "JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(document.querySelector('textarea[aria-label=\"Working JWT\"]')?.value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/') || ''), c => c.charCodeAt(0))))",
    question: 'What can decoding show, and which server action actually proves the signature was verified?',
  },
  'jwt-confusion': {
    setup: 'Issue an RS256 token and use the lab’s public PEM only.',
    steps: [
      'Inspect the unmodified request in Network as a positive control; note its JWT alg and Authorization header.',
      'Use the workbench to prepare the public-key HMAC variant. Send it to both implementations and compare status and authentication in Network.',
      'Change one PEM byte and retry the historical route. Use inspector evidence to explain why the fixed algorithm matters.',
    ],
    question: 'Which verifier accepted the crafted token, and what exact key and algorithm confusion allowed it?',
  },
  'jwt-none': {
    setup: 'Issue a signed dummy token, then prepare the unsigned variant in the workbench.',
    steps: [
      'In Network, compare the signed token and unsigned token Authorization values; inspect the JWT header in the workbench.',
      'Send the unsigned token to historical and protected dashboards. Record status, authentication and directory access.',
      'Send the original signed token to the protected profile as a positive control. Compare with inspector evidence.',
    ],
    question: 'Which three preconditions made the historical unsigned-token result possible?',
  },
  'jwt-storage': {
    setup: 'Issue JWT cookies, then inspect the app origin in Application.',
    steps: [
      'Compare the two JWT cookie rows, including HttpOnly, with the names visible to document.cookie in Console.',
      'Run the cookie profile controls and inspect both Cookie request headers in Network.',
      'Run the same-origin action, inspect its CSRF token request and preference POST, then compare the inspector evidence.',
    ],
    console: "document.cookie.split(';').map(x => x.trim().split('=')[0]).filter(x => x.startsWith('jwt_lab_'))",
    question: 'Why can the HttpOnly JWT authenticate a request even though it is absent from document.cookie?',
  },
  'jwt-size': {
    setup: 'Use only fictional claims. Choose a padding size and request count.',
    steps: [
      'Run the measurement. In Network, compare Authorization header lengths for small and padded tokens.',
      'Use Console to estimate the UTF-8 byte count of one dummy token copied from its own Network request, if useful.',
      'Compare repeated request totals and noisy timing samples in the workbench. State the scope of the measurement.',
    ],
    console: "new TextEncoder().encode('paste-one-dummy-token-here').length",
    question: 'What increased with claim size, and what can these local measurements not establish?',
  },
  'access-files': {
    setup: 'Sign in as Alex in each independent world.',
    steps: [
      'Use the workbench to GET file-alex, then file-sam. Inspect path, Cookie, response status and body in Network.',
      'Repeat in protected. Sign in as Sam there and GET file-sam as a positive control.',
      'Compare the same file ID across actors and worlds in the app history and inspector.',
    ],
    question: 'Did the server authorize the resource owner, or merely accept a valid session and file ID?',
  },
  'access-delete-file': {
    setup: 'Sign in as Alex. Reset between destructive trials to restore dummy files.',
    steps: [
      'DELETE Alex’s own file as a positive control. Inspect the CSRF token request, DELETE method, response and subsequent GET in Network.',
      'After reset, target file-sam in vulnerable and protected worlds. GET the file afterward to verify state.',
      'Compare the same actor and target in the inspector. A CSRF token does not grant ownership.',
    ],
    question: 'Which world checked ownership before deleting, and how did a follow-up GET prove the result?',
  },
  'access-delete-folder': {
    setup: 'Sign in as Alex. Reset between destructive trials.',
    steps: [
      'DELETE folder-sam in the vulnerable world. Inspect the request and response in Network.',
      'GET folder-sam and file-sam afterward. Repeat the same trial in protected; use Sam as a positive control.',
      'Compare folder and contained-file state with inspector evidence.',
    ],
    question: 'Did the folder ownership decision protect both the folder and its contained file?',
  },
  'privilege-role': {
    setup: 'Sign in as Alex in each independent world.',
    steps: [
      'PATCH only displayName first. In Network, inspect the JSON payload and refreshed /me response.',
      'Add role: "admin" in the workbench JSON. Send the PATCH in each world, then GET /me and /admin/users.',
      'Compare request body, stored role and directory result in Network and the inspector. Use Taylor as an admin control.',
    ],
    question: 'Which input field changed persisted authority, and what proves the role came from server state?',
  },
  'privilege-delete': {
    setup: 'Sign in as Alex and use only fictional accounts.',
    steps: [
      'Send DELETE /admin/users/sam before changing any role. Inspect the response and /me in Network.',
      'In vulnerable, PATCH /me with role: "admin", refresh /me, then retry DELETE. Inspect each request and the final directory.',
      'In protected, repeat as Alex, then use Taylor as a legitimate admin control. Compare inspector decisions.',
    ],
    question: 'Which earlier request altered the role that the later delete gate trusted?',
  },
};
