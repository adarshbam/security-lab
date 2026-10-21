import { test, expect } from '@playwright/test';
import { APP, ATTACKER, SIBLING, reset, openLab2, configure, control, read, latest, observations,
  formAttack, linkAttack } from '../../../../tests/browser.js';

const base = '/api/labs/samesite-csrf';
test.beforeEach(async ({ page }) => { await reset(page); await openLab2(page); });

for (const mode of ['strict', 'lax', 'none'] as const) {
  test('Cross-site top-level POST with explicit SameSite=' + mode, async ({ page, context }) => {
    await configure(page, mode);
    const before = (await read(page, base + '/preferences')).data.preferences;
    // Positive control: first-party browser receives and uses the configured cookie.
    expect((await read(page, base + '/probe')).data.authenticated).toBe(true);
    const text = await formAttack(context, 'vulnerable');
    expect(text).toContain(mode === 'none' ? 'Status: 200' : 'Status: 401');
    const evidence = await latest(page, base + '/update-vulnerable');
    expect(evidence.origin).toBe(ATTACKER);
    expect(evidence.secFetchSite).toBe('cross-site');
    expect(evidence.secFetchMode).toBe('navigate');
    expect(evidence.authResult.authenticated).toBe(mode === 'none');
    expect(evidence.cookies.some(c => c.name === 'session_csrf')).toBe(mode === 'none');
    const after = (await read(page, base + '/preferences')).data.preferences;
    if (mode === 'none') {
      expect(after.email).toBe('attacker-vulnerable@example.test');
      expect(evidence.stateBefore.preferences).toEqual(before);
      expect(evidence.stateAfter.preferences).toEqual(after);
    } else expect(after).toEqual(before);
  });

  test('Cross-site top-level GET probe with explicit SameSite=' + mode, async ({ page, context }) => {
    await configure(page, mode);
    const before = (await read(page, base + '/preferences')).data.preferences;
    await linkAttack(context, 'probe-get');
    const evidence = await latest(page, base + '/probe');
    expect(evidence.secFetchSite).toBe('cross-site');
    expect(evidence.secFetchDest).toBe('document');
    expect(evidence.authResult.authenticated).toBe(mode !== 'strict');
    expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
  });
}

for (const defense of ['token', 'origin', 'combined']) {
  test(defense + ' rejects an authenticated cross-site POST; vulnerable and legitimate controls succeed', async ({ page, context }) => {
    await configure(page, 'none');
    // Vulnerable control proves this browser really transmits the cookie in this context.
    expect(await formAttack(context, 'vulnerable')).toContain('Status: 200');
    await control(page, base + '/reset-preferences');
    const before = (await read(page, base + '/preferences')).data.preferences;
    expect(await formAttack(context, defense)).toContain('Status: 403');
    const evidence = await latest(page, base + '/update-' + defense);
    expect(evidence.authResult.authenticated).toBe(true);
    expect(evidence.cookies.map(c => c.name)).toContain('session_csrf');
    expect(evidence.origin).toBe(ATTACKER);
    expect(evidence.protectionDecision.allowed).toBe(false);
    expect(evidence.stateBefore).toEqual(evidence.stateAfter);
    expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
    await page.getByRole('combobox', { name: 'Endpoint defense' }).selectOption(defense);
    await page.getByRole('button', { name: 'Legitimate Same-Origin Action (Positive Control)' }).click();
    await expect(page.getByTestId('preference-email')).toHaveText('legitimate-learner@security-lab.test');
    const legitimate = await latest(page, base + '/update-' + defense);
    expect(legitimate.origin).toBe(APP);
    expect(legitimate.status).toBe(200);
    expect(legitimate.authResult.authenticated).toBe(true);
  });
}

test('Unsafe GET mutates under Lax; protected GET rejects and preserves state', async ({ page, context }) => {
  await configure(page, 'lax');
  await linkAttack(context, 'unsafe-get');
  expect((await read(page, base + '/preferences')).data.preferences.email).toBe('unsafe-get@example.test');
  const unsafe = await latest(page, base + '/update-get');
  expect(unsafe.authResult.authenticated).toBe(true); expect(unsafe.secFetchSite).toBe('cross-site');
  await control(page, base + '/reset-preferences');
  const before = (await read(page, base + '/preferences')).data.preferences;
  expect(await linkAttack(context, 'protected-get')).toContain('Status: 405');
  expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
});

