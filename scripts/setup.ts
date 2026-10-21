import { execFileSync } from 'node:child_process';
import { generateCertificates, mkcertBinary } from './generate-cert.js';
import { printPrerequisites } from './prerequisites.js';
import { runDoctor } from './doctor.js';
import { cli } from './process.js';

async function setup() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node 24 or newer is required');
  try { execFileSync(mkcertBinary(), ['-version'], { stdio: 'ignore' }); }
  catch { printPrerequisites(); throw new Error('mkcert is missing. Follow the prerequisite steps.'); }
  printPrerequisites();
  generateCertificates();
  cli('playwright', ['install', 'chromium']);
  if (!await runDoctor()) throw new Error('Setup is incomplete. Resolve the failures and rerun setup.');
  console.log('Setup complete. Run npm run dev.');
}
setup().catch(error => { console.error(error.message); process.exitCode = 1; });
