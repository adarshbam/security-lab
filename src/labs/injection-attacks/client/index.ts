import type { LabClientModule } from '../../../shared/contracts/lab.js';
import { injectionManifest } from '../manifest.js';
import { injectionExperiments } from '../experiments/index.js';
import { InjectionLab } from './InjectionLab.js';
export const injectionClientModule: LabClientModule = {
  manifest: injectionManifest, experiments: injectionExperiments,
  // Small synchronous workbench prevents a saved Experiment view shifting after hydration.
  Component: InjectionLab,
};