test('Combined checks independently require a valid token and a legitimate origin', async ({ page, context }) => {
  await configure(page, 'none');
  const csrfToken = (await read(page, base + '/csrf-token')).data.csrfToken;
  const before = (await read(page, base + '/preferences')).data.preferences;
  // The origin is valid here, so only the missing token can reject this authenticated mutation.
  expect((await read(page, base + '/update-combined', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: { email: 'no-token@example.test' } })).status).toBe(403);
  expect((await latest(page, base + '/update-combined')).authResult.authenticated).toBe(true);
  expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
  // Assume a token leak purely to isolate the origin check; the browser still supplies its own cookies and Origin.
  const source = await context.newPage(); await source.goto(ATTACKER);
  await source.evaluate(csrfToken => {
    const form = document.querySelector('form[action$="update-combined"]')!;
    const input = document.createElement('input'); input.type = 'hidden'; input.name = 'csrfToken'; input.value = csrfToken;
    form.append(input);
  }, csrfToken);
  const promise = source.waitForEvent('popup'); await source.locator('button[data-defense="combined"]').click();
  const popup = await promise; await popup.waitForLoadState('domcontentloaded');
  expect(await popup.locator('body').innerText()).toContain('Status: 403');
  const evidence = await latest(page, base + '/update-combined');
  expect(evidence.authResult.authenticated).toBe(true);
  expect(evidence.origin).toBe(ATTACKER); expect(evidence.protectionDecision.reason).toBe('Origin check failed');
  expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
  await popup.close(); await source.close();
  expect((await read(page, base + '/update-combined', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { email: 'both-valid@example.test', csrfToken } })).status).toBe(200);
});

test('Strict permits same-site sibling POST, but exact-origin protection rejects it', async ({ page, context }) => {
  await configure(page, 'strict');
  expect(await formAttack(context, 'vulnerable', SIBLING)).toContain('Status: 200');
  const vulnerable = await latest(page, base + '/update-vulnerable');
  expect(vulnerable.origin).toBe(SIBLING);
  expect(vulnerable.secFetchSite).toBe('same-site');
  expect(vulnerable.authResult.authenticated).toBe(true);
  await control(page, base + '/reset-preferences');
  const before = (await read(page, base + '/preferences')).data.preferences;
  expect(await formAttack(context, 'origin', SIBLING)).toContain('Status: 403');
  const rejected = await latest(page, base + '/update-origin');
  expect(rejected.authResult.authenticated).toBe(true);
  expect(rejected.protectionDecision.reason).toBe('Origin check failed');
  expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
  // Cross-site control differs despite the same HTTP method.
  expect(await formAttack(context, 'vulnerable', ATTACKER)).toContain('Status: 401');
});

test('Wrong, Unicode, missing and previous-session tokens are rejected without mutating state', async ({ page }) => {
  await configure(page, 'none');
  const old = (await read(page, base + '/csrf-token')).data.csrfToken;
  await configure(page, 'none');
  const current = (await read(page, base + '/csrf-token')).data.csrfToken;
  expect(old).not.toBe(current);
  const before = (await read(page, base + '/preferences')).data.preferences;
  for (const csrfToken of [undefined, 'wrong', 'é'.repeat(64), old]) {
    const result = await read(page, base + '/update-token', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: { email: 'invalid@example.test', csrfToken } });
    expect(result.status).toBe(403);
    expect((await latest(page, base + '/update-token')).authResult.authenticated).toBe(true);
    expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
  }
  expect((await read(page, base + '/update-token', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { email: 'valid@example.test', csrfToken: current } })).status).toBe(200);
});

test('A token from a different real browser session cannot authenticate the current session', async ({ page, browser }) => {
  await configure(page, 'none');
  const old = (await read(page, base + '/csrf-token')).data.csrfToken;
  const other = await browser.newContext(); const p = await other.newPage(); await p.goto(APP);
  await control(p, base + '/configure-cookie', { mode: 'none' });
  const before = (await read(p, base + '/preferences')).data.preferences;
  expect((await read(p, base + '/update-token', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: { email: 'wrong-session@example.test', csrfToken: old } })).status).toBe(403);
  expect((await read(p, base + '/preferences')).data.preferences).toEqual(before);
  expect((await read(page, base + '/probe')).data.authenticated).toBe(false); // Reconfiguration also revokes the old session.
  await other.close();
});

test('Null browser origin is rejected after authentication even with a real form submission', async ({ page, context }) => {
  await configure(page, 'none');
  const source = await context.newPage(); await source.goto(ATTACKER);
  await source.evaluate(base => {
    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts', 'allow-forms', 'allow-popups', 'allow-popups-to-escape-sandbox');
    iframe.srcdoc = '<form method="POST" target="_blank" action="https://app.security-lab.test:8443' + base +
      '/update-origin"><input name="email" value="null-origin@example.test"><button>Submit opaque-origin form</button></form>';
    document.body.append(iframe);
  }, base);
  const popupPromise = context.waitForEvent('page');
  await source.frameLocator('iframe').getByRole('button', { name: 'Submit opaque-origin form' }).click();
  const popup = await popupPromise; await popup.waitForLoadState('domcontentloaded');
  expect(await popup.locator('body').innerText()).toContain('Status: 403');
  const evidence = await latest(page, base + '/update-origin');
  expect(evidence.origin).toBe('null'); expect(evidence.authResult.authenticated).toBe(true);
  expect(evidence.stateBefore).toEqual(evidence.stateAfter);
  await popup.close(); await source.close();
});

