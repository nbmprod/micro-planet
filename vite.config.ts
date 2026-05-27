import { defineConfig } from 'vite';

export default defineConfig({
  // Resolve entry from project root
  root: '.',
  
  // Base public path when served in production
  // Using './' ensures asset paths are resolved relative to index.html
  base: './',

  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    open: true,
  },
});