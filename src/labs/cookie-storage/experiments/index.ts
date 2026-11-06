import type { ExperimentDefinition } from '../../../shared/contracts/lab.js';
import { exp1StorageTypes } from './exp1-storage-types.js';
import { exp2AuthMechanisms } from './exp2-auth-mechanisms.js';
import { exp3SecureTransport } from './exp3-secure-transport.js';
import { exp4ScopeBoundaries } from './exp4-scope-boundaries.js';
import { exp5ExpirationLifecycles } from './exp5-expiration-lifecycles.js';
import routerSource from '../server/router.ts?raw';
import harnessSource from '../client/harness.ts?raw';
import { sourceRegion } from '../../../client/source.js';

export const cookieStorageExperiments: Record<string, ExperimentDefinition> = {
  'exp1-storage-types': exp1StorageTypes,
  'exp2-auth-mechanisms': exp2AuthMechanisms,
  'exp3-secure-transport': exp3SecureTransport,
  'exp4-scope-boundaries': exp4ScopeBoundaries,
  'exp5-expiration-lifecycles': exp5ExpirationLifecycles,
};

const regions: Record<string, string> = {
  'exp1-storage-types': 'issue-credentials', 'exp2-auth-mechanisms': 'authentication',
  'exp3-secure-transport': 'issue-credentials', 'exp4-scope-boundaries': 'scope',
  'exp5-expiration-lifecycles': 'lifecycles',
};
for (const experiment of Object.values(cookieStorageExperiments)) {
  experiment.codeSnippets = [sourceRegion(routerSource, regions[experiment.id], 'Actual Express implementation')];
}
exp2AuthMechanisms.codeSnippets.push({ title: 'Actual browser script harness', language: 'typescript', code: harnessSource });
exp1StorageTypes.defenderReplay = 'Retry the browser read after issuing credentials. Compare the readable cookie and localStorage names with the absent HttpOnly cookie in document.cookie, then check that the HttpOnly cookie still authenticates a normal profile request. HttpOnly limits direct reads; it does not disable same-origin requests.';
exp2AuthMechanisms.defenderReplay = 'Retry the fixed same-origin script and inspect the authenticated profile update. Its HttpOnly cookie remains unreadable to JavaScript, but the browser still attaches it to same-origin requests. Preventing script execution is a separate defense.';
exp3SecureTransport.defenderReplay = 'Repeat the HTTPS and HTTP probes. The Secure cookies should reach HTTPS and be absent from HTTP, while the non-Secure diagnostic marker proves the HTTP request could carry a cookie.';
exp4ScopeBoundaries.defenderReplay = 'Repeat the path probes and sibling-origin visit with the same cookie setup. Compare which cookie names the server receives; Path and Domain govern transmission, but Path is not a JavaScript security boundary.';
exp5ExpirationLifecycles.defenderReplay = 'Probe before and after expiry, then log out and probe again. Compare browser cookie presence with server authentication; a cookie remaining in the browser does not mean the server still accepts it.';
