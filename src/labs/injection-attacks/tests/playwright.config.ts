import { defineConfig } from '@playwright/test';
import shared from '../../../../playwright.config.js';
import { fileURLToPath } from 'node:url';
const server = Array.isArray(shared.webServer) ? shared.webServer[0] : shared.webServer;
export default defineConfig({ ...shared, testDir: '.', testMatch: 'injection.spec.ts', webServer: { ...server!, cwd: fileURLToPath(new URL('../../../../', import.meta.url)), env: { LAB_BUILT: 'true' }, reuseExistingServer: true } });
