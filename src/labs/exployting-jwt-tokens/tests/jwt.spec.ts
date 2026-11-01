import { test, expect, type Page } from '@playwright/test';
import { APP, control, latest, observations, read, reset, unlock } from '../../../../tests/browser.js';

const base = '/api/labs/exployting-jwt-tokens';
const labTitle = 'JWT Tokens: Decode, Verify & Exploit';

async function openJwt(page: Page, experiment: string) {
  await page.getByRole('button', { name: labTitle, exact: true }).click();
  await unlock(page, experiment);
}

async function issue(page: Page, account = 'adarsh') {
  await page.getByRole('combobox', { name: 'Demo account', exact: true }).selectOption(account);
  await page.getByRole('button', { name: 'Sign in / Issue JWT', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(`token issued for ${account}`);
  return page.getByRole('textbox', { name: 'Working JWT', exact: true }).inputValue();
}

async function editPayload(page: Page, changes: Record<string, unknown>) {
  const editor = page.getByRole('textbox', { name: 'Editable payload JSON', exact: true });
  await editor.fill(JSON.stringify({ ...JSON.parse(await editor.inputValue()), ...changes }, null, 2));
}

async function send(page: Page, scenario: string, variant: 'vulnerable' | 'protected', view = 'admin') {
  await page.getByRole('combobox', { name: 'Requested resource', exact: true }).selectOption(view);
  const button = page.getByRole('button', { name: `Send to ${variant} dashboard`, exact: true });
  const responsePromise = page.waitForResponse(response =>
    new URL(response.url()).pathname === `${base}/${scenario}/dashboard/${variant}` && response.request().method() === 'GET');
  await button.click();
  const response = await responsePromise;
  const data = await response.json();
  await expect(button).toBeEnabled();
  const disclosure = page.locator('section[aria-label="JWT response history"] details').first();
  if (await disclosure.getAttribute('open') === null) await disclosure.locator('summary').click();
  await expect.poll(async () => JSON.parse(await page.getByTestId('jwt-response').first().innerText()))
    .toMatchObject({ status: response.status(), ...data });
  return { status: response.status(), data };
}

test.beforeEach(async ({ page }) => {
  await reset(page);
  await control(page, base + '/reset');
  await control(page, '/api/inspector/clear');
});

test('JWT prediction gate records a real response, not login or token preparation, and survives reload', async ({ page }) => {
  await page.getByRole('button', { name: labTitle, exact: true }).click();
  await page.getByRole('button', { name: 'Next: Record Your Prediction' }).click();
  await expect(page.getByRole('button', { name: 'Proceed to Experiment' })).toBeDisabled();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Proceed to Experiment' }).click();
  const compare = page.getByRole('button', { name: 'Compare Outcome & Hypotheses' });
  await expect(compare).toBeDisabled();
  await page.getByRole('textbox', { name: 'Demo password', exact: true }).fill('wrong-fictional-password');
  await page.getByRole('button', { name: 'Sign in / Issue JWT' }).click();
  await expect(page.getByRole('alert')).toContainText('published fictional lab account');
  await expect(compare).toBeDisabled();
  await page.getByRole('textbox', { name: 'Demo password', exact: true }).fill('pass123');
  await issue(page);
  await editPayload(page, { role: 'admin' });
  await page.getByRole('button', { name: 'Apply payload / keep signature', exact: true }).click();
  await expect(compare).toBeDisabled();
  await expect(page.getByText('Executable implementation', { exact: true })).toHaveCount(0);
  expect((await send(page, 'decode', 'protected')).status).toBe(401);
  const workingToken = await page.getByRole('textbox', { name: 'Working JWT', exact: true }).inputValue();
  await compare.click();
  await expect(page.getByTestId('comparison-evidence')).toContainText('401');
  await expect(page.getByText('Your prediction differs from the reference expectation.')).toBeVisible();
  await page.getByRole('button', { name: 'Experiment', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Working JWT', exact: true })).toHaveValue(workingToken);
  await expect(page.getByTestId('jwt-response').first()).toContainText('401');
  await compare.click();
  await page.reload();
  await expect(page.getByTestId('comparison-evidence')).toContainText('401');
  await page.getByRole('combobox', { name: 'Select Experiment' }).selectOption('jwt-confusion');
  await expect(page.getByRole('button', { name: 'Next: Record Your Prediction' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeDisabled();
});

test('Decode misuse accepts a browser-edited role; verified controls separate authentication and authorization', async ({ page }) => {
  await openJwt(page, 'jwt-decode');
  const original = await issue(page);
  expect((await read(page, base + '/decode/dashboard/protected', { omit: true })).status).toBe(401);
  for (const variant of ['vulnerable', 'protected'] as const) {
    const profile = await send(page, 'decode', variant, 'profile');
    expect(profile.status).toBe(200);
    expect(profile.data.users).toEqual([{ username: 'adarsh', role: 'user', email: 'adarsh@example.test' }]);
    const admin = await send(page, 'decode', variant);
    expect(admin.status).toBe(403);
    expect(admin.data.authenticated).toBe(true);
  }
  expect((await control(page, base + '/state')).adminReads).toBe(0);
  await editPayload(page, { role: 'admin' });
  await page.getByRole('button', { name: 'Apply payload / keep signature', exact: true }).click();
  const edited = await page.getByRole('textbox', { name: 'Working JWT', exact: true }).inputValue();
  expect(edited.split('.')[2]).toBe(original.split('.')[2]);
  expect(edited.split('.')[1]).not.toBe(original.split('.')[1]);
  const accepted = await send(page, 'decode', 'vulnerable');
  expect(accepted.status).toBe(200);
  expect(accepted.data.library).toBe('jsonwebtoken 9.0.3');
  expect(accepted.data.users).toHaveLength(10);
  expect(JSON.stringify(accepted.data.users)).not.toContain('password');
  const allowed = await latest(page, base + '/decode/dashboard/vulnerable');
  expect(allowed.authResult).toMatchObject({ authenticated: true, identity: 'adarsh' });
  expect(allowed.stateAfter.adminReads - allowed.stateBefore.adminReads).toBe(1);
  const rejected = await send(page, 'decode', 'protected');
  expect(rejected.status).toBe(401);
  expect(rejected.data.authenticated).toBe(false);
  const denied = await latest(page, base + '/decode/dashboard/protected');
  expect(denied.authResult.authenticated).toBe(false);
  expect(denied.protectionDecision.allowed).toBe(false);
  expect(denied.stateAfter).toEqual(denied.stateBefore);
  await page.getByRole('button', { name: 'Restore signed token', exact: true }).click();
  expect((await send(page, 'decode', 'protected', 'profile')).status).toBe(200);
  await issue(page, 'rahul');
  expect((await send(page, 'decode', 'protected')).status).toBe(200);
});

test('Historical 4.0.0 uses the actual browser HMAC token; wrong PEM bytes and the fixed verifier reject it', async ({ page }) => {
  await openJwt(page, 'jwt-confusion');
  await issue(page);
  await expect(page.getByTestId('jwt-header')).toContainText('RS256');
  for (const variant of ['vulnerable', 'protected'] as const) {
    expect((await send(page, 'confusion', variant, 'profile')).status).toBe(200);
    expect((await send(page, 'confusion', variant)).status).toBe(403);
  }
  const pem = await page.getByRole('textbox', { name: 'Public PEM used as HMAC input', exact: true }).inputValue();
  expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
  expect(pem).not.toContain('PRIVATE KEY');
  await editPayload(page, { role: 'admin' });
  await page.getByRole('button', { name: 'Sign HS256 with public PEM', exact: true }).click();
  await expect(page.getByTestId('jwt-header')).toContainText('HS256');
  const accepted = await send(page, 'confusion', 'vulnerable');
  expect(accepted.status).toBe(200);
  expect(accepted.data.library).toBe('jsonwebtoken 4.0.0');
  expect(accepted.data.users).toHaveLength(10);
  expect((await send(page, 'confusion', 'protected')).status).toBe(401);
  expect((await latest(page, base + '/confusion/dashboard/protected')).stateAfter.adminReads).toBe(1);
  await page.getByRole('textbox', { name: 'Public PEM used as HMAC input', exact: true }).fill(pem + ' ');
  await page.getByRole('button', { name: 'Sign HS256 with public PEM', exact: true }).click();
  expect((await send(page, 'confusion', 'vulnerable')).status).toBe(401);
  expect((await control(page, base + '/state')).adminReads).toBe(1);
  await issue(page, 'rahul');
  for (const variant of ['vulnerable', 'protected'] as const) {
    expect((await send(page, 'confusion', variant)).status).toBe(200);
  }
});

test('Historical 8.5.1 accepts unsigned claims only on its missing-key route; normal signed controls remain explicit', async ({ page }) => {
  await openJwt(page, 'jwt-none');
  await issue(page);
  expect((await send(page, 'none', 'protected', 'profile')).status).toBe(200);
  expect((await send(page, 'none', 'vulnerable', 'profile')).status).toBe(401);
  await editPayload(page, { role: 'admin' });
  await page.getByRole('button', { name: 'Prepare unsigned token', exact: true }).click();
  await expect(page.getByTestId('jwt-header')).toContainText('none');
  expect((await page.getByRole('textbox', { name: 'Working JWT', exact: true }).inputValue()).split('.')[2]).toBe('');
  const accepted = await send(page, 'none', 'vulnerable');
  expect(accepted.status).toBe(200);
  expect(accepted.data.library).toBe('jsonwebtoken 8.5.1');
  expect(accepted.data.users).toHaveLength(10);
  expect((await send(page, 'none', 'protected')).status).toBe(401);
  await editPayload(page, { exp: 1 });
  await page.getByRole('button', { name: 'Prepare unsigned token', exact: true }).click();
  expect((await send(page, 'none', 'vulnerable')).status).toBe(401);
  expect((await control(page, base + '/state')).adminReads).toBe(1);
  await issue(page, 'rahul');
  expect((await send(page, 'none', 'protected')).status).toBe(200);
});

test('Malformed, unknown-subject and expired tokens fail without reading the directory', async ({ page }) => {
  await openJwt(page, 'jwt-decode');
  await issue(page);
  await page.getByRole('textbox', { name: 'Working JWT', exact: true }).fill('not.a.jwt');
  for (const variant of ['vulnerable', 'protected'] as const) expect((await send(page, 'decode', variant)).status).toBe(401);
  await page.getByRole('button', { name: 'Restore signed token', exact: true }).click();
  await editPayload(page, { sub: 'does-not-exist', role: 'admin' });
  await page.getByRole('button', { name: 'Apply payload / keep signature', exact: true }).click();
  for (const variant of ['vulnerable', 'protected'] as const) expect((await send(page, 'decode', variant)).status).toBe(401);
  await page.getByRole('spinbutton', { name: 'Token lifetime', exact: true }).fill('1');
  const expiring = await issue(page);
  await expect.poll(async () => (await read(page, base + '/decode/dashboard/protected?view=profile', {
    omit: true, headers: { Authorization: 'Bearer ' + expiring },
  })).status, { timeout: 5000 }).toBe(401);
  expect((await send(page, 'decode', 'vulnerable', 'profile')).status).toBe(401);
  expect((await control(page, base + '/state')).adminReads).toBe(0);
});

test('Real JWT cookies hide the independent HttpOnly value; same-origin action still authenticates', async ({ page, context }) => {
  await openJwt(page, 'jwt-storage');
  const issuancePromise = page.waitForResponse(response => new URL(response.url()).pathname === base + '/cookies/login');
  await page.getByRole('button', { name: 'Issue JWT cookies', exact: true }).click();
  const issuance = await (await issuancePromise).json();
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeDisabled();
  const cookies = await context.cookies(APP);
  const readable = cookies.find(cookie => cookie.name === 'jwt_lab_readable')!;
  const hidden = cookies.find(cookie => cookie.name === 'jwt_lab_httponly')!;
  for (const cookie of [readable, hidden]) {
    expect(cookie.secure).toBe(true); expect(cookie.sameSite).toBe('Lax');
    expect(cookie.domain).toBe('app.security-lab.test'); expect(cookie.path).toBe('/');
    expect(cookie.expires).toBe(-1);
  }
  expect(hidden.httpOnly).toBe(true); expect(readable.httpOnly).toBe(false);
  expect(hidden.value).not.toBe(readable.value);
  const jsCookies = await page.evaluate(() => document.cookie);
  expect(jsCookies).toContain('jwt_lab_readable=');
  expect(jsCookies).not.toContain('jwt_lab_httponly=');
  expect(jsCookies).not.toContain(hidden.value);
  expect(JSON.stringify(issuance)).not.toContain(hidden.value);
  expect(JSON.stringify(issuance)).not.toContain(readable.value);
  await page.getByRole('button', { name: 'Inspect JWT cookies & authentication', exact: true }).click();
  await expect(page.getByTestId('jwt-storage-evidence')).toBeVisible();
  const evidence = JSON.parse(await page.getByTestId('jwt-storage-evidence').innerText());
  expect(evidence.readableCredentialAccessible).toBe(true);
  expect(evidence.visibleJwtCookieNames).toEqual(['jwt_lab_readable']);
  expect(evidence.readableCookieAuthentication.status).toBe(200);
  expect(evidence.httpOnlyCookieAuthentication.status).toBe(200);
  const denied = await read(page, base + '/cookies/preference', { method: 'POST' });
  expect(denied.status).toBe(403);
  const rejected = await latest(page, base + '/cookies/preference');
  expect(rejected.authResult.authenticated).toBe(true);
  expect(rejected.stateBefore.preference).toBe('blue');
  expect(rejected.stateAfter.preference).toBe('blue');
  await page.getByRole('button', { name: 'Run fixed same-origin JWT action', exact: true }).click();
  await expect(page.getByTestId('jwt-response')).toContainText('purple');
  const action = await latest(page, base + '/cookies/preference');
  expect(action.origin).toBe(APP);
  expect(action.authResult.authenticated).toBe(true);
  expect(action.stateBefore.preference).toBe('blue'); expect(action.stateAfter.preference).toBe('purple');
  const logs = await observations(page);
  expect(JSON.stringify(logs)).not.toContain(hidden.value);
  expect(JSON.stringify(logs)).not.toContain(readable.value);
  expect(action.cookies).toContainEqual({ name: 'jwt_lab_httponly', present: true, redactedValue: '[REDACTED]' });
});

test('Cookie and bearer routes cannot silently authenticate each other', async ({ page }) => {
  await openJwt(page, 'jwt-storage');
  await page.getByRole('button', { name: 'Issue JWT cookies', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('JWT cookies issued');
  expect((await read(page, base + '/cookies/profile/httponly')).status).toBe(200);
  expect((await read(page, base + '/decode/dashboard/protected?view=profile')).status).toBe(401);
  const issued = await control(page, base + '/login', { username: 'adarsh', password: 'pass123', scenario: 'decode' });
  const bearerOnly = { omit: true, headers: { Authorization: 'Bearer ' + issued.token } };
  expect((await read(page, base + '/decode/dashboard/protected?view=profile', bearerOnly)).status).toBe(200);
  expect((await read(page, base + '/cookies/profile/httponly', bearerOnly)).status).toBe(401);
  expect((await read(page, base + '/cookies/profile/readable', bearerOnly)).status).toBe(401);
  const readableToken = await page.evaluate(() => decodeURIComponent(document.cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('jwt_lab_readable='))!.split('=').slice(1).join('=')));
  expect((await read(page, base + '/decode/dashboard/protected?view=profile', {
    omit: true, headers: { Authorization: 'Bearer ' + readableToken },
  })).status).toBe(401);
});

test('JWT reset revokes old credentials and clears only JWT cookies while preserving learning and other labs', async ({ page, context }) => {
  await control(page, '/api/labs/cookie-storage/login');
  await control(page, '/api/labs/samesite-csrf/configure-cookie', { mode: 'lax' });
  await openJwt(page, 'jwt-storage');
  await page.getByRole('button', { name: 'Issue JWT cookies', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect JWT cookies & authentication', exact: true }).click();
  await expect(page.getByTestId('jwt-storage-evidence')).toBeVisible();
  const issued = await control(page, base + '/login', { username: 'adarsh', password: 'pass123', scenario: 'decode' });
  const oldPem = await page.evaluate(async path => (await fetch(path)).text(), base + '/public-key');
  const reloaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Reset Experiment', exact: true }).click();
  await reloaded;
  await expect(page.getByRole('button', { name: 'Issue JWT cookies', exact: true })).toBeVisible();
  expect((await context.cookies(APP)).filter(cookie => cookie.name.startsWith('jwt_lab_'))).toHaveLength(0);
  expect((await read(page, '/api/labs/cookie-storage/profile')).status).toBe(200);
  expect((await context.cookies(APP)).some(cookie => cookie.name === 'session_csrf')).toBe(true);
  expect((await control(page, base + '/state')).preference).toBe('blue');
  for (const variant of ['vulnerable', 'protected'] as const) {
    expect((await read(page, `${base}/decode/dashboard/${variant}?view=profile`, {
      omit: true, headers: { Authorization: 'Bearer ' + issued.token },
    })).status).toBe(401);
  }
  expect(await page.evaluate(async path => (await fetch(path)).text(), base + '/public-key')).not.toBe(oldPem);
  await expect(page.getByRole('button', { name: 'Compare Outcome & Hypotheses' })).toBeEnabled();
  await page.getByRole('button', { name: 'Restart Learning Progress', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next: Record Your Prediction' })).toBeVisible();
  expect((await read(page, '/api/labs/cookie-storage/profile')).status).toBe(200);
});

test('Logout revokes a token held in another genuine browser context', async ({ page, browser }) => {
  await openJwt(page, 'jwt-confusion');
  const original = await issue(page);
  const peer = await browser.newContext();
  try {
    const other = await peer.newPage();
    await other.goto(APP);
    await openJwt(other, 'jwt-confusion');
    await issue(other, 'rahul');
    expect((await send(page, 'confusion', 'protected', 'profile')).status).toBe(200);
    await other.getByRole('button', { name: 'Logout / Revoke JWTs', exact: true }).click();
    await expect(other.getByRole('status')).toContainText('Logged out.');
    for (const variant of ['vulnerable', 'protected'] as const) {
      expect((await read(page, `${base}/confusion/dashboard/${variant}?view=profile`, {
        omit: true, headers: { Authorization: 'Bearer ' + original },
      })).status).toBe(401);
    }
    await issue(other, 'rahul');
    expect((await send(other, 'confusion', 'protected')).status).toBe(200);
  } finally { await peer.close(); }
});

test('Token-size comparison counts real received bytes and performs no profile lookups', async ({ page }) => {
  await openJwt(page, 'jwt-size');
  await control(page, base + '/cookies/login'); // Measurements must still omit these cookies.
  await page.getByRole('combobox', { name: 'Extra claim bytes', exact: true }).selectOption('4096');
  await page.getByRole('combobox', { name: 'Requests per token', exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Run token-size comparison', exact: true }).click();
  await expect(page.getByTestId('jwt-size-evidence')).toBeVisible();
  const output = JSON.parse(await page.getByTestId('jwt-size-evidence').locator('pre').textContent() || '{}');
  expect(output.samples).toHaveLength(2);
  expect(output.samples[1].tokenBytes).toBeGreaterThan(output.samples[0].tokenBytes + 4096);
  for (const sample of output.samples) {
    expect(sample.requestCount).toBe(5);
    expect(sample.authorizationBytesPerRequest).toBe(sample.tokenBytes + 7);
    expect(sample.totalAuthorizationValueBytes).toBe(sample.authorizationBytesPerRequest * 5);
    expect(sample.verificationSamplesMs).toHaveLength(5);
    expect(sample.verificationSamplesMs.every((value: number) => Number.isFinite(value) && value >= 0)).toBe(true);
    expect(sample.profileReadsAfter).toBe(sample.profileReadsBefore);
  }
  const received = (await observations(page, 'jwt-size')).filter(observation => observation.path === base + '/size/verify');
  expect(received).toHaveLength(10);
  for (const observation of received) {
    expect(observation.status).toBe(200); expect(observation.authResult.authenticated).toBe(true);
    expect(observation.cookies).toHaveLength(0); expect(observation.stateAfter.profileReads).toBe(0);
  }
  await page.getByRole('combobox', { name: 'Requests per token', exact: true }).selectOption('1');
  await expect(page.getByTestId('jwt-size-evidence')).toContainText('Total (5 requests)');
  await page.getByRole('button', { name: 'Run token-size comparison', exact: true }).click();
  await expect(page.getByTestId('jwt-size-evidence')).toContainText('Total (1 requests)');
});
