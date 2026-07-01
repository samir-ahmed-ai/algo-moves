import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number((globalThis as { process?: { env?: { PORT?: string } } }).process?.env?.PORT) || 4321;

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    strictPort: false,
    host: true,
    // Batch rapid saves (e.g. bulk codemods) so one HMR pass replaces dozens of full reloads.
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 800,
        pollInterval: 100,
      },
    },
  },
  build: {
    // Split the big, rarely-changing vendor libs into their own long-cached
    // chunks so the entry is smaller and the 500kB warning is meaningful again.
    // Unrelated to layout breakpoints (e.g. sidebar tab bar uses compact labels below 900px).
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          xyflow: ['@xyflow/react'],
        },
      },
    },
  },
});
