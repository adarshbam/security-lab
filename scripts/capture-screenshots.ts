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
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
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

    await page.getByRole('button', { name: 'JWT Tokens: Decode, Verify & Exploit', exact: true }).click();
    await unlock(page, 'jwt-decode');
    await page.getByRole('button', { name: 'Sign in / Issue JWT', exact: true }).click();
    const jwtPayload = page.getByRole('textbox', { name: 'Editable payload JSON', exact: true });
    await expect(jwtPayload).toHaveValue(/adarsh/);
    const claims = JSON.parse(await jwtPayload.inputValue());
    await jwtPayload.fill(JSON.stringify({ ...claims, role: 'admin' }, null, 2));
    await page.getByRole('button', { name: 'Apply payload / keep signature', exact: true }).click();
    await page.getByRole('button', { name: 'Send to vulnerable dashboard', exact: true }).click();
    await expect(page.getByTestId('jwt-response').first()).toContainText('"status": 200');
    await page.getByRole('button', { name: 'Send to protected dashboard', exact: true }).click();
    await expect(page.getByTestId('jwt-response').first()).toContainText('"status": 401');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/screenshots/jwt-workbench.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const jwtWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    await page.screenshot({ path: 'docs/screenshots/jwt-mobile.png', fullPage: true });
    if (jwtWidth.scroll > jwtWidth.viewport) throw new Error('JWT workbench overflows: ' + JSON.stringify(jwtWidth));
    for (const width of [375, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
      if (dimensions.scroll > dimensions.viewport) throw new Error(`JWT workbench overflows at ${width}px: ${JSON.stringify(dimensions)}`);
    }
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 844 });
    await page.locator('button.action').first().focus();
    await page.keyboard.press('Tab');
    const appearance = await page.evaluate(() => {
      return {
        light: matchMedia('(prefers-color-scheme: light)').matches,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth,
        focus: getComputedStyle(document.activeElement!).outlineStyle,
      };
    });
    if (!appearance.light || !appearance.reduced || appearance.scroll > appearance.viewport || appearance.focus === 'none') {
      throw new Error('JWT light/reduced-motion check failed: ' + JSON.stringify(appearance));
    }
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/screenshots/jwt-light.png', fullPage: true });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await unlock(page, 'jwt-size');
    await page.getByRole('button', { name: 'Run token-size comparison', exact: true }).click();
    await expect(page.getByTestId('jwt-size-evidence')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/screenshots/jwt-size.png', fullPage: true });
    await page.getByRole('button', { name: 'Compare Outcome & Hypotheses' }).click();
    await page.getByRole('button', { name: 'Proceed to In-Depth Learning & References' }).click();
    await expect(page.getByRole('heading', { name: 'My beginner takeaway' })).toBeVisible();

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
