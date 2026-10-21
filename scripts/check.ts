import { cli } from './process.js';
try {
  cli('eslint', ['.']);
  cli('tsc', ['--noEmit']);
  cli('vite', ['build']);
  cli('tsx', ['scripts/run-tests.ts']);
} catch (error) { console.error(error); process.exitCode = 1; }
