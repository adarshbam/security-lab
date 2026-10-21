import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/client'),
  plugins: [react()],
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'lucide-react', 'react-markdown'] },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    middlewareMode: true,
    allowedHosts: [
      'app.security-lab.test',
      'sibling.security-lab.test',
      'attacker.csrf-lab.test',
      'localhost',
      '127.0.0.1',
    ],
  },
});
