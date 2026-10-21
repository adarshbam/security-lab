import { cli } from './process.js';
try {
  cli('tsx', ['--test', 'tests/server/*.spec.ts']);
  cli('playwright', ['test']);
} catch (error) { console.error(error); process.exitCode = 1; }
