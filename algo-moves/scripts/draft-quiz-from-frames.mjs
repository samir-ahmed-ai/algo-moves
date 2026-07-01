#!/usr/bin/env node
// TODO #53 (partial): draft multiple-choice questions from frame captions + manifest meta.
// Human review required — output is a starter JSON, not wired to production.
//
// Usage:
//   node scripts/draft-quiz-from-frames.mjs <plugin-id>
//   node scripts/draft-quiz-from-frames.mjs imp-44-word-search
//
// For imported ids, reads title/pattern/time from manifest.ts.
// For native ids, prints placeholders — run the plugin in dev and paste INIT/DONE captions.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];

if (!id) {
  console.error('Usage: node scripts/draft-quiz-from-frames.mjs <plugin-id>');
  process.exit(1);
}

function findManifestEntry(manifestSrc, pluginId) {
  const needle = `"id": "${pluginId}"`;
  const idx = manifestSrc.indexOf(needle);
  if (idx < 0) return null;
  const slice = manifestSrc.slice(idx, idx + 1200);
  const pick = (key) => {
    const m = slice.match(new RegExp(`"${key}":\\s*"([^"]*)"`));
    return m?.[1] ?? '';
  };
  return {
    title: pick('title'),
    pattern: pick('pattern'),
    time: pick('time'),
    space: pick('space'),
    difficulty: pick('difficulty'),
  };
}

let meta = { title: id, pattern: '', time: '', space: '', difficulty: 'Medium' };

if (id.startsWith('imp-')) {
  const manifestPath = join(root, 'src/plugins/imported/manifest.ts');
  const src = readFileSync(manifestPath, 'utf8');
  meta = findManifestEntry(src, id) ?? meta;
}

const complexityLine = [meta.time, meta.space].filter(Boolean).join(' · ') || 'See plugin meta';

const draft = [
  {
    id: 'pattern',
    prompt: `What is the core pattern for “${meta.title}”?`,
    choices: [
      { label: meta.pattern || 'Fill from INIT/DONE captions', correct: true },
      { label: 'Brute-force enumerate all possibilities' },
      { label: 'Sort then scan linearly' },
      { label: 'Two pointers from both ends only' },
    ],
    explain: meta.pattern || 'Replace with the pattern sentence from the problem manifest or recorder INIT caption.',
  },
  {
    id: 'init-invariant',
    prompt: `At the start of a run (${meta.title}), what state is established?`,
    choices: [
      { label: 'Paste the INIT caption invariant here after review', correct: true },
      { label: 'The answer is already computed' },
      { label: 'The input array must be sorted descending' },
      { label: 'All nodes are permanently marked visited' },
    ],
    explain: 'Derive from recorder INIT move.caption — what variables are initialized and why.',
  },
  {
    id: 'complexity',
    prompt: `What is the typical time/space tradeoff for this problem?`,
    choices: [
      { label: complexityLine, correct: true },
      { label: 'O(1) time and space always' },
      { label: 'O(n³) time, O(n²) space' },
      { label: 'Exponential time is required for every input' },
    ],
    explain: `Manifest lists ${complexityLine}. Adjust if the visualized algorithm differs from the Go solution.`,
  },
];

console.log(JSON.stringify({ pluginId: id, meta, quiz: draft }, null, 2));
