#!/usr/bin/env node
/**
 * Scaffold practice.ts + cases.ts + wireTeachingStack for visualizer-only native plugins.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PLUGINS = [
  { id: 'bubble-sort', title: 'Bubble sort', simulateQ: 'Which adjacent pair is compared next?' },
  { id: 'selection-sort', title: 'Selection sort', simulateQ: 'Which index is selected as the minimum next?' },
  { id: 'insertion-sort', title: 'Insertion sort', simulateQ: 'Which element is inserted next?' },
  { id: 'merge-sort', title: 'Merge sort', simulateQ: 'Which subarray merge happens next?' },
  { id: 'quick-sort', title: 'Quick sort', simulateQ: 'Which partition step happens next?' },
  { id: 'heap-sort', title: 'Heap sort', simulateQ: 'Which heap operation happens next?' },
  { id: 'heap-operations', title: 'Heap operations', simulateQ: 'Which heap index swaps next?' },
  { id: 'reverse-linked-list', title: 'Reverse linked list', simulateQ: 'Which pointer moves next?' },
  { id: 'linked-list-cycle', title: 'Linked list cycle', simulateQ: 'Which pointer advances next?' },
  { id: 'interval-scheduling', title: 'Interval scheduling', simulateQ: 'Which interval is picked next?' },
  { id: 'two-sum-sorted', title: 'Two sum (sorted)', simulateQ: 'Which pointer moves next?' },
  { id: 'max-subarray-sum-k', title: 'Max subarray sum k', simulateQ: 'How does the window shift next?' },
  { id: 'longest-substring', title: 'Longest substring', simulateQ: 'How does the window expand or shrink next?' },
];

for (const { id, title, simulateQ } of PLUGINS) {
  const dir = join(root, 'src/plugins', id);
  const indexPath = join(dir, 'index.tsx');
  if (!existsSync(indexPath)) {
    console.warn(`skip ${id}: no index.tsx`);
    continue;
  }

  const practicePath = join(dir, 'practice.ts');
  if (!existsSync(practicePath)) {
    writeFileSync(
      practicePath,
      `import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'category',
    prompt: 'What is the main technique in ${title}?',
    choices: [
      { label: 'Follow the step-by-step invariant shown in the visualizer', correct: true },
      { label: 'Random guessing until the answer matches' },
      { label: 'Binary search on the output' },
      { label: 'Memoize every recursive call without a table' },
    ],
    explain: 'Watch how each move preserves the algorithm invariant — that is the core interview skill for ${title}.',
  },
  {
    id: 'complexity',
    prompt: 'Why does the visualizer emit one frame per move?',
    choices: [
      { label: 'Each frame is one meaningful algorithm step you must be able to narrate', correct: true },
      { label: 'Frames are only for animation polish' },
      { label: 'One frame equals one line of Go code always' },
      { label: 'Frames batch many unrelated operations together' },
    ],
    explain: 'Interviewers ask you to trace the algorithm step by step; each frame matches one such step.',
  },
];

export const codePieces: CodePiece[] = [];
`,
    );
  }

  const casesPath = join(dir, 'cases.ts');
  if (!existsSync(casesPath)) {
    writeFileSync(
      casesPath,
      `import type { WorkedCase } from '../_shared/practice';

/** Worked examples — extend with problem-specific inputs from index.tsx. */
export const goodCases: WorkedCase<any>[] = [
  {
    id: 'basic',
    title: 'Basic run',
    input: {},
    inputLabel: 'default sample input',
    returns: 'see visualizer',
    tone: 'ok',
    question: 'What invariant does ${title} maintain each step?',
    answer: 'Each move in the replay preserves the algorithm invariant shown in the captions — trace one frame at a time.',
  },
];
`,
    );
  }

  let index = readFileSync(indexPath, 'utf8');
  if (index.includes('wireTeachingStack')) {
    console.log(`skip ${id}: already wired`);
    continue;
  }

  if (!index.includes("from '../_shared/pluginKit'")) {
    index = index.replace(
      /from '\.\.\/\.\.\/core\/types'/,
      "from '../../core/types';\nimport { wireTeachingStack } from '../_shared/pluginKit'",
    );
  }
  if (!index.includes('./cases')) {
    index = index.replace(
      /^(import .+\n)+/m,
      (block) => `${block}import { goodCases } from './cases';\nimport { quiz, codePieces } from './practice';\n`,
    );
  }

  const pluginExport = index.match(/export const \w+ = definePlugin[^{]+\{/);
  if (!pluginExport) {
    console.warn(`skip ${id}: no definePlugin export`);
    continue;
  }

  if (!index.includes('codePieces,')) {
    index = index.replace(/(\n  code: \{)/, '\n  codePieces,\n  quiz,$1');
  }

  const teachingBlock = `
  ...(() => {
    const teaching = wireTeachingStack({
      record,
      View,
      inputs,
      verdict,
      practice: { quiz, codePieces, cases: { good: goodCases }, simulateQuestion: '${simulateQ.replace(/'/g, "\\'")}' },
    });
    return { tabs: teaching.tabs, wires: teaching.wires };
  })(),
`;

  if (!index.includes('tabs:')) {
    index = index.replace(/\n\}\);\s*$/, `${teachingBlock}\n});\n`);
  }

  writeFileSync(indexPath, index);
  console.log(`+ ${id}`);
}

console.log('Done scaffolding visualizer-only plugins.');
