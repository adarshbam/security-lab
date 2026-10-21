import { lookup } from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
import https from 'node:https';
import { X509Certificate } from 'node:crypto';
import { chromium } from '@playwright/test';
import { hasCertificates, certFile, keyFile, domains } from './generate-cert.js';
import { printPrerequisites } from './prerequisites.js';

export async function portFree(port: number) {
  return await new Promise<boolean>(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
export async function runDoctor() {
  let healthy = true;
  const report = (ok: boolean, text: string) => { console.log(`${ok ? 'OK' : 'FAIL'} ${text}`); if (!ok) healthy = false; };
  report(Number(process.versions.node.split('.')[0]) >= 24, 'Node 24 or newer');
  for (const domain of domains) {
    const addresses = await lookup(domain, { all: true }).catch(() => []);
    report(addresses.length > 0 && addresses.every(a => a.address === '127.0.0.1'), domain + ' resolves only to loopback');
  }
  for (const port of [8443, 8080]) report(await portFree(port), 'Port ' + port + ' is free (stop the lab before doctor)');
  report(hasCertificates(), 'Local certificate and key exist');
  if (hasCertificates()) {
    const cert = new X509Certificate(fs.readFileSync(certFile));
    report(new Date(cert.validTo).getTime() > Date.now() && domains.every(d => Boolean(cert.checkHost(d))), 'Certificate validity and hostnames');
    // A temporary HTTPS listener verifies browser trust without ignoring any TLS errors.
    const server = https.createServer({ cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) },
      (_req, res) => { res.end('security-lab-trust-probe'); });
    let browser;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('No diagnostic port');
      browser = await chromium.launch({ channel: 'chromium' });
      const page = await browser.newPage();
      for (const domain of domains) {
        await page.goto(`https://${domain}:${address.port}`, { timeout: 10000 });
      }
      report(true, 'Playwright Chromium installed; all three HTTPS names trusted');
    } catch (e) {
      report(false, 'Chromium/trusted HTTPS check: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      await browser?.close();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }
  if (!healthy) printPrerequisites();
  return healthy;
}
if (process.argv[1]?.endsWith('doctor.ts')) {
  runDoctor().then(ok => { process.exitCode = ok ? 0 : 1; }).catch(error => { console.error(error); process.exitCode = 1; });
}
