import { test, expect } from '@playwright/test';
import { APP, SIBLING, reset, unlock, login, read, control, latest } from '../../../../tests/browser.js';

const base = '/api/labs/cookie-storage';
test.beforeEach(async ({ page }) => { await reset(page); });

test('Wrong predictions allow learning only after an actual experiment; progress is per experiment', async ({ page }) => {
  await page.getByRole('button', { name: 'Next: Record Your Prediction' }).click();
  await expect(page.getByRole('button', { name: 'Proceed to Experiment' })).toBeDisabled();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Proceed to Experiment' }).click();
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeDisabled();
  await login(page);
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeDisabled();
  await expect(page.getByText('Executable Source Code Behind This Experiment')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect JavaScript Storage' }).click();
  await page.getByRole('button', { name: 'Compare Outcome & Hypotheses' }).click();
  await expect(page.getByTestId('comparison-evidence')).toContainText('localStorageCredentialAccessible');
  await expect(page.getByText('Your prediction differs from the reference expectation.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Your prediction differs from the reference expectation.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Select Experiment' }).selectOption('exp2-auth-mechanisms');
  await expect(page.getByRole('button', { name: 'Next: Record Your Prediction' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeDisabled();
});

test('Independent credentials: JS reads localStorage and readable cookie, but cannot read HttpOnly', async ({ page, context }) => {
  await unlock(page, 'exp1-storage-types'); await login(page);
  await page.getByRole('button', { name: 'Inspect JavaScript Storage' }).click();
  const storage = await page.evaluate(() => ({ token: localStorage.getItem('auth_token'), cookies: document.cookie }));
  const cookies = await context.cookies(APP);
  const hidden = cookies.find(c => c.name === 'session_httponly')!;
  const readable = cookies.find(c => c.name === 'session_readable')!;
  expect(hidden.httpOnly).toBe(true); expect(hidden.secure).toBe(true);
  expect(hidden.sameSite).toBe('Lax'); expect(hidden.path).toBe('/');
  expect(hidden.domain).toBe('app.security-lab.test'); expect(hidden.expires).toBe(-1);
  expect(hidden.value).not.toBe(readable.value); expect(hidden.value).not.toBe(storage.token);
  expect(storage.token).toMatch(/^bearer_[a-f0-9]{64}$/);
  expect(storage.cookies).toContain('session_readable=');
  expect(storage.cookies).not.toContain('session_httponly=');
  expect((await read(page, base + '/profile')).data.authMethod).toBe('cookie');
  expect((await read(page, base + '/readable-profile')).status).toBe(200);
});

test('Cookie and bearer endpoints cannot mask each other’s authentication result', async ({ page }) => {
  await unlock(page, 'exp2-auth-mechanisms'); await login(page);
  await page.getByRole('button', { name: 'Compare Cookie and Bearer Authentication' }).click();
  const output = JSON.parse(await page.getByTestId('experiment-output').innerText());
  expect(output.cookieAutomaticallyAttached.status).toBe(200);
  expect(output.bearerNotAutomaticallyAttached.status).toBe(401);
  expect(output.bearerExplicitlyAttached.status).toBe(200);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect((await read(page, base + '/profile', { omit: true, headers: { Authorization: 'Bearer ' + token } })).status).toBe(401);
});

test('Same-origin script obtains a token and mutates state despite HttpOnly and CSRF protection', async ({ page }) => {
  await unlock(page, 'exp2-auth-mechanisms'); await login(page);
  const denied = await read(page, base + '/profile/update', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: { email: 'blocked@example.test' } });
  expect(denied.status).toBe(403);
  expect((await read(page, base + '/profile')).data.user.email).toBe('alice@security-lab.test');
  await page.getByRole('button', { name: 'Execute Injected Script Harness' }).click();
  await expect(page.getByTestId('harness-output')).toContainText('Authenticated action succeeded (Status: 200)');
  expect((await read(page, base + '/profile')).data.user.email).toBe('attacker-controlled@evil.test');
  const evidence = await latest(page, base + '/profile/update');
  expect(evidence.authResult.authenticated).toBe(true);
  expect(evidence.origin).toBe(APP);
  expect(evidence.stateBefore.user).toMatchObject({ email: 'alice@security-lab.test' });
  expect(evidence.stateAfter.user).toMatchObject({ email: 'attacker-controlled@evil.test' });
});

test('Secure cookies arrive on HTTPS and are omitted on HTTP with a non-Secure positive control', async ({ page, context }) => {
  await unlock(page, 'exp3-secure-transport'); await login(page);
  await page.getByRole('button', { name: 'Read HTTPS Probe' }).click();
  const https = JSON.parse(await page.getByTestId('experiment-output').innerText());
  expect(https.data.cookiesReceived).toContain('session_httponly');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Open HTTP Probe Directly (New Tab)' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  const data = JSON.parse(await popup.locator('body').innerText());
  expect(data.receivedCookieNames).toContain('plain_diagnostic');
  for (const name of ['session_httponly', 'session_readable', 'secure_session']) expect(data.receivedCookieNames).not.toContain(name);
  expect(data.secureCookiesOmitted).toBe(true);
  await popup.close();
  const http = await latest(page, '/probe/cookies');
  expect(http.cookies.map(c => c.name)).toContain('plain_diagnostic');
  expect((await context.cookies(APP)).some(c => c.name === 'session_httponly')).toBe(true);
});

test('Actual host, domain, path and localStorage scopes differ', async ({ page, context }) => {
  await unlock(page, 'exp4-scope-boundaries');
  await page.getByRole('button', { name: '1. Issue Scoped Cookies' }).click();
  await expect(page.getByRole('status')).toContainText('Scoped cookies set');
  await page.getByRole('button', { name: '2. Compare Path Probes' }).click();
  const data = JSON.parse(await page.getByTestId('experiment-output').innerText());
  expect(data.matchingPath.data.cookiesReceived).toContain('cookie_path_restricted');
  expect(data.outsidePath.data.cookiesReceived).not.toContain('cookie_path_restricted');
  const sibling = await context.newPage(); await sibling.goto(SIBLING + '/?experimentId=exp4-scope-boundaries');
  const received = JSON.parse(await sibling.locator('#scope-cookies').innerText());
  expect(received).toContain('cookie_parent_domain'); expect(received).not.toContain('cookie_host_only');
  expect(await sibling.evaluate(() => localStorage.getItem('app_specific_secret'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('app_specific_secret'))).toBe('fictional_app_marker');
  await sibling.close();
});

test('Browser expiration and server TTL are independent; localStorage does not expire', async ({ page, context }) => {
  await unlock(page, 'exp5-expiration-lifecycles'); await login(page);
  await page.getByRole('button', { name: 'Set Lifecycle Cookies' }).click();
  await expect(page.getByRole('status')).toContainText('Max-Age=5s');
  const cookies = await context.cookies(APP);
  expect(cookies.find(c => c.name === 'cookie_session_lifecycle')!.expires).toBe(-1);
  expect(cookies.find(c => c.name === 'cookie_persistent_5s')!.expires).toBeGreaterThan(Date.now() / 1000);
  expect((await read(page, base + '/expired-profile')).status).toBe(200);
  await expect.poll(async () => (await read(page, base + '/expired-profile')).status, { timeout: 8000 }).toBe(401);
  expect((await context.cookies(APP)).some(c => c.name === 'server_expiry_session')).toBe(true);
  const expiry = await latest(page, base + '/expired-profile');
  expect(expiry.authResult.authenticated).toBe(false);
  expect(expiry.cookies.map(c => c.name)).toContain('server_expiry_session');
  await expect.poll(async () => (await context.cookies(APP)).some(c => c.name === 'cookie_persistent_5s'), { timeout: 8000 }).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeTruthy();
});

test('Reconfiguration revokes previous credentials held by another real browser context', async ({ page, browser }) => {
  await unlock(page, 'exp1-storage-types'); await login(page);
  const oldBearer = await page.evaluate(() => localStorage.getItem('auth_token'));
  const other = await browser.newContext(); const otherPage = await other.newPage();
  await otherPage.goto(APP); await unlock(otherPage, 'exp1-storage-types'); await login(otherPage);
  expect((await read(page, base + '/profile')).status).toBe(401);
  expect((await read(page, base + '/bearer-profile', { headers: { Authorization: 'Bearer ' + oldBearer } })).status).toBe(401);
  expect((await read(otherPage, base + '/profile')).status).toBe(200);
  await otherPage.getByRole('button', { name: 'Logout / Revoke Session' }).click();
  await expect(otherPage.getByRole('status')).toContainText('Logged out!');
  expect((await read(otherPage, base + '/profile')).status).toBe(401);
  await other.close();
});

test('Reset clears all cookie tuples and only its lab; learning reset is separate', async ({ page, context }) => {
  await unlock(page, 'exp1-storage-types'); await login(page);
  await control(page, base + '/cookies/scope-test');
  await control(page, base + '/cookies/lifecycles');
  await control(page, '/api/labs/samesite-csrf/configure-cookie', { mode: 'none' });
  await page.getByRole('button', { name: 'Inspect JavaScript Storage' }).click();
  await page.getByRole('button', { name: 'Reset Experiment', exact: true }).click();
  await expect(page.getByText('No active session', { exact: true })).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.map(c => c.name)).toEqual(['session_csrf']);
  expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeEnabled();
  await page.getByRole('button', { name: 'Restart Learning Progress' }).click();
  await expect(page.getByRole('button', { name: 'Next: Record Your Prediction' })).toBeVisible();
  expect((await context.cookies()).some(c => c.name === 'session_csrf')).toBe(true);
});
