import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number((globalThis as { process?: { env?: { PORT?: string } } }).process?.env?.PORT) || 4321;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
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
        // Vendor libs in long-cached chunks; the large plugin groups each get a
        // named lazy chunk (only fetched when a problem in that group is opened).
        manualChunks(id: string) {
          const has = (s: string) => id.indexOf(s) !== -1;
          if (has('node_modules')) {
            if (has('/react') || has('/react-dom')) return 'react';
            if (has('@xyflow')) return 'xyflow';
            return;
          }
          if (has('/plugins/imported/prep')) return 'plugins-prep';
          if (has('/plugins/imported/')) return 'plugins-imported';
          if (has('/plugins/go-course/')) return 'plugins-go-course';
          return;
        },
      },
    },
  },
});
