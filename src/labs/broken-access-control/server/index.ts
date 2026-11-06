import type { LabServerModule } from '../../../shared/contracts/lab.js';
import { accessManifest } from '../manifest.js';
import { accessRouter } from './router.js';
import { accessWorlds, resetAccessWorlds } from './state.js';

export const accessServerModule: LabServerModule = {
  manifest: accessManifest,
  router: accessRouter,
  getInitialState: () => ({ vulnerable: accessWorlds.vulnerable.snapshot(), protected: accessWorlds.protected.snapshot() }),
  getState: () => ({ vulnerable: accessWorlds.vulnerable.snapshot(), protected: accessWorlds.protected.snapshot() }),
  resetState: resetAccessWorlds,
};
