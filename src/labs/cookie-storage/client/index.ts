import type { LabClientModule } from '../../../shared/contracts/lab.js';
import { cookieStorageManifest } from '../manifest.js';
import { cookieStorageExperiments } from '../experiments/index.js';
import { CookieStorageLab } from './CookieStorageLab.js';

export const cookieStorageClientModule: LabClientModule = {
  manifest: cookieStorageManifest,
  experiments: cookieStorageExperiments,
  Component: CookieStorageLab,
};
