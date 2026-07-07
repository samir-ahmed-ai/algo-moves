#!/usr/bin/env node
/**
 * Module-boundary firewall — enforces the intended layering documented in
 * docs/architecture.md so `loosely coupled` stays a guarantee, not a convention.
 *
 * Dependency direction must flow DOWN only:
 *
 *     design  ->  (nothing app-level)
 *     lib     ->  design
 *     core    ->  lib, design
 *     content ->  lib, core, design
 *     components / effects  ->  lib, core, design (+ components for effects)
 *     store   ->  lib, core, content, design
 *     plugins ->  lib, core, components, effects, store, content, design
 *     hooks / shell  ->  anything below
 *
 * This script parses every import/export specifier under src/ and flags any edge
 * that points the wrong way. Test files are exempt (fixtures legitimately cross
 * layers). Existing debt is tracked in KNOWN_VIOLATIONS as an explicit ratchet:
 * new violations fail the build, and a KNOWN_VIOLATIONS entry that no longer
 * matches also fails — so the list can only shrink. Each entry names the finding
 * and the tranche that removes it (see docs/architecture-review.md).
 *
 * Zero dependencies; wired into `npm run check:all`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lib/walkFiles.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/** Forbidden target layers per source layer. Absence = unconstrained. */
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

/**
 * Permanent, intentional composition-root exemptions. The plugin registry and
 * the content catalog are aggregation points that legitimately pull generated
 * plugin data upward; the audit confirmed these are by-design. Key format as
 * KNOWN_VIOLATIONS.
 */
const ACCEPTED = new Set([
  'core/registry.ts :: ../plugins', // registry is the plugin composition root
  'core/registry.ts :: ../plugins/_generated/pluginMeta', // generated meta index
  'content/index.ts :: @/plugins/_generated/courses', // catalog aggregates generated courses
  'content/taxonomy.ts :: @/plugins/_generated/courses',
]);

/**
 * Ratchet allowlist of pre-existing violations to be REMOVED. Key:
 * `<src-rel> :: <import>`. Delete an entry when its import is fixed; a stale
 * entry fails the build, so the list can only shrink. Do NOT add new ones.
 */
// No tracked debt remaining — every layer boundary is clean. Keep this empty:
// new violations must be fixed, not allowlisted.
const KNOWN_VIOLATIONS = new Set([]);

const IMPORT_RE =
  /(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*['"]([^'"]+)['"]/g;
const IS_TEST = /(?:\.test\.|\.spec\.|(?:^|\/)__tests__\/)/;

const layerOf = (srcRel) => srcRel.split('/')[0];

/** Resolve an import specifier to a src-relative path, or null if external. */
function resolveTarget(spec, fileDir) {
  let abs;
  if (spec.startsWith('@/')) abs = join(SRC, spec.slice(2));
  else if (spec.startsWith('./') || spec.startsWith('../')) abs = resolve(fileDir, spec);
  else return null; // bare package
  const rel = relative(SRC, abs);
  if (rel.startsWith('..')) return null; // outside src
  return rel.replace(/\\/g, '/');
}

const violations = [];
const used = new Set();

for (const file of walkFiles(
  SRC,
  (_path, name) => /\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts'),
  {
    skipDirs: ['node_modules', '_generated'],
  },
)) {
  const srcRel = relative(SRC, file).replace(/\\/g, '/');
  if (IS_TEST.test(srcRel)) continue;
  const srcLayer = layerOf(srcRel);
  const forbidden = FORBIDDEN[srcLayer];
  if (!forbidden) continue;

  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1] || m[2] || m[3];
    if (!spec) continue;
    const targetRel = resolveTarget(spec, dirname(file));
    if (!targetRel) continue;
    const targetLayer = layerOf(targetRel);
    if (targetLayer === srcLayer || !forbidden.includes(targetLayer)) continue;

    const key = `${srcRel} :: ${spec}`;
    if (ACCEPTED.has(key)) continue;
    if (KNOWN_VIOLATIONS.has(key)) {
      used.add(key);
      continue;
    }
    violations.push({ srcRel, spec, srcLayer, targetLayer });
  }
}

const stale = [...KNOWN_VIOLATIONS].filter((k) => !used.has(k));

let bad = false;
if (violations.length) {
  bad = true;
  console.error(
    `\n✗ ${violations.length} module-boundary violation(s) — imports must flow downward (see docs/architecture.md):\n`,
  );
  for (const v of violations.sort((a, b) => {
    const byFile = a.srcRel.localeCompare(b.srcRel);
    return byFile || a.spec.localeCompare(b.spec);
  })) {
    console.error(`  ${v.srcLayer} ⇏ ${v.targetLayer}   ${v.srcRel}`);
    console.error(`      imports '${v.spec}'`);
  }
  console.error('');
}
if (stale.length) {
  bad = true;
  console.error(
    `\n✗ ${stale.length} stale KNOWN_VIOLATIONS entry(ies) — import was fixed; delete these from check-boundaries.mjs:\n`,
  );
  for (const k of stale) console.error(`  ${k}`);
  console.error('');
}

if (bad) process.exit(1);
console.log(`✓ module boundaries clean (${KNOWN_VIOLATIONS.size} tracked, shrinking)`);
