#!/usr/bin/env node
// Import every prep problem under ../algo/prep into a generated TS manifest the
// app consumes via the `prep` plugin factory. The prep set is the big curated
// study collection (366 canonical problems in _index.json). The four "big"
// categories (graphs / backtracking / binary-search / dynamic-programming) are
// already imported from ../algo/progress (with hand-built simulators), so this
// script imports only the OTHER 16 topics — the genuinely-missing problems (271
// after de-dup) — and dedupes any title that already exists in the progress manifest.
//
// Source of truth is prep/_index.json (title/visual/memorize/scene/path/...); we
// read each solution.go for the real Go code + Pattern/Time/Space header line.
// Re-run after editing prep: `node scripts/import-prep.mjs`. Deterministic.
//
// Prep source path (first match wins):
//   PREP_ROOT=/path/to/prep   — direct path to the prep folder
//   ALGO_ROOT=/path/to/algo   — prep is $ALGO_ROOT/prep
//   default: ../algo/prep next to frontend/, then any sibling */algo/prep
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { titleToAsk } from './problem-brief-utils.mjs';
import { resolvePrepRoot } from './resolve-algo-path.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const { path: PREP, via: prepVia } = resolvePrepRoot(ROOT);

// Topics already covered by the progress import — skip them here.
const SKIP_TOPICS = new Set(['graphs', 'backtracking', 'binary-search', 'dynamic-programming']);

// Prep topic key → display title + course label + lucide icon name (courseIcon.tsx).
const TOPIC_META = {
  arrays: { title: 'Arrays', icon: 'Table' },
  strings: { title: 'Strings', icon: 'Type' },
  trees: { title: 'Trees', icon: 'ListTree' },
  math: { title: 'Math', icon: 'Sigma' },
  design: { title: 'Design', icon: 'Boxes' },
  matrices: { title: 'Matrices', icon: 'Grid' },
  'linked-lists': { title: 'Linked lists', icon: 'Link' },
  'stacks-queues': { title: 'Stacks & queues', icon: 'Layers' },
  'streams-io': { title: 'Streams & I/O', icon: 'Waves' },
  'hash-maps': { title: 'Hash maps', icon: 'Hash' },
  intervals: { title: 'Intervals', icon: 'CalendarRange' },
  sorting: { title: 'Sorting', icon: 'ArrowDownUp' },
  'prefix-sum': { title: 'Prefix sum', icon: 'Sigma' },
  tries: { title: 'Tries', icon: 'Network' },
  database: { title: 'Database', icon: 'Database' },
  'sliding-window': { title: 'Sliding window', icon: 'RectangleHorizontal' },
};

// Free-text pattern/topic words → known tag ids (unknown ones degrade gracefully).
const TAG_MAP = {
  array: 'array',
  string: 'string',
  tree: 'tree',
  heap: 'heap',
  grid: 'grid',
  matrix: 'grid',
  stack: 'stack',
  queue: 'queue',
  trie: 'trie',
  hash: 'hash-map',
  'hash-map': 'hash-map',
  'linked-list': 'linked-list',
  'two-pointers': 'two-pointers',
  'two-pointer': 'two-pointers',
  'sliding-window': 'sliding-window',
  greedy: 'greedy',
  recursion: 'recursion',
  dfs: 'dfs',
  bfs: 'bfs',
  math: 'math',
  bitmask: 'bitmask',
  sorting: 'sorting',
  sort: 'sorting',
  intervals: 'intervals',
  interval: 'intervals',
  'prefix-sum': 'prefix-sum',
  design: 'design',
  simulation: 'simulation',
};

