import type { LabClientModule } from '../../../shared/contracts/lab.js';
import { samesiteCsrfManifest } from '../manifest.js';
import { samesiteCsrfExperiments } from '../experiments/index.js';
import { SameSiteCsrfLab } from './SameSiteCsrfLab.js';

export const samesiteCsrfClientModule: LabClientModule = {
  manifest: samesiteCsrfManifest,
  experiments: samesiteCsrfExperiments,
  Component: SameSiteCsrfLab,
};
