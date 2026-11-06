import { test, expect } from '@playwright/test';
import { APP, control, read, observations } from '../../../../tests/browser.js';
const base = '/api/labs/injection-attacks';
test.beforeEach(async ({ page }) => {
  await page.goto(`${APP}/?lab=injection-attacks&experiment=injection-sql`);
  await expect(page.getByRole('heading', { name: 'Injection Attacks', exact: true })).toBeVisible();
  await control(page, base + '/reset');
  await control(page, '/api/inspector/clear');
});
test('all three pairs execute local attacks, legitimate controls, isolated sessions and redacted evidence', async ({ page, context }) => {
  const fixtures = [
    { engine: 'sql', attack: { username: "sam' --", password: 'wrong' }, legitimate: { username: 'sam', password: 'cedar-path' }, identity: 'sam', denied: 401 },
    { engine: 'nosql', attack: { username: { $ne: '' }, password: { $ne: '' } }, legitimate: { username: 'alex', password: 'paper-lantern' }, identity: 'alex', denied: 400 },
    { engine: 'coercion', attack: { username: 'pin-demo', password: false }, legitimate: { username: 'pin-demo', password: '0' }, identity: 'pin-demo', denied: 400 },
  ];
  for (const fixture of fixtures) {
    for (const world of ['vulnerable', 'protected']) {
      const prefix = `${base}/${fixture.engine}/${world}`;
      const login = (body: object) => read(page, prefix + '/login', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
      expect((await login(fixture.legitimate)).status).toBe(200);
      expect((await read(page, prefix + '/me')).data.actor.id).toBe(fixture.identity);
      const attack = await login(fixture.attack);
      expect(attack.status).toBe(world === 'vulnerable' ? 200 : fixture.denied);
      const me = await read(page, prefix + '/me');
      expect(me.status).toBe(world === 'vulnerable' ? 200 : 401);
      expect(me.data.actor?.id || null).toBe(world === 'vulnerable' ? fixture.identity : null);
      expect((await login(fixture.legitimate)).status).toBe(200);
      expect((await read(page, prefix + '/me')).data.actor.id).toBe(fixture.identity);
    }
  }
  const rows = await observations(page);
  expect(rows.filter(row => row.path.endsWith('/login'))).toHaveLength(18);
  expect(rows.some(row => row.stateAfter.evaluation?.types.password === 'boolean')).toBe(true);
  expect(rows.some(row => row.stateAfter.evaluation?.queryStructure.includes('$ne'))).toBe(true);
  expect(JSON.stringify(rows)).not.toContain('paper-lantern');
  expect(JSON.stringify(rows)).not.toContain('cedar-path');
  expect((await context.cookies()).filter(cookie => cookie.name.startsWith('injection_')).every(cookie => cookie.httpOnly && cookie.secure && cookie.sameSite === 'Strict' && cookie.path.startsWith(base))).toBe(true);
  await control(page, base + '/reset');
  for (const fixture of fixtures) for (const world of ['vulnerable', 'protected']) expect((await read(page, `${base}/${fixture.engine}/${world}/me`)).status).toBe(401);
});
test('workbench action explanations, editable JSON, identity checks and stable navigation', async ({ page }) => {
  await page.getByRole('button', { name: 'Explore freely' }).click();
  await page.getByRole('button', { name: 'Load attack example', exact: true }).click();
  await page.getByRole('button', { name: 'Send login', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Latest:' })).toContainText('HTTP 200');
  const evidence = page.getByRole('region', { name: 'Redacted login evidence' });
  await expect(evidence).toContainText('"id": "alex"');
  await page.getByRole('combobox', { name: 'Implementation', exact: true }).selectOption('protected');
  await page.getByRole('button', { name: 'Send login', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Latest:' })).toContainText('HTTP 401');
  await page.getByRole('button', { name: 'Load legitimate example', exact: true }).click();
  await page.getByRole('button', { name: 'Send login', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Latest:' })).toContainText('HTTP 200');
  await page.getByLabel('Select Experiment').selectOption('injection-nosql');
  await expect(page).toHaveURL(/experiment=injection-nosql/);
  await page.getByRole('button', { name: 'Explore freely' }).click();
  await expect(page.getByLabel('Login JSON')).toBeVisible();
});
test('reject cross-origin login, unsupported Content-Type and unknown implementations', async ({ page }) => {
  const form = await page.evaluate(async path => {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=alex&password=paper-lantern' });
    return response.status;
  }, base + '/nosql/vulnerable/login');
  expect(form).toBe(415);
  expect((await read(page, base + '/other/vulnerable/me')).status).toBe(404);
  await page.goto('https://attacker.csrf-lab.test:8443');
  const target = APP + base + '/sql/vulnerable/login';
  const response = page.waitForResponse(response => response.url() === target);
  await page.evaluate(target => { const form = document.createElement('form'); form.method = 'POST'; form.action = target; document.body.append(form); form.submit(); }, target);
  expect((await response).status()).toBe(403);
});
test('four viewports, both themes, reduced motion, keyboard focus and no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Explore freely' }).click();
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Reading theme').selectOption(theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByLabel('Login JSON')).toBeVisible();
      const sizes = await page.locator('.injection-lab button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      expect(sizes.every(height => height >= 44)).toBe(true);
    }
  }
  await page.getByLabel('Login JSON').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Send login', exact: true })).toBeFocused();
  expect(await page.getByRole('button', { name: 'Send login', exact: true }).evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'src/labs/injection-attacks/docs/workbench-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'src/labs/injection-attacks/docs/workbench-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
