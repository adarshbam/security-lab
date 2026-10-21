import type { LabServerModule } from '../../../shared/contracts/lab.js';
import { samesiteCsrfManifest } from '../manifest.js';
import { samesiteCsrfRouter } from './router.js';
import { labState } from './state.js';
import { Router } from 'express';
import { experimentConsole } from './console.js';

const consoleRouter = Router();
consoleRouter.get('/', experimentConsole);

export const samesiteCsrfServerModule: LabServerModule = {
  manifest: samesiteCsrfManifest,
  router: samesiteCsrfRouter,
  hostRouters: { sibling: consoleRouter, attacker: consoleRouter },
  getInitialState: () => ({ preferences: labState.getInitialPreferences(), cookieMode: 'lax' }),
  resetState: () => {
    labState.reset();
  },
  getState: () => ({ preferences: labState.preferences, cookieMode: labState.cookieMode }),
};
