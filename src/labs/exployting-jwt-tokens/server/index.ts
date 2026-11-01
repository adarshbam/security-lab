import type { LabServerModule } from '../../../shared/contracts/lab.js';
import { jwtManifest } from '../manifest.js';
import { jwtRouter } from './router.js';
import { jwtState } from './state.js';

export const jwtServerModule: LabServerModule = {
  manifest: jwtManifest, router: jwtRouter,
  getInitialState: () => ({ adminReads: 0, profileReads: 0, preference: 'blue' }),
  resetState: () => jwtState.reset(), getState: () => jwtState.snapshot(),
};
