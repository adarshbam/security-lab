import type { LabServerModule } from '../../../shared/contracts/lab.js';
import { cookieStorageManifest } from '../manifest.js';
import { cookieStorageRouter } from './router.js';
import { labState } from './state.js';

export const cookieStorageServerModule: LabServerModule = {
  manifest: cookieStorageManifest,
  router: cookieStorageRouter,
  getInitialState: () => ({ user: labState.getInitialUser() }),
  resetState: () => {
    labState.reset();
  },
  getState: () => ({ user: labState.user }),
};
