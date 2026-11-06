import { test, expect, type Page } from '@playwright/test';
import { APP, control, observations } from '../../../../tests/browser.js';
import type { Payload, Policy, Rendering, RunView } from '../model.js';
import { XSS_ORIGIN, payloads } from '../model.js';
const base = '/api/labs/xss-csp';
type Created = { run: RunView; url: string };
async function create(page: Page, experimentId = 'xss-reflected', rendering: Rendering = 'vulnerable', policy: Policy = 'absent', payload: Payload = 'handler'): Promise<Created> {
  return control(page, base + '/runs', { experimentId, rendering, policy, payload });
}
async function mount(page: Page, created: Created) {
  const responsePromise = page.waitForResponse(r => r.url().split('#')[0] === created.url.split('#')[0] && r.request().resourceType() === 'document');
  await page.evaluate(url => {
    document.querySelector('#test-lesson')?.remove();
    const frame = document.createElement('iframe'); frame.id = 'test-lesson'; frame.title = 'Test lesson';
    frame.sandbox.add('allow-scripts', 'allow-same-origin'); frame.src = url; document.body.appendChild(frame);
  }, created.url);
  const response = await responsePromise;
  const frame = page.frameLocator('#test-lesson');
  await expect(frame.getByRole('button', { name: 'Run legitimate code' })).toBeVisible();
  return { frame, response };
}
const state = (page: Page, created: Created): Promise<RunView> => control(page, base + '/state', { id: created.run.id });

test.beforeEach(async ({ page }) => {
  await page.goto(APP + '/?lab=xss-csp&experiment=xss-reflected');
  await expect(page.getByRole('heading', { name: 'XSS Attacks & CSP', exact: true })).toBeVisible();
  await control(page, base + '/reset');
  for (const experimentId of ['xss-reflected', 'xss-stored', 'xss-dom', 'xss-csp']) await control(page, '/api/inspector/clear?experimentId=' + experimentId);
});

test('reflected and stored inputs really execute; protected text and sanitized HTML do not', async ({ page }) => {
  test.setTimeout(90000);
  for (const experiment of ['xss-reflected', 'xss-stored']) {
    for (const rendering of ['vulnerable', 'protected', 'sanitized'] as const) {
      const created = await create(page, experiment, rendering);
      const { frame, response } = await mount(page, created);
      expect(response.headers()['content-security-policy']).toBeUndefined();
      await frame.getByRole('button', { name: 'Run legitimate code' }).click();
      await expect.poll(async () => (await state(page, created)).legitimate).toBe(1);
      await frame.getByRole('button', { name: 'Inspect dummy state' }).click();
      await expect(frame.locator('#evidence')).toContainText('readableCookieNames');
      const observed = await state(page, created);
      expect(observed.attacker).toBe(rendering === 'vulnerable' ? 1 : 0);
      expect(observed.mutations).toBe(observed.attacker);
      if (rendering === 'protected') expect(await response.text()).toContain('&lt;svg');
      expect(await frame.locator('#output').locator('svg').count()).toBe(rendering === 'vulnerable' ? 1 : 0);
    }
  }
  const saved = await create(page, 'xss-stored'); await mount(page, saved); await mount(page, saved);
  expect((await state(page, saved)).visits).toBe(2);
  const rows = await observations(page, 'xss-stored');
  const mutation = rows.find(r => r.path.endsWith('/marker') && r.stateAfter.mutations === 1);
  expect(mutation?.authResult.authenticated).toBe(true);
  expect(mutation?.cookies.every(cookie => cookie.redactedValue === '[REDACTED]')).toBe(true);
  expect(JSON.stringify(rows)).not.toContain('xss_session=');
});

