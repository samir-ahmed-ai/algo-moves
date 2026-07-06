#!/usr/bin/env node
// Import every Go problem under ../algo/progress into a generated TS manifest the
// app consumes via the generic `imported` plugin factory. Re-run after adding
// problems: `node scripts/import-problems.mjs`. Deterministic — no network, no AI.
//
// Algo source path: ALGO_ROOT, PREP_ROOT/../, default ../algo, or sibling */algo
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAlgoRoot } from './resolve-algo-path.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const { path: ALGO, via: algoVia } = resolveAlgoRoot(ROOT);
const PROGRESS = join(ALGO, 'progress');

const CATEGORY = {
  graph: { id: 'graph', title: 'Graph', course: 'Graph library', icon: 'Network' },
  backtracking: { id: 'backtracking', title: 'Backtracking', course: 'Backtracking library', icon: 'GitBranch' },
  'binary-search': { id: 'binary-search', title: 'Binary search', course: 'Binary-search library', icon: 'Search' },
  'dynamic-programming': { id: 'dynamic-programming', title: 'Dynamic programming', course: 'DP library', icon: 'Table' },
};

// Map free-text Go header tags → known tag ids (unknown ones degrade gracefully).
const TAG_MAP = {
  graph: 'graph', dfs: 'dfs', bfs: 'bfs', matrix: 'grid', grid: 'grid',
  array: 'array', string: 'string', tree: 'tree', heap: 'heap',
  'union-find': 'union-find', 'topological-sort': 'topological-sort',
  'dynamic-programming': 'dp', dp: 'dp', backtracking: 'backtracking',
  'binary-search': 'binary-search', 'two-pointers': 'two-pointers',
  'sliding-window': 'sliding-window', greedy: 'greedy', recursion: 'recursion',
  'cycle-detection': 'cycle-detection', math: 'math', bitmask: 'bitmask',
  stack: 'stack', queue: 'queue', trie: 'trie', sorting: 'sorting',
  intervals: 'intervals', 'linked-list': 'linked-list',
};

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function normTag(raw) {
  const k = raw.trim().toLowerCase();
  if (!k) return null;
  if (TAG_MAP[k]) return TAG_MAP[k];
  return slugify(k);
}

