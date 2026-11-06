import { test, expect, type Page } from '@playwright/test';
import { APP, control, observations, unlock } from '../../../../tests/browser.js';

const base = '/api/labs/privilege-escalation';
type World = 'vulnerable' | 'protected';
async function call(page: Page, world: World, method: string, path: string, body?: object, experimentId = 'privilege-role') {
  return page.evaluate(async ({ world, method, path, body, experimentId }) => {
    const prefix = `/api/labs/privilege-escalation/${world}`;
    const headers: Record<string, string> = { 'X-Experiment-Id': experimentId };
    if (body) headers['Content-Type'] = 'application/json';
    if (method !== 'GET' && path !== '/login') {
      const token = await fetch(prefix + '/csrf-token');
      if (token.ok) headers['X-CSRF-Token'] = (await token.json()).csrfToken;
    }
    const response = await fetch(prefix + path, { method, headers, body: body && JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }, { world, method, path, body, experimentId });
}
async function login(page: Page, world: World, userId: string) {
  expect((await call(page, world, 'POST', '/login', { userId })).status).toBe(200);
}
test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await control(page, base + '/reset');
  await control(page, '/api/inspector/clear');
});

test('mass assignment persists role, protected field allowlist keeps member out of admin', async ({ page, browser }) => {
  await login(page, 'vulnerable', 'alex'); await login(page, 'protected', 'alex');
  for (const world of ['vulnerable', 'protected'] as const) {
    expect((await call(page, world, 'PATCH', '/me', { displayName: 'A. Rivera' }, 'privilege-role')).status).toBe(200);
  }
  const escalated = await call(page, 'vulnerable', 'PATCH', '/me', { displayName: 'Alex Rivera', role: 'admin' }, 'privilege-role');
  expect(escalated.status).toBe(200);
  expect((await call(page, 'vulnerable', 'GET', '/me', undefined, 'privilege-role')).data.user.role).toBe('admin');
  expect((await call(page, 'vulnerable', 'GET', '/admin/users', undefined, 'privilege-role')).status).toBe(200);
  for (const field of ['role', 'id', 'ownerId']) {
    expect((await call(page, 'protected', 'PATCH', '/me', { displayName: 'Alex', [field]: 'admin' }, 'privilege-role')).status).toBe(400);
  }
  expect((await call(page, 'protected', 'GET', '/me', undefined, 'privilege-role')).data.user.role).toBe('member');
  expect((await call(page, 'protected', 'GET', '/admin/users', undefined, 'privilege-role')).status).toBe(403);
  const adminContext = await browser.newContext();
  try {
    const admin = await adminContext.newPage(); await admin.goto(APP);
    await login(admin, 'protected', 'taylor');
    expect((await call(admin, 'protected', 'GET', '/admin/users', undefined, 'privilege-role')).status).toBe(200);
  } finally { await adminContext.close(); }
  const rows = await observations(page, 'privilege-role');
  expect(rows.find(row => row.path.endsWith('/vulnerable/me') && row.method === 'PATCH')?.requestBody?.role).toBe('admin');
});

test('member denial, escalated per-user deletes, session revocation, self guard and reset', async ({ page, browser }) => {
  await login(page, 'vulnerable', 'alex'); await login(page, 'protected', 'alex');
  const samContext = await browser.newContext();
  try {
    const sam = await samContext.newPage(); await sam.goto(APP); await login(sam, 'vulnerable', 'sam');
    expect((await call(page, 'vulnerable', 'DELETE', '/admin/users/sam', undefined, 'privilege-delete')).status).toBe(403);
    expect((await call(page, 'protected', 'DELETE', '/admin/users/sam', undefined, 'privilege-delete')).status).toBe(403);
    await call(page, 'vulnerable', 'PATCH', '/me', { role: 'admin' }, 'privilege-delete');
    expect((await call(page, 'vulnerable', 'GET', '/me', undefined, 'privilege-delete')).data.user.role).toBe('admin');
    expect((await call(page, 'vulnerable', 'DELETE', '/admin/users/alex', undefined, 'privilege-delete')).status).toBe(403);
    for (const id of ['sam', 'jordan', 'morgan', 'taylor']) {
      expect((await call(page, 'vulnerable', 'DELETE', `/admin/users/${id}`, undefined, 'privilege-delete')).status).toBe(200);
    }
    expect((await call(sam, 'vulnerable', 'GET', '/me', undefined, 'privilege-delete')).status).toBe(401);
    const directory = await call(page, 'vulnerable', 'GET', '/admin/users', undefined, 'privilege-delete');
    expect(directory.data.users.map((user: { id: string }) => user.id)).toEqual(['alex']);
    const adminContext = await browser.newContext();
    try {
      const admin = await adminContext.newPage(); await admin.goto(APP); await login(admin, 'protected', 'taylor');
      expect((await call(admin, 'protected', 'DELETE', '/admin/users/sam', undefined, 'privilege-delete')).status).toBe(200);
    } finally { await adminContext.close(); }
    await control(page, base + '/reset');
    expect((await call(page, 'vulnerable', 'GET', '/me', undefined, 'privilege-delete')).status).toBe(401);
    await login(page, 'vulnerable', 'alex');
    expect((await call(page, 'vulnerable', 'GET', '/me', undefined, 'privilege-delete')).data.user.role).toBe('member');
    expect((await call(page, 'protected', 'GET', '/me', undefined, 'privilege-delete')).status).toBe(401);
  } finally { await samContext.close(); }
});