test('DOM fragment never reaches server; innerHTML script is inert but event handler executes', async ({ page }) => {
  const reflected = await create(page, 'xss-reflected', 'vulnerable', 'absent', 'script');
  const reflectedFrame = await mount(page, reflected);
  await reflectedFrame.frame.getByRole('button', { name: 'Run legitimate code' }).click();
  await expect.poll(async () => (await state(page, reflected)).attacker).toBe(1);
  for (const payload of ['script', 'handler'] as const) {
    const created = await create(page, 'xss-dom', 'vulnerable', 'absent', payload);
    const { frame, response } = await mount(page, created);
    expect(response.request().url()).not.toContain('#');
    expect(await response.text()).toContain('<div id="output"></div>');
    await frame.getByRole('button', { name: 'Run legitimate code' }).click();
    await expect.poll(async () => (await state(page, created)).legitimate).toBe(1);
    await expect(frame.locator('#output')).toHaveJSProperty('innerHTML', payload === 'script' ? payloads.script.html : '<svg onload="mark(\'attacker\')"></svg>');
    expect((await state(page, created)).attacker).toBe(payload === 'handler' ? 1 : 0);
  }
  for (const rendering of ['protected', 'sanitized'] as const) {
    const created = await create(page, 'xss-dom', rendering);
    const { frame } = await mount(page, created);
    await frame.getByRole('button', { name: 'Run legitimate code' }).click();
    await expect.poll(async () => (await state(page, created)).legitimate).toBe(1);
    expect((await state(page, created)).attacker).toBe(0);
  }
  const format = await create(page, 'xss-dom', 'sanitized', 'enforce', 'format');
  const { frame } = await mount(page, format);
  await expect(frame.locator('#output strong')).toHaveText('Fictional release notes');
});

test('real CSP headers distinguish unsafe, report-only and enforcement, preserving nonce code', async ({ page, context }) => {
  const messages: string[] = []; page.on('console', message => messages.push(message.text()));
  for (const policy of ['unsafe', 'report', 'enforce'] as const) {
    const created = await create(page, 'xss-csp', 'vulnerable', policy);
    const { frame, response } = await mount(page, created);
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain(policy === 'enforce' ? 'nonce-' : "'unsafe-inline'");
    expect(Boolean(headers['content-security-policy-report-only'])).toBe(policy === 'report');
    await frame.getByRole('button', { name: 'Run legitimate code' }).click();
    await expect.poll(async () => (await state(page, created)).legitimate).toBe(1);
    if (policy !== 'unsafe') await expect.poll(async () => (await state(page, created)).reports.some(r => r.directive === 'script-src-attr' && r.disposition === (policy === 'report' ? 'report' : 'enforce'))).toBe(true);
    const observed = await state(page, created);
    expect(observed.attacker).toBe(policy === 'enforce' ? 0 : 1);
    const cookieNames = await frame.locator('body').evaluate(() => document.cookie);
    expect(cookieNames).toContain('xss_readable=fictional'); expect(cookieNames).not.toContain('xss_session');
    expect((await context.cookies(created.url)).find(cookie => cookie.name === 'xss_session')?.httpOnly).toBe(true);
  }
  expect(messages.some(message => /Content Security Policy|script-src/.test(message))).toBe(true);
  const formatted = await create(page, 'xss-csp', 'vulnerable', 'enforce', 'format');
  const { frame } = await mount(page, formatted);
  await expect(frame.locator('#output strong')).toHaveText('Fictional release notes');
});

test('guards deny shell API access, unknown payloads, cross-origin markers and reset revokes runs', async ({ page, context }) => {
  const created = await create(page); await mount(page, created);
  const probe = await context.newPage();
  await probe.goto(created.url);
  const probeStatus = (url: string) => probe.evaluate(async target => (await fetch(target)).status, url);
  expect(await probeStatus(XSS_ORIGIN + '/api/labs/cookie-storage/state')).toBe(404);
  const bad = new URL(created.url); bad.searchParams.set('input', '<script>fetch("https://example.com")</script>');
  expect(await probeStatus(bad.href)).toBe(400);
  const otherOrigin = await page.evaluate(async url => { try { return (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status; } catch { return 'cors'; } }, XSS_ORIGIN + '/runs/' + created.run.id + '/marker');
  expect(otherOrigin).toBe('cors');
  expect((await state(page, created)).mutations).toBeLessThanOrEqual(1);
  await control(page, base + '/reset');
  expect(await probeStatus(created.url)).toBe(404);
  await probe.close();
});

test('deep links, free exploration and workbench controls remain usable at four widths and reduced motion', async ({ page }) => {
  await page.getByRole('button', { name: 'Explore freely' }).click();
  await expect(page.getByRole('combobox', { name: 'Select Experiment' })).toHaveValue('xss-reflected');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Reading theme' }).selectOption(theme);
    for (const width of [375, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const control of await page.locator('.xss-lab button, .xss-lab select').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.getByRole('button', { name: 'Create isolated run' }).focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  expect(await page.getByRole('button', { name: 'Create isolated run' }).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByTitle('Isolated XSS lesson document')).toBeVisible();
  await page.getByRole('button', { name: 'Read actual state' }).click();
  await expect(page.getByRole('heading', { name: 'Recorded observations' })).toBeVisible();
});
