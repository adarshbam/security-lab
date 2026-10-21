import { spawnSync } from 'node:child_process';
import path from 'node:path';

export function cli(name: 'tsx' | 'playwright' | 'vite' | 'tsc' | 'eslint', args: string[] = []) {
  const entries = { tsx: 'tsx/dist/cli.mjs', playwright: '@playwright/test/cli.js',
    vite: 'vite/bin/vite.js', tsc: 'typescript/bin/tsc', eslint: 'eslint/bin/eslint.js' };
  const result = spawnSync(process.execPath, [path.resolve('node_modules', entries[name]), ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${name} exited with status ${result.status}`);
}
