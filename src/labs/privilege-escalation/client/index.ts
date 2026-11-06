import { lazy } from 'react';
import type { LabClientModule } from '../../../shared/contracts/lab.js';
import { privilegeManifest } from '../manifest.js';
import { privilegeExperiments } from '../experiments/index.js';

const PrivilegeLab = lazy(() => import('./PrivilegeLab.js').then(module => ({ default: module.PrivilegeLab })));
export const privilegeClientModule: LabClientModule = { manifest: privilegeManifest, experiments: privilegeExperiments, Component: PrivilegeLab };
