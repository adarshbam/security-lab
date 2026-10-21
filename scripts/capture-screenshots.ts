import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { start } from '../src/server/index.js';
import { APP, ATTACKER, SIBLING, unlock, login, openLab2, configure, formAttack } from '../tests/browser.js';

async function capture() {
  const server = await start();
  let browser;
  try {
    fs.mkdirSync('docs/screenshots', { recursive: true });
    browser = await chromium.launch({ channel: 'chromium' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(APP);
    await expect(page.getByRole('button', { name: 'Next: Record Your Prediction' })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });
    await unlock(page, 'exp2-auth-mechanisms'); await login(page);
    await page.getByRole('button', { name: 'Execute Injected Script Harness' }).click();
    await expect(page.getByTestId('harness-output')).toContainText('Status: 200');
    await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Fixed same-origin script harness' }) })
      .screenshot({ path: 'docs/screenshots/lab1-script-harness.png' });
    await openLab2(page); await configure(page, 'none');
    await formAttack(context, 'vulnerable');
    await page.getByRole('button', { name: 'Refresh Profile State' }).click();
    await expect(page.getByTestId('preference-email')).toHaveText('attacker-vulnerable@example.test');
    await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeEnabled();
    await page.screenshot({ path: 'docs/screenshots/lab2-samesite-csrf.png', fullPage: true });
    for (const [name, origin] of [['attacker', ATTACKER], ['sibling', SIBLING]]) {
      const source = await context.newPage(); await source.goto(origin);
      await expect(source.getByRole('button', { name: 'Send credentialed fetch' })).toBeVisible();
      await source.screenshot({ path: 'docs/screenshots/' + name + '-console.png', fullPage: true });
      await source.close();
    }
    // Review the learning explanation and a mobile layout as part of the manual flow check.
    await page.getByRole('button', { name: 'Compare Outcome & Hypotheses' }).click();
    await expect(page.getByRole('heading', { name: 'Compare prediction, evidence and reference' })).toBeVisible();
    await page.getByRole('button', { name: 'Proceed to In-Depth Learning & References' }).click();
    await expect(page.getByRole('heading', { name: 'Step 5: Architectural Breakdown & Authoritative References' })).toBeVisible();
    const mobile = await context.newPage(); await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.goto(APP);
    const width = await mobile.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    await mobile.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
    if (width.scroll > width.viewport) throw new Error('Mobile page overflows: ' + JSON.stringify(width));
    if (errors.length) throw new Error('Unexpected page errors: ' + errors.join('; '));
    console.log('Saved real-browser screenshots; desktop, mobile and five-stage journeys reviewed.');
  } finally { await browser?.close(); await server.close(); }
}
capture().catch(error => { console.error(error); process.exitCode = 1; });
