process.env.LAB_BUILT = 'true';
const { start } = await import('../src/server/index.js');
await start();
export {};
