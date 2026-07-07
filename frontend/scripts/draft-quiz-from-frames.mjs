#!/usr/bin/env node
// Draft multiple-choice questions from manifest meta (starter output).
// Human review required before pasting into a simulator's practice bundle.
//
// Usage:
//   node scripts/draft-quiz-from-frames.mjs <plugin-id>
//   node scripts/draft-quiz-from-frames.mjs prep-arrays-two-sum --promote
//
// --promote  Emit paste-ready TypeScript for sim.practice (not JSON).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
const promote = process.argv.includes('--promote');

if (!id) {
  console.error('Usage: node scripts/draft-quiz-from-frames.mjs <plugin-id> [--promote]');
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
    visual: pick('visual'),
  };
}

function loadMeta(pluginId) {
  if (pluginId.startsWith('imp-')) {
    const src = readFileSync(join(root, 'src/plugins/imported/manifest.ts'), 'utf8');
    return findManifestEntry(src, pluginId) ?? { title: pluginId, pattern: '', time: '', space: '', difficulty: 'Medium', visual: '' };
  }
  if (pluginId.startsWith('prep-')) {
    const src = readFileSync(join(root, 'src/plugins/imported/prepManifest.ts'), 'utf8');
    return findManifestEntry(src, pluginId) ?? { title: pluginId, pattern: '', time: '', space: '', difficulty: 'Medium', visual: '' };
  }
  return { title: pluginId, pattern: '', time: '', space: '', difficulty: 'Medium', visual: '' };
}

const meta = loadMeta(id);
const complexityLine = [meta.time, meta.space].filter(Boolean).join(' · ') || 'See plugin meta';

const draft = [
  {
    id: 'pattern',
    prompt: `What is the core pattern for “${meta.title}”?`,
    choices: [
      { label: `${meta.pattern || 'Fill from INIT/DONE captions'} — fits this problem`, correct: true },
      { label: 'Brute-force enumerate all possibilities — different approach' },
      { label: 'Sort then scan linearly — different approach' },
      { label: 'Two pointers from both ends only — different approach' },
    ],
    explain: meta.pattern || meta.visual || 'Replace after reviewing recorder captions.',
  },
  {
    id: 'init-invariant',
    prompt: `At the start of a run (${meta.title}), what state is established?`,
    choices: [
      { label: 'Paste the INIT caption invariant here — matches recorder', correct: true },
      { label: 'The answer is already computed — wrong start state' },
      { label: 'The input array must be sorted descending — wrong start state' },
      { label: 'All nodes are permanently marked visited — wrong start state' },
    ],
    explain: 'Derive from recorder INIT move.caption — what variables are initialized and why.',
  },
  {
    id: 'complexity',
    prompt: `What is the typical time/space tradeoff for this problem?`,
    choices: [
      { label: `${complexityLine} — standard solution runtime`, correct: true },
      { label: 'O(1) time and space always — wrong order of growth' },
      { label: 'O(n³) time, O(n²) space — wrong order of growth' },
      { label: 'Exponential time is required for every input — wrong order of growth' },
    ],
    explain: `Manifest lists ${complexityLine}. Adjust if the visualized algorithm differs from the Go solution.`,
  },
];

if (promote) {
  const lines = [
    'const practiceQuiz = [',
    ...draft.map((q) => {
      const choices = q.choices
        .map((c) => `      { label: ${JSON.stringify(c.label)}${c.correct ? ', correct: true' : ''} }`)
        .join(',\n');
      return `  {\n    id: ${JSON.stringify(q.id)},\n    prompt: ${JSON.stringify(q.prompt)},\n    choices: [\n${choices},\n    ],\n    explain: ${JSON.stringify(q.explain)},\n  }`;
    }),
    '] satisfies QuizQuestion[];',
    '',
    'export const practice = {',
    '  quiz: practiceQuiz,',
    `  simulateQuestion: ${JSON.stringify(draft[1]?.prompt ?? draft[0].prompt)},`,
    '} satisfies ProblemSimulator[\'practice\'];',
  ];
  console.log(`// Paste into prepSimulators/problems/<slug>.tsx after human review\n`);
  console.log(lines.join('\n'));
} else {
  console.log(JSON.stringify({ pluginId: id, meta, quiz: draft, promoteHint: 'Re-run with --promote for TS snippet' }, null, 2));
}
