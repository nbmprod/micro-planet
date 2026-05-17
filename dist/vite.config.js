import { defineConfig } from 'vite';
export default defineConfig({
    // Resolve entry from project root
    root: '.',
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
//# sourceMappingURL=vite.config.js.map