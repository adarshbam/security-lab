import { lessonGuidance, topicTerms } from './lesson-guidance.js';
import type { LabClientModule } from './contracts/lab.js';
import { investigations } from './investigations.js';

const challenges: Record<string, string> = {
  'exp1-storage-types': 'Compare session_readable and session_httponly in Application and Console. Explain why a person controlling the browser can see more than page JavaScript.',
  'exp2-auth-mechanisms': 'Repeat the bearer-only request without its Authorization header. Predict the response before sending it.',
  'exp3-secure-transport': 'Repeat the diagnostic on HTTP. Use the non-Secure cookie as a positive control.',
  'exp4-scope-boundaries': 'Change only the target host to the sibling. Predict cookie and localStorage behavior separately.',
  'exp5-expiration-lifecycles': 'Compare a request before logout with one after logout. Explain server revocation separately from cookie expiry.',
  'exp1-samesite-modes': 'Change only SameSite mode and repeat the same top-level request. Record what actually arrived.',
  'exp2-csrf-top-level-post': 'Repeat the same POST with a different protection variant. Compare authentication and mutation separately.',
  'exp3-csrf-top-level-get': 'Compare the unsafe GET with the protected endpoint. Check state rather than relying on page text.',
  'exp4-csrf-tokens': 'Repeat with an absent or invalid CSRF token, then a legitimate token as a positive control.',
  'exp5-origin-validation': 'Compare legitimate and attacker requests to the same protected endpoint.',
  'exp6-sibling-vs-attacker': 'Repeat from the sibling origin. Explain why same-site does not mean same-origin.',
  'jwt-decode': 'Change one authorization claim and compare decode-only and verified routes using the same token.',
  'jwt-confusion': 'Compare the historical verifier with the protected verifier using the same crafted token.',
  'jwt-none': 'Compare the unsigned token with an original signed token. Name the historical verifier preconditions.',
  'jwt-storage': 'Compare a cookie profile request with document.cookie visibility. Separate token format from cookie attributes.',
  'jwt-size': 'Change only padding size. Explain what received header bytes measure and why they do not measure database performance.',
  'access-files': 'Use Sam as the legitimate owner of file-sam in the protected world. Compare with Alex.',
  'access-delete-file': 'Reset, change only the target owner, and verify deletion with a subsequent GET.',
  'access-delete-folder': 'Check both the folder and its contained file after the attempted delete.',
  'privilege-role': 'Compare a display-name-only update with a role update. Verify authority with a fresh request.',
  'privilege-delete': 'Repeat the protected operation as Taylor, the legitimate admin. Explain the positive control.',
};

export function attachTeaching(module: LabClientModule) {
  module.manifest.experiments.forEach(item => { item.title = item.title.replace(/^\d+\.\s*/, ''); });
  for (const experiment of Object.values(module.experiments)) {
    // Modules with experiment-specific teaching own their worked examples and checks.
    if (experiment.teaching) continue;
    const investigation = investigations[experiment.id];
    if (!investigation || !challenges[experiment.id]) throw new Error('Missing teaching content: ' + experiment.id);
    experiment.title = experiment.title.replace(/^\d+\.\s*/, '');
    experiment.teaching = {
      objective: experiment.predictionPrompt,
      prerequisites: experiment.startingConditions,
      terms: experiment.id.startsWith('access-') ? topicTerms.access : experiment.id.startsWith('privilege-') ? topicTerms.privilege : experiment.id.startsWith('jwt-') ? topicTerms.jwt : module.manifest.id === 'samesite-csrf' ? topicTerms.csrf : topicTerms.cookie,
      workedExample: lessonGuidance[experiment.id].example,
      steps: investigation.steps.map((action, i) => ({ id: experiment.id + '-investigate-' + (i + 1), action,
        evidence: i === 0 ? investigation.setup : investigation.question,
        hint: 'Check the selected browser tab and origin, the fictional session, and the exact request. Filter Network to /api/labs/ to hide inspector refresh calls.' })),
      console: investigation.console,
      question: investigation.question,
      challenge: challenges[experiment.id],
      review: 'Without reopening the explanation: ' + investigation.question,
    };
    if (!experiment.predictionOptions.some(option => option.id === 'unsure')) experiment.predictionOptions.push({
      id: 'unsure', label: 'I’m not sure yet.', isCorrect: false,
      explanation: 'Uncertainty is a useful starting point. Use the evidence to construct an explanation, then compare with the reference.',
    });
  }
}
