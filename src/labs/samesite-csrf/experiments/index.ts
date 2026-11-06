import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';
import { exp1SameSiteModes } from './exp1-samesite-modes.js';
import { exp2CsrfTopLevelPost } from './exp2-csrf-top-level-post.js';
import { exp3CsrfTopLevelGet } from './exp3-csrf-top-level-get.js';
import { exp4CsrfTokens } from './exp4-csrf-tokens.js';
import { exp5OriginValidation } from './exp5-origin-validation.js';
import { exp6SiblingVsAttacker } from './exp6-sibling-vs-attacker.js';
import routerSource from '../server/router.ts?raw';
import originSource from '../server/csrf.ts?raw';
import consoleSource from '../server/console.ts?raw';
import { sourceRegion } from '../../../client/source.js';

export const samesiteCsrfExperiments: Record<string, ExperimentDefinition> = {
  'exp1-samesite-modes': exp1SameSiteModes,
  'exp2-csrf-top-level-post': exp2CsrfTopLevelPost,
  'exp3-csrf-top-level-get': exp3CsrfTopLevelGet,
  'exp4-csrf-tokens': exp4CsrfTokens,
  'exp5-origin-validation': exp5OriginValidation,
  'exp6-sibling-vs-attacker': exp6SiblingVsAttacker,
};

for (const experiment of Object.values(samesiteCsrfExperiments)) {
  experiment.codeSnippets = [sourceRegion(routerSource, 'configure', 'Actual cookie configuration'),
    sourceRegion(routerSource, 'mutations', 'Actual vulnerable and protected endpoints')];
}
exp5OriginValidation.codeSnippets.push(sourceRegion(originSource, 'origin-check', 'Actual exact-origin validation'));
exp6SiblingVsAttacker.codeSnippets.push({ title: 'Actual source-site request console', language: 'typescript', code: consoleSource });
for (const experiment of Object.values(samesiteCsrfExperiments)) {
  experiment.defenderReplay = 'Keep the same cookie mode and source page, then retry the request against the relevant protected endpoint. Check the inspector for the Origin, received cookie, authentication result, HTTP status and unchanged preference state. Use the legitimate same-origin action on that endpoint as a positive control. A CORS response error alone does not prove the server rejected a mutation.';
}
exp1SameSiteModes.defenderReplay = 'Repeat the read-only probes under Strict, Lax and None. Compare which requests carry the session cookie, then try a mutation separately: SameSite behavior depends on the request context and does not replace an application CSRF check.';
exp3CsrfTopLevelGet.defenderReplay = 'Replay the top-level GET against the protected GET endpoint. It should return 405 without changing preferences. A same-origin POST to a protected mutation endpoint remains the legitimate positive control.';