test('mutations require a session-bound CSRF token and exact app Origin; control header gives no fictional role', async ({ page, browser }) => {
  await login(page, 'protected', 'alex');
  const before = await call(page, 'protected', 'GET', '/me');
  const noToken = await page.evaluate(async () => {
    const response = await fetch('/api/labs/privilege-escalation/protected/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Security-Lab-Admin': 'true' },
      body: JSON.stringify({ displayName: 'Illicit edit', role: 'admin' }),
    });
    return { status: response.status, data: await response.json() };
  });
  expect(noToken.status).toBe(403);
  expect((await call(page, 'protected', 'GET', '/me')).data.user).toEqual(before.data.user);
  expect((await call(page, 'protected', 'GET', '/admin/users')).status).toBe(403);
  const siblingContext = await browser.newContext();
  try {
    const sibling = await siblingContext.newPage();
    await sibling.goto('https://sibling.security-lab.test:8443');
    const response = await sibling.evaluate(async () => {
      const form = document.createElement('form');
      form.method = 'POST'; form.action = 'https://app.security-lab.test:8443/api/labs/privilege-escalation/protected/login';
      const field = document.createElement('input'); field.name = 'userId'; field.value = 'alex'; form.append(field);
      document.body.append(form);
      return await new Promise<string>(resolve => {
        const frame = document.createElement('iframe'); frame.name = 'login-target'; document.body.append(frame);
        form.target = frame.name;
        frame.onload = () => resolve(frame.contentDocument?.body?.textContent || 'cross-origin response');
        form.submit();
      });
    });
    expect(response).toContain('cross-origin response');
    const rows = await observations(page);
    expect(rows.find(row => row.path === `${base}/protected/login` && row.origin === 'https://sibling.security-lab.test:8443')?.status).toBe(403);
  } finally { await siblingContext.close(); }
});

test('bulk demo action needs fresh role confirmation and sends separate deletes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: 'Privilege Escalation', exact: true }).click();
  await unlock(page, 'privilege-delete');
  await page.getByRole('button', { name: 'Sign in to selected world' }).click();
  const bulk = page.getByRole('button', { name: 'Delete remaining demo users' });
  await expect(bulk).toBeDisabled();
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByTestId('privilege-response')).toContainText('Current role is not admin');
  await page.getByRole('combobox', { name: 'Method' }).selectOption('PATCH');
  await page.getByRole('combobox', { name: 'Path after /vulnerable' }).fill('/me');
  await page.getByRole('textbox', { name: 'Supplied JSON' }).fill('{"displayName":"Alex Rivera","role":"admin"}');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByTestId('privilege-response')).toContainText('"role": "admin"');
  await expect(bulk).toBeDisabled();
  await page.getByRole('button', { name: 'Refresh server identity' }).click();
  await expect(bulk).toBeEnabled();
  await bulk.click();
  await expect(page.getByRole('button', { name: 'Confirm demo deletion' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm demo deletion' }).click();
  await expect(page.locator('section[aria-label="Privilege response history"] summary').filter({ hasText: 'DELETE /admin/users/' })).toHaveCount(5);
  await expect(page.locator('section[aria-label="Privilege response history"] summary').first()).toContainText('GET /admin/users · HTTP 200');
  const directory = await call(page, 'vulnerable', 'GET', '/admin/users', undefined, 'privilege-delete');
  expect(directory.data.users.map((user: { id: string }) => user.id)).toEqual(['alex']);
  await page.getByRole('textbox', { name: 'Your observation and reasoning' }).fill('Network showed the earlier PATCH storing admin, then the delete gate used that server-side role.');
  await page.getByRole('button', { name: 'Compare Outcome & Hypotheses' }).click();
  await expect(page.getByText('Permission reference')).toBeVisible();
  await expect(page.getByText('Actual role check, self guard and revocation')).toBeVisible();
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const next = page.getByRole('button', { name: 'Proceed to In-Depth Learning & References' });
  await next.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toBe('none');
  expect(errors).toEqual([]);
});

test('module reset preserves a credential in the JWT lab', async ({ page }) => {
  const issued = await page.evaluate(async () => {
    const response = await fetch('/api/labs/exployting-jwt-tokens/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Security-Lab-Admin': 'true' },
      body: JSON.stringify({ username: 'adarsh', password: 'pass123' }),
    });
    return response.json();
  });
  const profile = async () => page.evaluate(async token => {
    const response = await fetch('/api/labs/exployting-jwt-tokens/decode/dashboard/protected?view=profile', { headers: { Authorization: `Bearer ${token}` } });
    return response.status;
  }, issued.token);
  expect(await profile()).toBe(200);
  await login(page, 'vulnerable', 'alex');
  await control(page, base + '/reset');
  expect((await call(page, 'vulnerable', 'GET', '/me')).status).toBe(401);
  expect(await profile()).toBe(200);
});