function line(re, text) {
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function hasHeaderComments(code) {
  return /^\/\/\s*Problem:/m.test(code);
}

function titleFromNotes(notes) {
  const m = notes.match(/^#\s*Notes:\s*(.+)$/m);
  return m ? m[1].trim() : '';
}

function loadExistingManifest() {
  const byId = new Map();
  const byNumber = new Map();
  const manifestPath = join(ROOT, 'src', 'plugins', 'imported', 'manifest.ts');
  try {
    const raw = readFileSync(manifestPath, 'utf8');
    const jsonMatch = raw.match(/export const IMPORTED_DATA[^=]*=\s*(\[[\s\S]*\]);/);
    if (!jsonMatch) return { byId, byNumber };
    for (const entry of JSON.parse(jsonMatch[1])) {
      byId.set(entry.id, entry);
      byNumber.set(entry.number, entry);
    }
  } catch {
    /* first import — no prior manifest */
  }
  return { byId, byNumber };
}

function mergeParsedFromPrior(parsed, prior) {
  if (!prior) return parsed;
  return {
    ...parsed,
    title: prior.title || parsed.title,
    leetcode: prior.leetcode || parsed.leetcode,
    difficulty: prior.difficulty || parsed.difficulty,
    tags: prior.tags?.length ? prior.tags : parsed.tags,
    pattern: prior.pattern || parsed.pattern,
    visual: prior.visual || parsed.visual,
    time: prior.time || parsed.time,
    space: prior.space || parsed.space,
  };
}

function parseSolution(code, fallbackTitle) {
  const title = line(/^\/\/\s*Problem:\s*(.+)$/m, code) || fallbackTitle;
  const leetcode = line(/^\/\/\s*LeetCode:\s*(\S+)/m, code);
  // The "meta" line is the comment that carries the difficulty, e.g.
  //   "#200 | Medium | Graph, DFS"  or  "— | Hard | Graph, Union-Find".
  const metaLine = line(/^\/\/\s*(.*\|\s*(?:Easy|Medium|Hard)\s*\|.+)$/m, code);
  let number = '';
  let difficulty = 'Medium';
  let tags = [];
  if (metaLine) {
    const parts = metaLine.split('|').map((p) => p.trim());
    number = /^#?\d+$/.test(parts[0] || '') ? (parts[0] || '').replace(/^#/, '') : '';
    const diff = (parts[1] || '').trim();
    if (/easy/i.test(diff)) difficulty = 'Easy';
    else if (/hard/i.test(diff)) difficulty = 'Hard';
    else if (/medium/i.test(diff)) difficulty = 'Medium';
    const tagField = parts[2] || '';
    tags = tagField
      .split(',')
      .map(normTag)
      .filter(Boolean);
  }
  const pattern = line(/^\/\/\s*Pattern:\s*(.+)$/m, code);
  const visual = line(/^\/\/\s*Visual:\s*(.+)$/m, code);
  // Prefer the canonical single line "// Time: X | Space: Y"; fall back to per-field.
  const combined = code.match(/^\/\/\s*Time:\s*([^|]+?)\s*\|\s*Space:\s*(.+)$/m);
  const time = combined ? combined[1].trim() : line(/^\/\/.*\bTime:\s*([^|]+?)\s*(?:\||$)/m, code);
  const space = combined ? combined[2].trim() : line(/^\/\/.*\bSpace:\s*(.+)$/m, code);
  return { title, leetcode, number, difficulty, tags, pattern, visual, time, space };
}

function readFileSafe(p) {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function cleanFolderSlug(name) {
  return name
    .replace(/^\d+-\s*/, '')
    .replace(/-?\s*DONE.*/i, '')
    .replace(/\(.*?\)/g, '')
    .replace(/DUPLICATE/i, '')
    .trim();
}

const { byId: existingById, byNumber: existingByNumber } = loadExistingManifest();

const out = [];
const seen = new Set();

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Numeric prefixes along a path → a sortable tuple (e.g. ['0','tota'] grandchild). */
function numPrefix(name) {
  const m = name.match(/^(\d+)/);
  return m ? m[1] : '';
}

const skipped = [];

/**
 * Recursively collect every directory that has its own solution.go (any depth).
 * Nesting groups like "0- tota" (no solution.go of their own, but holding 8 nested
 * problems) are descended into instead of being silently dropped.
 */
function collect(dir, meta, catKey, numPath, slugPath) {
  if (/DUPLICATE/i.test(dir)) return;
  const code = readFileSafe(join(dir, 'solution.go'));
  if (code.trim()) {
    emit(dir, code, meta, catKey, numPath, slugPath);
    return;
  }
  const children = readdirSync(dir).filter((d) => isDir(join(dir, d)) && d !== 'variants');
  if (children.length === 0) {
    skipped.push(dir);
    return;
  }
  for (const child of children.sort()) {
    collect(join(dir, child), meta, catKey, [...numPath, numPrefix(child)], [...slugPath, child]);
  }
}

function emit(dir, code, meta, catKey, numPath, slugPath) {
  const leaf = slugPath[slugPath.length - 1];
  const number = numPath.filter(Boolean).join('-') || String(out.length);
  const order = numPath.filter(Boolean).map(Number);
  const notes = readFileSafe(join(dir, 'NOTES.md'));
  const fallbackTitle = titleFromNotes(notes) || cleanFolderSlug(leaf) || leaf;
  let parsed = parseSolution(code, fallbackTitle);
  const titleSlug = slugify(parsed.title) || cleanFolderSlug(leaf) || `p${number}`;
  const id = `imp-${number}-${titleSlug}`;
  if (seen.has(id)) return;
  seen.add(id);

  if (!hasHeaderComments(code)) {
    const prior = existingById.get(id) ?? existingByNumber.get(number);
    parsed = mergeParsedFromPrior(parsed, prior);
  }

  const approaches = readFileSafe(join(dir, 'APPROACHES.md'));
  const variants = [];
  if (isDir(join(dir, 'variants'))) {
    for (const vf of readdirSync(join(dir, 'variants'))) {
      if (vf.endsWith('.go')) variants.push({ file: vf, text: readFileSafe(join(dir, 'variants', vf)) });
    }
  }

  out.push({
    id,
    number,
    order,
    category: catKey,
    categoryTitle: meta.title,
    course: meta.course,
    courseIcon: meta.icon,
    title: parsed.title,
    difficulty: parsed.difficulty,
    tags: parsed.tags,
    leetcode: parsed.leetcode,
    pattern: parsed.pattern,
    visual: parsed.visual,
    time: parsed.time,
    space: parsed.space,
    code,
    notes: notes.trim(),
    approaches: approaches.trim(),
    variants,
  });
}

for (const catDir of readdirSync(PROGRESS).sort()) {
  const full = join(PROGRESS, catDir);
  if (!isDir(full)) continue;
  const catKey = catDir.replace(/^\d+-\s*/, '').trim();
  const meta = CATEGORY[catKey];
  if (!meta) continue;
  for (const child of readdirSync(full).filter((d) => isDir(join(full, d))).sort()) {
    collect(join(full, child), meta, catKey, [numPrefix(child)], [child]);
  }
}

// Sort within the manifest by the numeric path tuple (stable, handles nesting).
out.sort((a, b) => {
  const al = a.order ?? [],
    bl = b.order ?? [];
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    const d = (al[i] ?? -1) - (bl[i] ?? -1);
    if (d) return d;
  }
  return 0;
});
out.forEach((p) => delete p.order); // `order` was only for sorting; keep the manifest clean
if (skipped.length) console.warn(`Skipped ${skipped.length} dir(s) with no solution.go and no importable children:`, skipped);

const header = `// AUTO-GENERATED by scripts/import-problems.mjs — do not edit by hand.
// Source: algo/progress/**/solution.go (${out.length} problems). Re-run the script to refresh.
import type { ImportedProblem } from './factory';

export const IMPORTED_DATA: ImportedProblem[] = ${JSON.stringify(out, null, 2)};
`;

const dest = join(ROOT, 'src', 'plugins', 'imported');
mkdirSync(dest, { recursive: true });
writeFileSync(join(dest, 'manifest.ts'), header);

const byCat = {};
for (const p of out) byCat[p.categoryTitle] = (byCat[p.categoryTitle] || 0) + 1;
console.log(`Using algo source: ${ALGO} (${algoVia})`);
console.log(`Imported ${out.length} problems →`, byCat);
