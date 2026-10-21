import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const domains = ['app.security-lab.test', 'sibling.security-lab.test', 'attacker.csrf-lab.test'];
export const certFile = path.resolve('certs/cert.pem');
export const keyFile = path.resolve('certs/key.pem');

export function mkcertBinary() {
  const local = path.resolve('.tools', process.platform === 'win32' ? 'mkcert.exe' : 'mkcert');
  return process.env.MKCERT_PATH || (fs.existsSync(local) ? local : 'mkcert');
}
export function hasCertificates() { return fs.existsSync(certFile) && fs.existsSync(keyFile); }
export function generateCertificates() {
  // Never fall back to an untrusted self-signed certificate.
  execFileSync(mkcertBinary(), ['-version'], { stdio: 'ignore' });
  fs.mkdirSync(path.dirname(certFile), { recursive: true });
  execFileSync(mkcertBinary(), ['-cert-file', certFile, '-key-file', keyFile, ...domains], { stdio: 'inherit' });
}
