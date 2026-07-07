import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

const TEST_FILE_PATTERNS = ['src/**/*.{test,spec}.{ts,tsx}'];
const TEST_RUN_EXCLUDES = ['dist/**', 'coverage/**', 'node_modules/**'];
const GENERATED_SOURCE_PATTERNS = ['src/plugins/_generated/**', 'src/content/_generated/**'];
const GENERATED_RUNTIME_MANIFESTS = [
  'src/plugins/imported/manifest.ts',
  'src/plugins/imported/prepManifest.ts',
];

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      include: TEST_FILE_PATTERNS,
      exclude: TEST_RUN_EXCLUDES,
      setupFiles: ['./test/setup.ts'],
      clearMocks: true,
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      testTimeout: 10_000,
      hookTimeout: 10_000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          ...TEST_FILE_PATTERNS,
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/__tests__/**',
          ...GENERATED_SOURCE_PATTERNS,
          ...GENERATED_RUNTIME_MANIFESTS,
        ],
        clean: true,
        cleanOnRerun: true,
        reportOnFailure: true,
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
