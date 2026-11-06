import { lazy } from 'react';
import type { LabClientModule } from '../../../shared/contracts/lab.js';
import { accessManifest } from '../manifest.js';
import { accessExperiments } from '../experiments/index.js';

const AccessLab = lazy(() => import('./AccessLab.js').then(module => ({ default: module.AccessLab })));
export const accessClientModule: LabClientModule = { manifest: accessManifest, experiments: accessExperiments, Component: AccessLab };
