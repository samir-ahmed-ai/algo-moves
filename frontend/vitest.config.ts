import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      setupFiles: ['./test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/__tests__/**',
          'src/plugins/_generated/**',
          'src/content/_generated/**',
          'src/plugins/imported/manifest.ts',
          'src/plugins/imported/prepManifest.ts',
        ],
        thresholds: {
          lines: 35,
          functions: 35,
          branches: 30,
          statements: 35,
        },
      },
    },
  }),
);
