import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/labs', testMatch: '**/tests/*.spec.ts',
  timeout: 30000, fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://app.security-lab.test:8443',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    // Trusted HTTPS and actual hosts entries are required. No security bypass flags.
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    command: 'node --import tsx src/server/index.ts',
    url: 'http://127.0.0.1:8080/probe/status',
    reuseExistingServer: false, timeout: 30000,
  },
});