test('CORS hides a same-site fetch response even though the vulnerable server mutation succeeds', async ({ page, context }) => {
  await configure(page, 'strict');
  const sibling = await context.newPage(); await sibling.goto(SIBLING + '/?experimentId=exp6-sibling-vs-attacker');
  await sibling.getByRole('button', { name: 'Send credentialed fetch' }).click();
  await expect(sibling.locator('#fetchResult')).toContainText('Browser-side response access error');
  const evidence = await latest(page, base + '/update-vulnerable');
  expect(evidence.method).toBe('POST'); expect(evidence.status).toBe(200);
  expect(evidence.secFetchMode).toBe('cors'); expect(evidence.secFetchSite).toBe('same-site');
  expect(evidence.origin).toBe(SIBLING); expect(evidence.authResult.authenticated).toBe(true);
  expect((await read(page, base + '/preferences')).data.preferences.email).toBe('fetch-attempt@example.test');
  expect((await observations(page)).some(o => o.method === 'OPTIONS' && o.path === base + '/update-vulnerable')).toBe(false);
  await sibling.close();
});

for (const mode of ['strict', 'lax', 'none'] as const) {
  test('Embedded and fetch probes report actual cookie behavior under ' + mode, async ({ page, context }, testInfo) => {
    await configure(page, mode);
    const before = (await read(page, base + '/preferences')).data.preferences;
    const source = await context.newPage(); await source.goto(ATTACKER + '/?experimentId=exp1-samesite-modes');
    await source.getByRole('button', { name: 'Load iframe probe' }).click();
    await expect.poll(async () => (await observations(page)).some(o => o.path === base + '/probe' && o.secFetchDest === 'iframe')).toBe(true);
    const frame = (await observations(page)).find(o => o.path === base + '/probe' && o.secFetchDest === 'iframe')!;
    expect(frame.secFetchSite).toBe('cross-site');
    if (mode !== 'none') expect(frame.authResult.authenticated).toBe(false);
    expect((await read(page, base + '/preferences')).data.preferences).toEqual(before);
    await source.getByRole('button', { name: 'Send credentialed fetch' }).click();
    await expect(source.locator('#fetchResult')).toContainText('Browser-side response access error');
    const fetchObservation = await latest(page, base + '/update-vulnerable');
    expect(fetchObservation.secFetchSite).toBe('cross-site');
    if (mode !== 'none') expect(fetchObservation.authResult.authenticated).toBe(false);
    expect(fetchObservation.status).toBe(fetchObservation.authResult.authenticated ? 200 : 401);
    const after = (await read(page, base + '/preferences')).data.preferences;
    expect(after.email).toBe(fetchObservation.authResult.authenticated ? 'fetch-attempt@example.test' : before.email);
    // None behavior is privacy-policy dependent. Attach actual evidence rather than silently skipping a case.
    await testInfo.attach('cookie-policy-observations', { body: JSON.stringify({ mode, frame, fetchObservation }, null, 2), contentType: 'application/json' });
    await source.close();
  });
}

test('Control endpoints reject real cross-origin forms; inspector never discloses token values', async ({ page, context }) => {
  await configure(page, 'none');
  const cookies = await context.cookies(APP);
  const token = (await read(page, base + '/csrf-token')).data.csrfToken;
  await formAttack(context, 'vulnerable');
  const log = JSON.stringify(await observations(page));
  expect(log).not.toContain(token);
  for (const cookie of cookies) expect(log).not.toContain(cookie.value);
  const source = await context.newPage(); await source.goto(ATTACKER);
  await source.evaluate(base => {
    const form = document.createElement('form'); form.action = 'https://app.security-lab.test:8443' + base + '/reset';
    form.method = 'POST'; form.target = '_blank'; const button = document.createElement('button'); button.textContent = 'Attack reset';
    form.append(button); document.body.append(form);
  }, base);
  const promise = source.waitForEvent('popup'); await source.getByRole('button', { name: 'Attack reset' }).click();
  const popup = await promise; await popup.waitForLoadState('domcontentloaded');
  expect(await popup.locator('body').innerText()).toContain('missing_admin_header');
  expect((await read(page, base + '/probe')).data.authenticated).toBe(true);
  await popup.close(); await source.close();
});