const TOPIC_TAG = {
  arrays: 'array',
  strings: 'string',
  trees: 'tree',
  math: 'math',
  design: 'design',
  matrices: 'grid',
  'linked-lists': 'linked-list',
  'stacks-queues': 'stack',
  'streams-io': 'design',
  'hash-maps': 'hash-map',
  intervals: 'intervals',
  sorting: 'sorting',
  'prefix-sum': 'prefix-sum',
  tries: 'trie',
  database: 'database',
  'sliding-window': 'sliding-window',
};

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Strip a leading "1.8 " / "14.17 " numeric chapter prefix → { number, title }. */
function splitNumberPrefix(raw) {
  const m = raw.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  if (m) return { number: m[1], title: m[2].trim() };
  return { number: '', title: raw.trim() };
}

/** Normalize a title for cross-manifest dedupe (drop chapter number + punctuation). */
function normTitle(raw) {
  return splitNumberPrefix(raw)
    .title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readFileSafe(p) {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function line(re, text) {
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

/** Parse the prep Go header: "// Pattern: X | Time: Y | Space: Z" (combined). */
function parseHeader(code) {
  const patLine = line(/^\/\/\s*Pattern:\s*(.+)$/m, code);
  let pattern = patLine;
  let time = '';
  let space = '';
  if (patLine.includes('|')) {
    const parts = patLine.split('|').map((p) => p.trim());
    pattern = parts[0] || '';
    for (const part of parts.slice(1)) {
      const t = part.match(/Time:\s*(.+)/i);
      const s = part.match(/Space:\s*(.+)/i);
      if (t) time = t[1].trim();
      if (s) space = s[1].trim();
    }
  }
  // Fallbacks: separate Time:/Space: lines if not combined.
  if (!time) time = line(/^\/\/\s*Time:\s*([^|]+?)\s*(?:\||$)/m, code);
  if (!space) space = line(/^\/\/\s*Space:\s*(.+)$/m, code);
  return { pattern, time, space };
}

function hasHeaderComments(code) {
  return /^\/\/\s*(?:Problem:|Pattern:)/m.test(code);
}

function loadExistingPrepManifest() {
  const byId = new Map();
  const bySlug = new Map();
  const manifestPath = join(ROOT, 'src', 'plugins', 'imported', 'prepManifest.ts');
  try {
    const raw = readFileSync(manifestPath, 'utf8');
    const m = raw.match(/PREP_DATA[^=]*=\s*(\[[\s\S]*\]);/);
    if (!m) return { byId, bySlug };
    for (const entry of JSON.parse(m[1])) {
      byId.set(entry.id, entry);
      if (entry.slug) bySlug.set(`${entry.topic}/${entry.slug}`, entry);
    }
  } catch {
    /* first import — no prior manifest */
  }
  return { byId, bySlug };
}

function mergeHeaderFromPrior(header, prior) {
  if (!prior) return header;
  return {
    pattern: header.pattern || prior.pattern || '',
    time: header.time || prior.time || '',
    space: header.space || prior.space || '',
  };
}

function deriveTags(topic, pattern) {
  const tags = new Set();
  const topicTag = TOPIC_TAG[topic];
  if (topicTag) tags.add(topicTag);
  for (const raw of (pattern || '').toLowerCase().split(/[^a-z-]+/)) {
    const k = raw.trim();
    if (k && TAG_MAP[k]) tags.add(TAG_MAP[k]);
  }
  return [...tags].slice(0, 4);
}

/** Existing progress-manifest titles, to skip duplicates. */
function loadExistingTitles() {
  const titles = new Set();
  const p = join(ROOT, 'src', 'plugins', 'imported', 'manifest.ts');
  try {
    const raw = readFileSync(p, 'utf8');
    const m = raw.match(/IMPORTED_DATA[^=]*=\s*(\[[\s\S]*\]);/);
    if (m) for (const e of JSON.parse(m[1])) titles.add(normTitle(e.title));
  } catch {
    /* no prior manifest */
  }
  return titles;
}

const idx = JSON.parse(readFileSafe(join(PREP, '_index.json')) || '{"topics":{}}');
const sceneOverrides = JSON.parse(readFileSafe(join(PREP, 'scenes_overrides.json')) || '{}');
const existingTitles = loadExistingTitles();
const { byId: existingById, bySlug: existingBySlug } = loadExistingPrepManifest();

const out = [];
const seenIds = new Set();
const skipped = [];
const collisions = [];

for (const [topic, problems] of Object.entries(idx.topics ?? {})) {
  if (SKIP_TOPICS.has(topic)) continue;
  const meta = TOPIC_META[topic] ?? { title: topic, icon: 'Boxes' };
  for (const p of problems) {
    const rel = p.primary || p.path;
    if (!rel) continue;
    const dir = join(PREP, dirname(rel));
    const code = readFileSafe(join(PREP, rel));
    if (!code.trim()) {
      skipped.push(rel);
      continue;
    }
    const { number, title } = splitNumberPrefix(p.title || p.slug);
    if (existingTitles.has(normTitle(title))) continue; // already imported via progress

    const id = `prep-${topic}-${slugify(p.slug)}`;
    if (seenIds.has(id)) {
      collisions.push(`${topic}/${p.slug} → ${id}`);
      continue;
    }
    seenIds.add(id);

    let { pattern, time, space } = parseHeader(code);
    if (!hasHeaderComments(code)) {
      const prior = existingById.get(id) ?? existingBySlug.get(`${topic}/${p.slug}`);
      ({ pattern, time, space } = mergeHeaderFromPrior({ pattern, time, space }, prior));
    }
    const scene = sceneOverrides[`${topic}/${p.slug}`] || p.scene || '';

    const variants = (p.variants ?? [])
      .map((vf) => ({ file: vf.replace(/^variants\//, ''), text: readFileSafe(join(dir, vf)) }))
      .filter((v) => v.text);

    out.push({
      id,
      topic,
      topicTitle: meta.title,
      course: `${meta.title} · prep library`,
      courseIcon: meta.icon,
      slug: p.slug,
      number,
      title,
      ask: titleToAsk(title, p.slug),
      difficulty: 'Medium', // prep has no per-problem difficulty data
      tags: deriveTags(topic, pattern),
      pattern: pattern || p.visual || '',
      visual: p.visual || '',
      memorize: p.memorize || '',
      scene,
      acquired: p.acquired || '',
      time,
      space,
      code,
      notes: readFileSafe(join(dir, 'NOTES.md')).trim(),
      approaches: (p.approaches || readFileSafe(join(dir, 'APPROACHES.md'))).trim(),
      variants,
    });
  }
}

out.sort((a, b) =>
  a.topic === b.topic ? a.title.localeCompare(b.title) : a.topic.localeCompare(b.topic),
);

if (out.length === 0 && existsSync(join(ROOT, 'src', 'plugins', 'imported', 'prepManifest.ts'))) {
  console.error(
    `No prep problems imported from ${PREP} (${prepVia}) — keeping existing prepManifest.ts.`,
  );
  console.error('Set PREP_ROOT or ALGO_ROOT to your algo/prep tree, or add ../algo/prep.');
  process.exit(0);
}

const header = `// AUTO-GENERATED by scripts/import-prep.mjs — do not edit by hand.
// Source: algo/prep/_index.json + solution.go (${out.length} problems across the
// 16 non-big4 topics). Re-run \`npm run import-prep\` to refresh.
import type { PrepProblem } from './prepFactory';

export const PREP_DATA: PrepProblem[] = ${JSON.stringify(out, null, 2)};
`;

const dest = join(ROOT, 'src', 'plugins', 'imported');
mkdirSync(dest, { recursive: true });
writeFileSync(join(dest, 'prepManifest.ts'), header);

const byTopic = {};
for (const p of out) byTopic[p.topicTitle] = (byTopic[p.topicTitle] || 0) + 1;
if (skipped.length)
  console.warn(`Skipped ${skipped.length} entries with no solution.go:`, skipped.slice(0, 10));
if (collisions.length)
  console.warn(`Dropped ${collisions.length} entries with a colliding prep id:`, collisions);
console.log(`Using prep source: ${PREP} (${prepVia})`);
console.log(`Imported ${out.length} prep problems →`, byTopic);
