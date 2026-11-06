import { test, expect, type Page } from '@playwright/test';
import { APP, control, observations } from '../../../../tests/browser.js';

const base = '/api/labs/broken-access-control';
type World = 'vulnerable' | 'protected';
async function call(page: Page, world: World, method: string, path: string, body?: object, experimentId = 'access-files') {
  return page.evaluate(async ({ world, method, path, body, experimentId }) => {
    const prefix = `/api/labs/broken-access-control/${world}`;
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

test('Alex reads Sam’s file only in the vulnerable world; Sam is a protected owner control', async ({ page, browser }) => {
  await login(page, 'vulnerable', 'alex'); await login(page, 'protected', 'alex');
  expect((await call(page, 'vulnerable', 'GET', '/files/file-alex')).status).toBe(200);
  const disclosed = await call(page, 'vulnerable', 'GET', '/files/file-sam');
  expect(disclosed.status).toBe(200);
  expect(disclosed.data.file.ownerId).toBe('sam');
  const denied = await call(page, 'protected', 'GET', '/files/file-sam');
  expect(denied.status).toBe(404);
  expect(denied.data.actor).toEqual({ id: 'alex', role: 'member' });
  const context = await browser.newContext();
  try { const sam = await context.newPage(); await sam.goto(APP); await login(sam, 'protected', 'sam');
    expect((await call(sam, 'protected', 'GET', '/files/file-sam')).status).toBe(200);
  } finally { await context.close(); }
  const rows = await observations(page, 'access-files');
  expect(rows.find(row => row.path.endsWith('/protected/files/file-sam') && row.status === 404)?.authResult.identity).toBe('alex (member)');
});

test('Alex deletes Sam’s file only in the vulnerable world; protected owner can delete it', async ({ page, browser }) => {
  await login(page, 'vulnerable', 'alex'); await login(page, 'protected', 'alex');
  expect((await call(page, 'vulnerable', 'DELETE', '/files/file-alex', undefined, 'access-delete-file')).status).toBe(200);
  const exposed = await call(page, 'vulnerable', 'DELETE', '/files/file-sam', undefined, 'access-delete-file');
  expect(exposed.status).toBe(200);
  expect((await call(page, 'vulnerable', 'GET', '/files/file-sam', undefined, 'access-delete-file')).status).toBe(404);
  expect((await call(page, 'protected', 'DELETE', '/files/file-sam', undefined, 'access-delete-file')).status).toBe(404);
  expect((await call(page, 'protected', 'GET', '/files/file-sam', undefined, 'access-delete-file')).status).toBe(404);
  const context = await browser.newContext();
  try { const sam = await context.newPage(); await sam.goto(APP); await login(sam, 'protected', 'sam');
    expect((await call(sam, 'protected', 'GET', '/files/file-sam', undefined, 'access-delete-file')).status).toBe(200);
    expect((await call(sam, 'protected', 'DELETE', '/files/file-sam', undefined, 'access-delete-file')).status).toBe(200);
  } finally { await context.close(); }
  const rows = await observations(page, 'access-delete-file');
  const vulnerableDelete = rows.find(row => row.path.endsWith('/vulnerable/files/file-sam') && row.method === 'DELETE');
  const protectedDenial = rows.find(row => row.path.endsWith('/protected/files/file-sam') && row.method === 'DELETE' && row.status === 404);
  expect(vulnerableDelete?.stateBefore.files.some((file: { id: string }) => file.id === 'file-sam')).toBe(true);
  expect(vulnerableDelete?.stateAfter.files.some((file: { id: string }) => file.id === 'file-sam')).toBe(false);
  expect(protectedDenial?.stateAfter.files.some((file: { id: string }) => file.id === 'file-sam')).toBe(true);
  expect(protectedDenial?.protectionDecision.allowed).toBe(false);
  await control(page, base + '/reset');
  await login(page, 'vulnerable', 'alex');
  expect((await call(page, 'vulnerable', 'GET', '/files/file-sam')).status).toBe(200);
});

test('folder delete checks owner before cascade; CSRF remains required', async ({ page, browser }) => {
  await login(page, 'vulnerable', 'alex'); await login(page, 'protected', 'alex');
  const missingToken = await page.evaluate(async () => {
    const response = await fetch('/api/labs/broken-access-control/protected/folders/folder-sam', { method: 'DELETE' });
    return response.status;
  });
  expect(missingToken).toBe(403);
  expect((await call(page, 'protected', 'DELETE', '/folders/folder-sam', undefined, 'access-delete-folder')).status).toBe(404);
  expect((await call(page, 'vulnerable', 'DELETE', '/folders/folder-sam', undefined, 'access-delete-folder')).status).toBe(200);
  expect((await call(page, 'vulnerable', 'GET', '/folders/folder-sam', undefined, 'access-delete-folder')).status).toBe(404);
  expect((await call(page, 'vulnerable', 'GET', '/files/file-sam', undefined, 'access-delete-folder')).status).toBe(404);
  const context = await browser.newContext();
  try { const sam = await context.newPage(); await sam.goto(APP); await login(sam, 'protected', 'sam');
    expect((await call(sam, 'protected', 'GET', '/folders/folder-sam', undefined, 'access-delete-folder')).status).toBe(200);
    expect((await call(sam, 'protected', 'DELETE', '/folders/folder-sam', undefined, 'access-delete-folder')).status).toBe(200);
    expect((await call(sam, 'protected', 'GET', '/files/file-sam', undefined, 'access-delete-folder')).status).toBe(404);
  } finally { await context.close(); }
});

test('file workbench supports guided evidence and free comparison; responsive keyboard focus works', async ({ page }) => {
  await page.getByRole('button', { name: 'Broken Access Control', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Record Your Prediction' }).click();
  await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeEnabled();
  await page.getByRole('radio').first().check(); await page.getByRole('button', { name: 'Proceed to Experiment' }).click();
  await page.getByRole('button', { name: 'Sign in to selected world' }).click();
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeEnabled();
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByTestId('access-response')).toContainText('Sam’s fictional private launch plan');
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Your observation and reasoning' }).fill('Network returned Sam’s file for Alex in vulnerable; the resource ID was accepted without an owner check.');
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeEnabled();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.getByRole('button', { name: 'Send request' }).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toBe('none');
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Compare Outcome & Hypotheses' }).click();
  await expect(page.getByTestId('defender-replay')).toContainText('same file or folder request');
  await expect(page.getByText('Actual file read and owner check')).toBeVisible();
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Return to experiment and retry' }).click();
  await page.locator('.access-lab select').first().selectOption('protected');
  await page.getByRole('button', { name: 'Sign in to selected world' }).click();
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByTestId('access-response')).toContainText('File unavailable to this account');
  const replay = (await observations(page, 'access-files')).find(row => row.path.endsWith('/protected/files/file-sam'));
  expect(replay?.status).toBe(404);
  expect(replay?.authResult.identity).toBe('alex (member)');
  await page.getByRole('button', { name: 'Compare Outcome & Hypotheses' }).click();
  await page.getByRole('button', { name: 'Proceed to In-Depth Learning & References' }).click();
  await expect(page.getByText('Horizontal access')).toBeVisible();
});

test('each lab reset revokes only its own sessions and state', async ({ page }) => {
  await control(page, '/api/labs/privilege-escalation/reset');
  await login(page, 'vulnerable', 'alex');
  await page.evaluate(async () => {
    const prefix = '/api/labs/privilege-escalation/vulnerable';
    const login = await fetch(prefix + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'alex' }) });
    if (!login.ok) throw new Error('Privilege login failed');
    const csrf = await (await fetch(prefix + '/csrf-token')).json();
    const update = await fetch(prefix + '/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrfToken }, body: JSON.stringify({ role: 'admin' }) });
    if (!update.ok) throw new Error('Privilege update failed');
  });
  await control(page, base + '/reset');
  expect((await call(page, 'vulnerable', 'GET', '/me')).status).toBe(401);
  const privilegeRole = await page.evaluate(async () => (await (await fetch('/api/labs/privilege-escalation/vulnerable/me')).json()).user.role);
  expect(privilegeRole).toBe('admin');
  await login(page, 'vulnerable', 'alex');
  await control(page, '/api/labs/privilege-escalation/reset');
  expect((await call(page, 'vulnerable', 'GET', '/me')).status).toBe(200);
  expect((await call(page, 'vulnerable', 'GET', '/files/file-sam')).status).toBe(200);
});
