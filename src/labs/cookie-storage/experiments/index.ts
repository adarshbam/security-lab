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
