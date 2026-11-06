import { test, expect } from '@playwright/test';
import { APP, control } from '../../../../tests/browser.js';
import { curriculum } from '../../../shared/curriculum.js';

test('a fresh learner can follow all seven labs and the API uses the same order', async ({ page }) => {
  await page.goto(APP);
  await expect(page.locator('#active-lab-heading')).toHaveText('Broken Access Control');
  const manifests = await control(page, '/api/admin/manifests') as { id: string }[];
  expect(manifests.map(lab => lab.id)).toEqual(curriculum.map(step => step.id));
  await page.getByText('View all 7 labs in order', { exact: true }).click();
  const outline = page.getByRole('navigation', { name: 'Full learning path' });
  await expect(outline.getByRole('listitem')).toHaveCount(7);
  const names = await outline.getByRole('button').allTextContents();
  const headerButtons = page.getByRole('navigation', { name: 'Labs in learning order' }).getByRole('button');
  for (let position = 0; position < names.length; position++) await expect(headerButtons.nth(position)).toHaveAccessibleName(names[position]);
  for (let index = 0; index < curriculum.length; index++) {
    await expect(page.locator('.learning-path-label')).toContainText(`Lab ${String(index + 1).padStart(2, '0')} of 07`);
    const step = curriculum[index];
    for (const prerequisite of step.prerequisites) {
      expect(curriculum.findIndex(item => item.id === prerequisite.id)).toBeLessThan(index);
    }
    const navigation = page.getByRole('navigation', { name: 'Continue learning' });
    if (index < curriculum.length - 1) {
      await navigation.getByRole('button', { name: /^Next:/ }).click();
      await expect(page).toHaveURL(new RegExp('lab=' + curriculum[index + 1].id));
      await expect(page.locator('#active-lab-heading')).toBeFocused();
    } else {
      await expect(navigation.getByRole('button', { name: /^Next:/ })).toHaveCount(0);
      await expect(navigation).toContainText('reached the last lab');
      await navigation.getByRole('button', { name: /^Previous:/ }).click();
      await expect(page).toHaveURL(/lab=xss-csp/);
    }
  }
});

test('saved progress and deep links survive numbering, prerequisite navigation and browser history', async ({ page }) => {
  await page.goto(APP);
  const progress = { 'exployting-jwt-tokens': { 'jwt-none': { currentStep: 'understand', selectedPredictionId: null, attempted: true, unlockedLearn: true, investigationNotes: 'My saved verification evidence.' } } };
  await page.evaluate(progress => {
    localStorage.setItem('security_lab_active_lab', 'exployting-jwt-tokens');
    localStorage.setItem('security_lab_active_exp', 'jwt-none');
    localStorage.setItem('security_lab_learner_progress_v2', JSON.stringify(progress));
  }, progress);
  await page.goto(APP);
  await expect(page.locator('.learning-path-label')).toContainText('Lab 07 of 07');
  await expect(page.getByRole('combobox', { name: 'Select Experiment' })).toHaveValue('jwt-none');
  await page.locator('.learning-path-prerequisites').getByRole('button', { name: /Lab 2/ }).click();
  await expect(page.locator('#active-lab-heading')).toHaveText('Privilege Escalation');
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Select Experiment' })).toHaveValue('jwt-none');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('security_lab_learner_progress_v2') || '{}'))).toEqual(progress);
  await page.goto(APP + '/?lab=cookie-storage&experiment=exp4-scope-boundaries');
  await expect(page.locator('.learning-path-label')).toContainText('Lab 03 of 07');
  await expect(page.getByRole('combobox', { name: 'Select Experiment' })).toHaveValue('exp4-scope-boundaries');
  await page.goto(APP + '/?lab=missing-lab&experiment=missing-experiment');
  await expect(page.locator('.learning-path-label')).toContainText('Lab 01 of 07');
});

test('the curriculum fits four widths, both themes and reduced motion with keyboard access', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const step of curriculum) {
    await page.goto(APP + '/?lab=' + step.id);
    await expect(page.locator('.learning-path')).toBeVisible();
    await page.getByText('View all 7 labs in order', { exact: true }).click();
    await page.getByText('Knowledge and readiness checkpoint', { exact: true }).click();
    await page.getByText('Quick primer: requests, identity and evidence', { exact: true }).click();
    for (const width of [375, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.getByRole('combobox', { name: 'Reading theme' }).selectOption(theme);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${step.id}, ${width}, ${theme}`).toBe(true);
      }
    }
    await page.getByText('View all 7 labs in order', { exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('View all 7 labs in order', { exact: true }).locator('..')).not.toHaveAttribute('open');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('navigation', { name: 'Full learning path' }).getByRole('button').first()).toBeFocused();
    expect(await page.evaluate(() => {
      const element = document.activeElement!;
      const style = getComputedStyle(element);
      return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 && matchMedia('(prefers-reduced-motion: reduce)').matches;
    })).toBe(true);
    expect(await page.locator('.learning-path button').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44))).toBe(true);
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('combobox', { name: 'Choose a lab' }).selectOption('privilege-escalation');
  await expect(page.locator('.learning-path-label')).toContainText('Lab 02 of 07');
});

test('the workbench starts on exploration and retains its working identity across guided stages', async ({ page }) => {
  const profileReads: string[] = [];
  page.on('request', request => { if (request.url().endsWith('/cookie-storage/profile')) profileReads.push(request.url()); });
  await page.goto(APP + '/?lab=cookie-storage');
  await expect(page.locator('.learning-path-label')).toContainText('Lab 03 of 07');
  expect(profileReads).toHaveLength(0);
  await page.getByRole('button', { name: 'Explore freely' }).click();
  await page.getByRole('button', { name: 'Login / Issue Credentials' }).click();
  await expect(page.getByText('Alice Fictional', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name: 'Experiment', exact: true }).click();
  await expect(page.getByText('Alice Fictional', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspect JavaScript Storage' })).toBeEnabled();
});
