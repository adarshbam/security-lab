import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  timeout: 30000, workers: 1, fullyParallel: false,
  use: { baseURL: 'https://app.security-lab.test:8443', channel: 'chromium', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  testDir: '.', testMatch: 'xss.spec.ts',
  outputDir: './artifacts/results', reporter: [['list']],
  webServer: { command: 'node --import tsx src/server/index.ts', cwd: fileURLToPath(new URL('../../../../', import.meta.url)),
    env: { LAB_BUILT: 'true' },
    url: 'http://127.0.0.1:8080/probe/status', reuseExistingServer: true, timeout: 30000 },
});
