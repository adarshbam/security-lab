import { lazy } from 'react';
import type { LabClientModule } from '../../../shared/contracts/lab.js';
import { jwtManifest } from '../manifest.js';
import { jwtExperiments } from '../experiments/index.js';

const JwtLab = lazy(() => import('./JwtLab.js').then(module => ({ default: module.JwtLab })));

export const jwtClientModule: LabClientModule = { manifest: jwtManifest, experiments: jwtExperiments, Component: JwtLab };
