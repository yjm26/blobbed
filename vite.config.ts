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
        gate: resolve(__dirname, 'pages/gate.html'),
        drive: resolve(__dirname, 'pages/drive.html'),
        download: resolve(__dirname, 'pages/download.html'),
        view: resolve(__dirname, 'pages/view.html'),
      },
    },
  },
  publicDir: 'public',
});
