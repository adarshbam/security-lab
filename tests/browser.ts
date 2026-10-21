import { expect, type Page, type BrowserContext } from '@playwright/test';
import type { ExperimentObservation } from '../src/shared/contracts/inspector.js';

export const APP = 'https://app.security-lab.test:8443';
export const ATTACKER = 'https://attacker.csrf-lab.test:8443';
export const SIBLING = 'https://sibling.security-lab.test:8443';
export async function control(page: Page, path: string, body: object = {}) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Security-Lab-Admin': 'true' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error('Control request failed: ' + response.status);
    return response.json();
  }, { path, body });
}
export async function read(page: Page, path: string, options: { method?: string; body?: object; headers?: Record<string, string>; omit?: boolean } = {}) {
  return page.evaluate(async ({ path, options }) => {
    const response = await fetch(path, { method: options.method || 'GET', credentials: options.omit ? 'omit' : 'same-origin',
      headers: options.headers,
      ...(options.body && { body: JSON.stringify(options.body) }) });
    return { status: response.status, data: await response.json() };
  }, { path, options });
}
export async function reset(page: Page) {
  await page.goto(APP);
  await expect(page.getByRole('button', { name: 'Next: Record Your Prediction' })).toBeVisible();
  await control(page, '/api/labs/cookie-storage/reset');
  await control(page, '/api/labs/samesite-csrf/reset');
  await control(page, '/api/inspector/clear');
}
export async function unlock(page: Page, experiment: string) {
  await page.getByRole('combobox', { name: 'Select Experiment' }).selectOption(experiment);
  await page.getByRole('button', { name: 'Next: Record Your Prediction' }).click();
  await page.getByRole('radio').first().check(); // Incorrect guesses must still allow learning.
  await page.getByRole('button', { name: 'Proceed to Experiment' }).click();
}
export async function login(page: Page) {
  await page.getByRole('button', { name: 'Login / Issue Credentials' }).click();
  await expect(page.getByText('Alice Fictional', { exact: true })).toBeVisible();
}
export async function openLab2(page: Page, experiment = 'exp2-csrf-top-level-post') {
  await page.getByRole('button', { name: 'SameSite & Cross-Site Request Forgery (CSRF)', exact: true }).click();
  await unlock(page, experiment);
}
export async function configure(page: Page, mode: 'strict' | 'lax' | 'none') {
  const label = mode === 'strict' ? 'SameSite=Strict' : mode === 'lax' ? 'SameSite=Lax (Explicit)' : 'SameSite=None (Requires Secure)';
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByRole('status')).toContainText('SameSite=' + mode.toUpperCase());
}
export async function observations(page: Page, experimentId?: string): Promise<ExperimentObservation[]> {
  return control(page, '/api/inspector/read' + (experimentId ? '?experimentId=' + experimentId : ''));
}
export async function latest(page: Page, path: string) {
  await expect.poll(async () => (await observations(page)).some(o => o.path === path)).toBe(true);
  return (await observations(page)).find(o => o.path === path)!;
}
export async function formAttack(context: BrowserContext, defense: string, source = ATTACKER, experiment = 'exp2-csrf-top-level-post') {
  const sourcePage = await context.newPage();
  await sourcePage.goto(source + '/?experimentId=' + experiment);
  const popupPromise = sourcePage.waitForEvent('popup');
  await sourcePage.locator('button[data-defense="' + defense + '"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  const text = await popup.locator('body').innerText();
  await popup.close(); await sourcePage.close();
  return text;
}
export async function linkAttack(context: BrowserContext, vector: string, modeSource = ATTACKER, experiment = 'exp3-csrf-top-level-get') {
  const sourcePage = await context.newPage(); await sourcePage.goto(modeSource + '/?experimentId=' + experiment);
  const popupPromise = sourcePage.waitForEvent('popup');
  await sourcePage.locator('a[data-vector="' + vector + '"]').click();
  const popup = await popupPromise; await popup.waitForLoadState('domcontentloaded');
  const text = await popup.locator('body').innerText();
  await popup.close(); await sourcePage.close(); return text;
}
