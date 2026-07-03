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
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/** Forbidden target layers per source layer. Absence = unconstrained. */
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
const KNOWN_VIOLATIONS = new Set([
  // Last remaining debt (#08): lib/canvas/canvasTeachingUi re-exports
  // VizFitBox/MiniTabs from shell/canvas/nodeui. These depend on the canvas
  // vizFitMeasure runtime, so relocating them to a shared leaf is bundled with
  // the CanvasStage/vizFitMeasure decomposition (Tranche 4 God-component work).
  'lib/canvas/canvasTeachingUi.ts :: @/shell/canvas/nodeui',
]);

const IMPORT_RE = /(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*['"]([^'"]+)['"]/g;
const IS_TEST = /(?:\.test\.|\.spec\.|(?:^|\/)__tests__\/)/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === 'node_modules' || name === '_generated') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

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

for (const file of walk(SRC)) {
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
    if (KNOWN_VIOLATIONS.has(key)) { used.add(key); continue; }
    violations.push({ srcRel, spec, srcLayer, targetLayer });
  }
}

const stale = [...KNOWN_VIOLATIONS].filter((k) => !used.has(k));

let bad = false;
if (violations.length) {
  bad = true;
  console.error(`\n✗ ${violations.length} module-boundary violation(s) — imports must flow downward (see docs/architecture.md):\n`);
  for (const v of violations.sort((a, b) => a.srcRel.localeCompare(b.srcRel))) {
    console.error(`  ${v.srcLayer} ⇏ ${v.targetLayer}   ${v.srcRel}`);
    console.error(`      imports '${v.spec}'`);
  }
  console.error('');
}
if (stale.length) {
  bad = true;
  console.error(`\n✗ ${stale.length} stale KNOWN_VIOLATIONS entry(ies) — import was fixed; delete these from check-boundaries.mjs:\n`);
  for (const k of stale) console.error(`  ${k}`);
  console.error('');
}

if (bad) process.exit(1);
console.log(`✓ module boundaries clean (${KNOWN_VIOLATIONS.size} tracked, shrinking)`);
