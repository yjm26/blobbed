import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        drive: resolve(__dirname, 'pages/drive.html'),
        download: resolve(__dirname, 'pages/download.html'),
      },
    },
  },
  publicDir: 'public',
});
