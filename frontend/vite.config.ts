import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number((globalThis as { process?: { env?: { PORT?: string } } }).process?.env?.PORT) || 4321;
const alphaBucket = (name: string) => {
  const first = name[0]?.toLowerCase() ?? 'z';
  if (first <= 'f') return 'a-f';
  if (first <= 'l') return 'g-l';
  if (first <= 'r') return 'm-r';
  return 's-z';
};

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
    // App-owned generated chunks are split below; the remaining large chunks are
    // lazy vendor payloads from Excalidraw/Mermaid internals.
    // Unrelated to layout breakpoints (e.g. sidebar tab bar uses compact labels below 900px).
    chunkSizeWarningLimit: 1900,
    rollupOptions: {
      output: {
        // Vendor libs in long-cached chunks; the large plugin groups each get a
        // named lazy chunk (only fetched when a problem in that group is opened).
        manualChunks(id: string) {
          const normalized = id.replace(/\\/g, '/');
          const has = (s: string) => normalized.indexOf(s) !== -1;
          if (has('node_modules')) {
            if (has('/react') || has('/react-dom')) return 'react';
            if (has('@xyflow')) return 'xyflow';
            return;
          }
          const importedSim = normalized.match(/\/plugins\/imported\/simulators\/problems\/([^/]+)\.tsx$/);
          if (importedSim) return `plugins-imported-sim-${alphaBucket(importedSim[1])}`;
          const prepSim = normalized.match(/\/plugins\/imported\/prepSimulators\/problems\/([^/]+)\.tsx$/);
          if (prepSim) return `plugins-prep-sim-${alphaBucket(prepSim[1])}`;
          if (has('/plugins/imported/prepManifest')) return 'plugins-prep-manifest';
          if (has('/plugins/imported/manifest')) return 'plugins-imported-manifest';
          if (has('/plugins/imported/ports/')) return 'plugins-imported-ports';
          if (has('/plugins/imported/practice/')) return 'plugins-imported-practice';
          if (has('/plugins/imported/story/')) return 'plugins-imported-story';
          if (has('/plugins/imported/prepSimulators/')) return 'plugins-prep-sim-registry';
          if (has('/plugins/imported/simulators/')) return 'plugins-imported-sim-registry';
          if (has('/plugins/imported/prep')) return 'plugins-prep-runtime';
          if (has('/plugins/imported/')) return 'plugins-imported-runtime';
          const goTopic = normalized.match(/\/plugins\/go-course\/topics\/([^/]+)\.ts$/);
          if (goTopic && goTopic[1] !== 'index') return `plugins-go-topic-${goTopic[1]}`;
          if (has('/plugins/go-course/anim/')) return 'plugins-go-anim';
          if (has('/plugins/go-course/')) return 'plugins-go-course-runtime';
          return;
        },
      },
    },
  },
});
