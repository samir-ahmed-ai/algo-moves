import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const DEFAULT_DEV_PORT = 4321;
const MAX_PORT = 65535;

const parsePort = (value: string | undefined) => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= MAX_PORT ? port : DEFAULT_DEV_PORT;
};

const isEnabled = (value: string | undefined) => value === '1' || value === 'true';

const devPort = parsePort(env.PORT);
const alphaBucket = (name: string) => {
  const first = name[0]?.toLowerCase() ?? 'z';
  if (first <= 'f') return 'a-f';
  if (first <= 'l') return 'g-l';
  if (first <= 'r') return 'm-r';
  return 's-z';
};

const analyze = isEnabled(env.ANALYZE);

export default defineConfig({
  plugins: [
    react(),
    ...(analyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      // Keep the hand-crafted manifest.webmanifest in public/ rather than
      // having the plugin generate one — it already has all the right fields.
      manifest: false,
      workbox: {
        // Cache everything shipped in dist, including large lazy JS chunks.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 8_000_000,
        // SPA fallback so /mobile deep-links work when served from cache.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      // No SW in dev — avoids stale-cache confusion during development.
      devOptions: { enabled: false },
    }),
  ],
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
  preview: {
    port: devPort,
    strictPort: false,
    host: true,
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
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
            if (has('yjs') || has('hocuspocus') || has('lib0')) return 'yjs-collab';
            if (has('/mermaid/node_modules/elkjs/')) return 'mermaid-elkjs';
            if (has('/elkjs/')) return 'elkjs';
            if (
              has('/@codemirror/') ||
              has('/codemirror/') ||
              has('/@lezer/') ||
              has('/@replit/codemirror-vim/')
            )
              return 'codemirror';
            if (has('/@dnd-kit/')) return 'dnd-kit';
            return;
          }
          if (has('/content/_generated/problemBriefs')) return 'content-problem-briefs';
          if (has('/plugins/_generated/')) return 'plugins-generated-meta';
          if (has('/styles/themes/sources/')) return 'theme-sources';
          const importedSim = normalized.match(
            /\/plugins\/imported\/simulators\/problems\/([^/]+)\.tsx$/,
          );
          if (importedSim) return `plugins-imported-sim-${alphaBucket(importedSim[1])}`;
          const prepSim = normalized.match(
            /\/plugins\/imported\/prepSimulators\/problems\/([^/]+)\.tsx$/,
          );
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
