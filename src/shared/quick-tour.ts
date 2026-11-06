export const quickTour = [
  {
    "lab": "broken-access-control",
    "experiment": "access-files",
    "minutes": 3,
    "title": "Read another member’s file",
    "action": "Sign in as Alex in Vulnerable; send GET /files/file-sam. Repeat in Protected, then sign in as Sam and retry.",
    "expected": "Vulnerable returns Sam’s file; Protected denies Alex and allows Sam."
  },
  {
    "lab": "privilege-escalation",
    "experiment": "privilege-role",
    "minutes": 3,
    "title": "Follow a role change",
    "action": "As Alex, send PATCH /me with {\"displayName\":\"Alex Rivera\",\"role\":\"admin\"}. Refresh server identity and request /admin/users. Repeat in Protected; Taylor is the legitimate admin control.",
    "expected": "Vulnerable persists admin; Protected keeps Alex a member and denies the directory."
  },
  {
    "lab": "cookie-storage",
    "experiment": "exp1-storage-types",
    "minutes": 3,
    "title": "Compare browser storage with script access",
    "action": "Issue credentials. Inspect Application → Cookies and Local storage; click Inspect JavaScript Storage.",
    "expected": "HttpOnly is visible in DevTools but absent from document.cookie; localStorage and the readable cookie are script-readable."
  },
  {
    "lab": "samesite-csrf",
    "experiment": "exp2-csrf-top-level-post",
    "minutes": 4,
    "title": "Submit a real cross-site form",
    "action": "Choose SameSite=None, run the legitimate app action, then open the attacker console. Submit its vulnerable form, inspect state, and repeat against combined protection.",
    "expected": "The vulnerable form can mutate with eligible cookies; combined protection rejects the attack while the legitimate control succeeds."
  },
  {
    "lab": "injection-attacks",
    "experiment": "injection-sql",
    "minutes": 4,
    "title": "Compare query text with bound values",
    "action": "Load attack example, send login in Vulnerable, then repeat in Protected. Finally load legitimate example and send in Protected.",
    "expected": "The concatenated query accepts the attack; bound parameters reject it; the legitimate login works."
  },
  {
    "lab": "xss-csp",
    "experiment": "xss-reflected",
    "minutes": 4,
    "title": "Trace input into HTML",
    "action": "Create a Vulnerable run with the handler payload and absent CSP; read actual state. Repeat with encoded text. Run legitimate code in the frame as a control.",
    "expected": "The vulnerable handler executes; encoded text does not. Legitimate code must still work. Inspect the frame, not the shell."
  },
  {
    "lab": "exployting-jwt-tokens",
    "experiment": "jwt-decode",
    "minutes": 5,
    "title": "Decode versus verification",
    "action": "Issue the ordinary-user JWT, edit role to admin, apply payload while keeping signature, and send to both dashboards. Restore the original and request My profile on Protected.",
    "expected": "Decode-only can trust the edited admin claim; Protected rejects its signature. The original signed user token still opens its profile."
  }
];
