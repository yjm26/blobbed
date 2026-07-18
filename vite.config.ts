import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist',
  },
  publicDir: 'public',
  server: {
    // SPA fallback in dev
    // vite handles this by default for index.html
  },
});
