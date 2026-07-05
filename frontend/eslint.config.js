import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Layer boundary zones — mirrors frontend/scripts/check-boundaries.mjs FORBIDDEN map.
 * Dependency direction flows downward only (design at the bottom, shell at the top).
 */
const FORBIDDEN = {
  design: ['lib', 'core', 'content', 'components', 'effects', 'store', 'plugins', 'hooks', 'shell'],
  lib: ['store', 'plugins', 'shell'],
  core: ['store', 'plugins', 'shell'],
  content: ['store', 'plugins', 'shell'],
  components: ['store', 'plugins', 'shell'],
  effects: ['store', 'plugins', 'shell'],
  store: ['plugins', 'shell'],
  plugins: ['shell'],
};

/** Composition roots allowed to import plugins — mirrors check-boundaries.mjs ACCEPTED. */
const COMPOSITION_ROOTS = [
  'src/core/registry.ts',
  'src/content/index.ts',
  'src/content/taxonomy.ts',
];

function buildBoundaryZones() {
  const zones = [];
  for (const [sourceLayer, forbiddenTargets] of Object.entries(FORBIDDEN)) {
    for (const forbiddenLayer of forbiddenTargets) {
      zones.push({
        // eslint-plugin-import: zone applies when the importing file is under `target`;
        // imports resolving under `from` are forbidden.
        target: `./src/${sourceLayer}`,
        from: `./src/${forbiddenLayer}`,
        message: `Layer boundary: ${sourceLayer} must not import ${forbiddenLayer}`,
      });
    }
  }
  return zones;
}

const boundaryZones = buildBoundaryZones();

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/**/_generated/**',
      '**/*.generated.*',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // Keep first rollout focused on architecture enforcement; typescript-eslint
      // recommended can be tightened incrementally.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'prefer-const': 'off',
      'no-useless-escape': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'import/no-restricted-paths': ['error', { zones: boundaryZones }],
      'import/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
    },
  },
  {
    // Composition roots legitimately import plugins (matches check-boundaries ACCEPTED).
    files: COMPOSITION_ROOTS,
    rules: {
      'import/no-restricted-paths': 'off',
    },
  },
  {
    files: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    rules: {
      'import/no-restricted-paths': 'off',
    },
  },
);
