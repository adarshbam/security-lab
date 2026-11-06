// Optional tools live only in the ignored cache; see docs/README.md for setup.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { newRun } from '../server/state.ts';
import { lessonDocument } from '../server/document.ts';
import { payloads } from '../model.ts';
process.env.LAB_BUILT = 'true';
const { start } = await import('../../../server/index.ts');
const require = createRequire(import.meta.url);
const resolveAudit = name => pathToFileURL(require.resolve(name, { paths: [path.resolve('.cache/xss-audit')] })).href;
const { default: AxeBuilder } = await import(resolveAudit('@axe-core/playwright'));
const { default: lighthouse } = await import(resolveAudit('lighthouse'));
const output = path.resolve('src/labs/xss-csp/tests/artifacts/audit');
await fs.mkdir(output, { recursive: true });
let server;
try { server = await start(); } catch (error) { if (error.code !== 'EADDRINUSE') throw error; }
const browser = await chromium.launch({ channel: 'chromium', args: ['--remote-debugging-port=9223'] });
// A fresh source-generated document also gets an independent semantic audit. This
// avoids mistaking an older shared server's markup for the currently edited source.
const semanticRun = newRun({ experimentId: 'xss-dom', vector: 'dom', rendering: 'sanitized', policy: 'enforce', payload: 'format' });
const semanticServer = https.createServer({ key: readFileSync('certs/key.pem'), cert: readFileSync('certs/cert.pem') }, (_req, res) => {
  const document = lessonDocument(semanticRun, payloads.format.html);
  res.writeHead(200, { ...document.headers, 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(document.html);
});
await new Promise(resolve => semanticServer.listen(0, '127.0.0.1', resolve));
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const url = 'https://app.security-lab.test:8443/?lab=xss-csp&experiment=xss-reflected';
  await page.goto(url); await page.getByRole('button', { name: 'Explore freely' }).click();
  await page.getByRole('button', { name: 'Create isolated run' }).click();
  await page.getByTitle('Isolated XSS lesson document').waitFor();
  await page.frameLocator('iframe').getByRole('button', { name: 'Run legitimate code' }).waitFor();
  const checks = [];
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Reading theme' }).selectOption(theme);
    for (const width of [375, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const axe = await new AxeBuilder({ page }).include('.xss-lab').exclude('iframe').analyze();
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      checks.push({ theme, width, noOverflow, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
      await page.locator('.xss-lab').screenshot({ path: path.join(output, `${theme}-${width}.png`), style: 'header { position: static !important; }' });
    }
  }
  const lessonPage = await context.newPage();
  const port = semanticServer.address().port;
  await lessonPage.goto(`https://attacker.csrf-lab.test:${port}/#${encodeURIComponent(payloads.format.html)}`);
  await lessonPage.locator('#output strong').waitFor();
  const lessonAudit = await new AxeBuilder({ page: lessonPage }).analyze();
  const lessonViolations = lessonAudit.violations.map(v => ({ id: v.id, impact: v.impact }));
  await fs.writeFile(path.join(output, 'accessibility.json'), JSON.stringify({ checks, lessonViolations, errors }, null, 2));
  const result = await lighthouse(url, { hostname: '127.0.0.1', port: 9223, output: 'json', onlyCategories: ['performance', 'accessibility'], formFactor: 'mobile' });
  await fs.writeFile(path.join(output, 'lighthouse.json'), result.report);
  const metrics = { performance: result.lhr.categories.performance.score * 100, accessibility: result.lhr.categories.accessibility.score * 100,
    lcp: result.lhr.audits['largest-contentful-paint'].numericValue, cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
    failedAudits: Object.values(result.lhr.audits).filter(a => a.score !== null && a.score < 1).map(a => ({ id: a.id, title: a.title })) };
  console.log(JSON.stringify({ checks, lessonViolations, errors, lighthouse: metrics }, null, 2));
} finally { await browser.close(); semanticServer.closeAllConnections(); await new Promise(resolve => semanticServer.close(resolve)); await server?.close(); }
