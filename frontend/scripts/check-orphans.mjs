#!/usr/bin/env node
// Orphan-module check (#97).  tsc happily compiles a file that nothing imports,
// so dead modules pile up silently after refactors. This walks the import graph
// from the entry point and flags any src/*.ts(x) that is never reached.
//   npm run check-orphans            (exit 1 if orphans found)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkFiles } from './lib/walkFiles.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const ENTRIES = ['src/main.tsx', 'src/main.ts'];
const EXTS = ['.ts', '.tsx'];

function rel(file) {
  return relative(root, file).replace(/\\/g, '/');
}

function isSourceModule(_path, name) {
  return (
    EXTS.some((ext) => name.endsWith(ext)) &&
    !name.endsWith('.d.ts') &&
    !/\.test\.(t|j)sx?$/.test(name)
  );
}

/** Resolve a relative or `@/`-aliased import specifier to an absolute file path (trying ext + /index). */
function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('@/'))
    base = resolve(srcDir, spec.slice(2)); // '@/' → src/
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null;
  const candidates = [
    base,
    ...EXTS.map((e) => base + e),
    ...EXTS.map((e) => join(base, 'index' + e)),
  ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const files = walkFiles(srcDir, isSourceModule).sort();

/** Resolve a Vite `import.meta.glob('./pat/*.tsx')` pattern to the matching files. */
function resolveGlob(fromFile, pattern) {
  if (!pattern.startsWith('.')) return [];
  const absPattern = resolve(dirname(fromFile), pattern);
  const rx = new RegExp(
    '^' +
      absPattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex metachars (leaves * and /)
        .replace(/\*\*/g, '__GLOBSTAR__') // ** placeholder
        .replace(/\*/g, '[^/]*') // * → one path segment
        .replace(/__GLOBSTAR__/g, '.*') + // ** → any depth
      '$',
  );
  return files.filter((c) => rx.test(c));
}

const importRe =
  /\b(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
const sideEffectImportRe = /\bimport\s*['"]([^'"]+)['"]/g;
const globRe = /import\.meta\.glob\s*(?:<[^>]*>)?\s*\(\s*['"]([^'"]+)['"]/g;
const graph = new Map(); // file -> Set(imported files)
const sources = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  sources.set(f, src);
  const deps = new Set();
  let m;
  while ((m = importRe.exec(src))) {
    const spec = m[1] ?? m[2];
    const resolved = resolveImport(f, spec);
    if (resolved) deps.add(resolved);
  }
  while ((m = sideEffectImportRe.exec(src))) {
    const resolved = resolveImport(f, m[1]);
    if (resolved) deps.add(resolved);
  }
  while ((m = globRe.exec(src))) {
    for (const g of resolveGlob(f, m[1])) deps.add(g);
  }
  graph.set(f, deps);
}

function isPureBarrel(file) {
  if (!file.endsWith('/index.ts') && !file.endsWith('/index.tsx')) return false;
  const src = sources
    .get(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .trim();
  if (!src) return false;
  return src
    .split(';')
    .map((stmt) => stmt.trim())
    .filter(Boolean)
    .every((stmt) => /^export\s+(?:\*|\{[\s\S]*?\})\s+from\s+['"][^'"]+['"]$/.test(stmt));
}

// BFS from entry points.
const reachable = new Set();
const queue = ENTRIES.map((e) => join(root, e)).filter((e) => existsSync(e));
if (queue.length === 0) {
  console.error('No entry point found (expected src/main.tsx).');
  process.exit(1);
}
queue.forEach((e) => reachable.add(e));
while (queue.length) {
  const f = queue.shift();
  for (const dep of graph.get(f) ?? []) {
    if (!reachable.has(dep)) {
      reachable.add(dep);
      queue.push(dep);
    }
  }
}

const orphans = files
  .filter((f) => !reachable.has(f) && !isPureBarrel(f))
  .map(rel)
  .sort();

/** Plugin folders on disk must match registry imports in plugins/index.ts (#97). */
const PLUGIN_SKIP = new Set(['imported', '_shared', '_generated']);
const pluginsDir = join(srcDir, 'plugins');
const indexPath = join(pluginsDir, 'index.ts');
if (!existsSync(indexPath)) {
  console.error('No plugin registry found (expected src/plugins/index.ts).');
  process.exit(1);
}
const indexSrc = readFileSync(indexPath, 'utf8');
const registeredPlugins = new Set();
// Match both static `from './x'` and dynamic `import('./x')` (lazy group loaders).
for (const m of indexSrc.matchAll(/(?:from\s+|import\(\s*)['"]\.\/([^'"]+)['"]/g)) {
  registeredPlugins.add(m[1]);
}
const folderOrphans = [];
for (const name of readdirSync(pluginsDir).sort()) {
  const p = join(pluginsDir, name);
  if (!statSync(p).isDirectory() || PLUGIN_SKIP.has(name)) continue;
  if (!registeredPlugins.has(name)) folderOrphans.push(`src/plugins/${name}/`);
}

let failed = false;

if (orphans.length > 0) {
  failed = true;
  console.error(`✗ ${orphans.length} orphan module(s) not reachable from ${ENTRIES.join(' / ')}:`);
  for (const o of orphans) console.error('  ' + o);
}

if (folderOrphans.length > 0) {
  failed = true;
  console.error(`✗ ${folderOrphans.length} orphan plugin folder(s) not in plugins/index.ts:`);
  for (const o of folderOrphans) console.error('  ' + o);
}

if (failed) process.exit(1);

console.log(`✓ no orphan modules — all ${files.length} src files reachable from the entry point.`);
console.log(`✓ no orphan plugin folders — ${registeredPlugins.size} registered native plugin(s).`);
process.exit(0);
