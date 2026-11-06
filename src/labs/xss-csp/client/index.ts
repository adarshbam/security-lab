import { lazy } from 'react';
import type { LabClientModule } from '../../../shared/contracts/lab.js';
import { xssManifest } from '../manifest.js';
import { xssExperiments } from '../experiments/index.js';
const XssLab = lazy(() => import('./XssLab.js').then(module => ({ default: module.XssLab })));
export const xssClientModule: LabClientModule = { manifest: xssManifest, experiments: xssExperiments, Component: XssLab };
