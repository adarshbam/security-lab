import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import type { Server } from 'node:net';
import { createApp } from './app.js';
import { createHttpProbeApp } from './hosts/http-probe.js';
import { hasCertificates, certFile, keyFile } from '../../scripts/generate-cert.js';

async function listen(server: Server, port: number) {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}
export async function start() {
  if (!hasCertificates()) throw new Error('Trusted certificates are missing. Run npm run setup first.');
  const server = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) });
  // Validate WebSocket requests before Vite's HMR handler sees them.
  server.prependListener('upgrade', (request, socket) => {
    if (request.headers.host !== 'app.security-lab.test:8443' ||
        request.headers.origin !== 'https://app.security-lab.test:8443' ||
        Object.keys(request.headers).some(h => h === 'forwarded' || h.startsWith('x-forwarded-'))) socket.destroy();
  });
  const { app, vite } = await createApp(server);
  server.on('request', app);
  const probe = http.createServer(createHttpProbeApp());
  try { await listen(server, 8443); await listen(probe, 8080); }
  catch (error) {
    await vite?.close(); server.close(); probe.close();
    throw error;
  }
  const close = async () => {
    await vite?.close();
    server.closeAllConnections(); probe.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => server.close(() => resolve())),
      new Promise<void>(resolve => probe.close(() => resolve()))]);
  };
  process.once('SIGINT', () => { close().then(() => process.exit(0)); });
  process.once('SIGTERM', () => { close().then(() => process.exit(0)); });
  console.log('Local laboratory: https://app.security-lab.test:8443');
  console.log('Sibling: https://sibling.security-lab.test:8443 | Attacker: https://attacker.csrf-lab.test:8443');
  return { close };
}
if (process.argv[1]?.endsWith('src/server/index.ts') || process.argv[1]?.endsWith('src\\server\\index.ts')) {
  start().catch(error => { console.error(error); process.exitCode = 1; });
}
