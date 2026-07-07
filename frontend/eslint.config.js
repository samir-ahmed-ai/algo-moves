import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Layer boundary zones — mirrors frontend/scripts/check-boundaries.mjs FORBIDDEN map.
 * Dependency direction flows downward only (design at the bottom, shell at the top).
 */
const FORBIDDEN = {
  design: [
    'lib',
    'core',
    'content',
    'components',
    'effects',
    'platform',
    'store',
    'plugins',
    'hooks',
    'shell',
  ],
  lib: ['platform', 'store', 'plugins', 'shell'],
  platform: ['store', 'plugins', 'shell'],
  core: ['platform', 'store', 'plugins', 'shell'],
  content: ['platform', 'store', 'plugins', 'shell'],
  components: ['platform', 'store', 'plugins', 'shell'],
  effects: ['platform', 'store', 'plugins', 'shell'],
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

/**
 * Cross-feature shell zones — start narrow: home/browse/mobile may use the canvas
 * public barrel (@/shell/canvas → index.ts) but not deep canvas internals.
 */
const SHELL_CANVAS_BARREL_FEATURES = ['home', 'browse', 'mobile'];

function buildShellFeatureZones() {
  return SHELL_CANVAS_BARREL_FEATURES.map((feature) => ({
    target: `./src/shell/${feature}`,
    from: `./src/shell/canvas`,
    except: ['./index.ts'],
    message: `Shell feature boundary: shell/${feature} must import canvas via @/shell/canvas, not deep paths`,
  }));
}

const shellFeatureZones = buildShellFeatureZones();

/** Non-games shell features must not import games internals. */
const SHELL_GAMES_FORBIDDEN_FEATURES = [
  'auth',
  'plans',
  'canvas',
  'collab',
  'interview',
  'study',
  'home',
  'browse',
  'mobile',
  'vim',
];

function buildShellGamesZones() {
  return SHELL_GAMES_FORBIDDEN_FEATURES.map((feature) => ({
    target: `./src/shell/${feature}`,
    from: `./src/shell/games`,
    message: `Shell feature boundary: shell/${feature} must not import shell/games`,
  }));
}

const shellGamesZones = buildShellGamesZones();

const SHELL_FEATURES = [
  'auth',
  'plans',
  'canvas',
  'collab',
  'interview',
  'study',
  'home',
  'browse',
  'mobile',
  'vim',
  'games',
  'realtime',
  'resumes',
  'panels',
  'workspace',
  'vim',
];

const boundaryElements = [
  { type: 'design', pattern: 'src/design/**' },
  { type: 'lib', pattern: 'src/lib/**' },
  { type: 'platform', pattern: 'src/platform/**' },
  { type: 'core', pattern: 'src/core/**' },
  { type: 'content', pattern: 'src/content/**' },
  { type: 'components', pattern: 'src/components/**' },
  { type: 'effects', pattern: 'src/effects/**' },
  { type: 'store', pattern: 'src/store/**' },
  { type: 'plugins', pattern: 'src/plugins/**' },
  { type: 'hooks', pattern: 'src/hooks/**' },
  ...SHELL_FEATURES.map((feature) => ({
    type: `shell-${feature}`,
    pattern: `src/shell/${feature}/**`,
  })),
  { type: 'shell', pattern: 'src/shell/**' },
];

const LOWER_LAYERS = [
  'lib',
  'platform',
  'core',
  'content',
  'components',
  'effects',
  'store',
  'plugins',
  'hooks',
  'design',
];
const SHELL_TYPES = SHELL_FEATURES.map((f) => `shell-${f}`);

function shellFeatureAllowed(type) {
  const allowed = [...LOWER_LAYERS, 'shell', ...SHELL_TYPES.filter((t) => t !== 'shell-games')];
  if (type === 'shell-games') return allowed;
  return allowed;
}

const boundaryElementRules = [
  { from: 'design', allow: [] },
  { from: 'lib', allow: ['core', 'content', 'components', 'effects', 'hooks', 'design'] },
  { from: 'platform', allow: ['lib', 'design'] },
  { from: 'core', allow: ['lib', 'platform', 'design'] },
  { from: 'content', allow: ['lib', 'core', 'platform', 'design'] },
  { from: 'components', allow: ['lib', 'core', 'hooks', 'platform', 'design'] },
  { from: 'effects', allow: ['lib', 'core', 'components', 'platform', 'design'] },
  {
    from: 'store',
    allow: ['lib', 'core', 'content', 'components', 'effects', 'platform', 'design'],
  },
  {
    from: 'plugins',
    allow: ['lib', 'core', 'components', 'effects', 'store', 'content', 'platform', 'design'],
  },
  {
    from: 'hooks',
    allow: [
      'lib',
      'core',
      'content',
      'components',
      'effects',
      'store',
      'plugins',
      'platform',
      'design',
      'shell',
      ...SHELL_TYPES,
    ],
  },
  ...SHELL_FEATURES.map((feature) => ({
    from: `shell-${feature}`,
    allow: shellFeatureAllowed(`shell-${feature}`),
    disallow: feature === 'games' ? [] : ['shell-games'],
  })),
  { from: 'shell', allow: ['plugins', ...LOWER_LAYERS, 'shell', ...SHELL_TYPES] },
];

function boundaryRuleToPolicy(rule) {
  if (!rule.allow?.length && !rule.disallow?.length) {
    return null;
  }
  const policy = {
    from: { element: { types: rule.from } },
  };
  if (rule.allow?.length) {
    policy.allow = {
      to: { element: { types: { anyOf: rule.allow } } },
    };
  }
  if (rule.disallow?.length) {
    policy.disallow = {
      to: { element: { types: { anyOf: rule.disallow } } },
    };
  }
  return policy;
}

const boundaryPolicies = boundaryElementRules.map(boundaryRuleToPolicy).filter(Boolean);

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src/**/_generated/**', '**/*.generated.*'],
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
      boundaries,
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      'boundaries/elements': boundaryElements,
      'boundaries/include': ['src/**/*'],
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
      'import/no-restricted-paths': [
        'error',
        { zones: [...boundaryZones, ...shellFeatureZones, ...shellGamesZones] },
      ],
      'import/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
      'boundaries/dependencies': ['error', { default: 'disallow', policies: boundaryPolicies }],
    },
  },
  {
    // Composition roots legitimately import plugins (matches check-boundaries ACCEPTED).
    files: COMPOSITION_ROOTS,
    rules: {
      'import/no-restricted-paths': 'off',
      'boundaries/dependencies': 'off',
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': 'off',
      'boundaries/dependencies': 'off',
    },
  },
);
