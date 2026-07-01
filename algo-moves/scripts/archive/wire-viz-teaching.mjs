#!/usr/bin/env node
/** Wire wireTeachingStack into remaining visualizer-only plugins. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CONFIG = {
  'selection-sort': { algo: 'Selection sort', simQ: 'Which index is chosen as the minimum next?', label: 'selection passes', sort: true },
  'insertion-sort': { algo: 'Insertion sort', simQ: 'Which element is inserted into the sorted prefix next?', label: 'insertion steps', sort: true },
  'merge-sort': { algo: 'Merge sort', simQ: 'Which merge or split happens next?', label: 'merge steps', sort: true },
  'quick-sort': { algo: 'Quick sort', simQ: 'Which partition step happens next?', label: 'partition steps', sort: true },
  'heap-sort': { algo: 'Heap sort', simQ: 'Which heap sift happens next?', label: 'heapify steps', sort: true },
  'heap-operations': { algo: 'Heap operations', simQ: 'Which heap index swaps next?', label: 'heap ops', sort: false },
  'reverse-linked-list': { algo: 'Reverse linked list', simQ: 'Which pointer moves next?', label: 'pointer moves', sort: false },
  'linked-list-cycle': { algo: 'Floyd cycle detection', simQ: 'Which pointer advances next?', label: 'fast/slow steps', sort: false },
  'interval-scheduling': { algo: 'Interval scheduling', simQ: 'Which interval is picked next?', label: 'greedy picks', sort: false },
  'two-sum-sorted': { algo: 'Two sum sorted', simQ: 'Which pointer moves next?', label: 'two-pointer moves', sort: false },
  'max-subarray-sum-k': { algo: 'Max subarray sum k', simQ: 'How does the window shift next?', label: 'window steps', sort: false },
  'longest-substring': { algo: 'Longest substring', simQ: 'How does the window expand or shrink next?', label: 'window steps', sort: false },
};

for (const [id, cfg] of Object.entries(CONFIG)) {
  const dir = join(root, 'src/plugins', id);
  const indexPath = join(dir, 'index.tsx');
  if (!existsSync(indexPath)) continue;
  let src = readFileSync(indexPath, 'utf8');
  if (src.includes('wireTeachingStack')) {
    console.log(`skip ${id}`);
    continue;
  }

  writeFileSync(
    join(dir, 'cases.ts'),
    cfg.sort
      ? `export { sortGoodCases as goodCases, sortIntro as intro } from '../_shared/sortTeaching';\n`
      : `import type { WorkedCase } from '../_shared/practice';

export const goodCases: WorkedCase<any>[] = [
  {
    id: 'basic',
    title: 'Sample run',
    input: {},
    inputLabel: 'default input',
    returns: 'see visualizer',
    tone: 'ok',
    question: 'What should you watch each frame?',
    answer: 'Follow the caption — each move shows the algorithm invariant for ${cfg.algo}.',
  },
];
export const intro = 'Trace one frame at a time; each caption states the invariant after that move.';
`,
  );

  writeFileSync(
    join(dir, 'practice.ts'),
    cfg.sort
      ? `import { sortQuiz } from '../_shared/sortTeaching';
import type { CodePiece } from '../../lib/codePieces';

export const quiz = sortQuiz('${cfg.algo}');
export const codePieces: CodePiece[] = [];
`
      : `import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'technique',
    prompt: 'What is the core technique in ${cfg.algo}?',
    choices: [
      { label: 'The invariant shown step-by-step in the visualizer', correct: true },
      { label: 'Try every permutation until one works' },
      { label: 'Binary search on the answer without a predicate' },
      { label: 'Sort first, then brute force' },
    ],
    explain: 'Interviewers want you to narrate the invariant each step preserves — that is what the replay teaches.',
  },
];
export const codePieces: CodePiece[] = [];
`,
  );

  if (!src.includes("from '../_shared/pluginKit'")) {
    src = src.replace(
      /^(import .+from '\.\.\/\.\.\/core\/types';)\n/m,
      `$1\nimport { wireTeachingStack } from '../_shared/pluginKit';\nimport { goodCases, intro } from './cases';\nimport { quiz, codePieces } from './practice';\n`,
    );
  }

  const exportMatch = src.match(/export const (\w+) = definePlugin/);
  if (!exportMatch) {
    console.warn(`no export ${id}`);
    continue;
  }

  const teachingBlock = `
const teaching = wireTeachingStack({
  record,
  View,
  inputs,
  verdict,
  practice: {
    quiz,
    codePieces,
    cases: { good: goodCases, intro, goodLabel: '${cfg.label}' },
    simulateQuestion: '${cfg.simQ.replace(/'/g, "\\'")}',
  },
});
`;

  if (!src.includes('const inputs =')) {
    src = src.replace(
      /export const \w+ = definePlugin[^{]+\{\n  meta:/,
      (m) => {
        const inputsMatch = src.match(/  inputs: (\[[\s\S]*?\]),\n/);
        if (!inputsMatch) return m;
        return `${teachingBlock}\nexport const ${exportMatch[1]} = definePlugin`;
      },
    );
    const inputsMatch = src.match(/  inputs: (\[[\s\S]*?\]),\n/);
    if (inputsMatch && !src.includes('const inputs =')) {
      src = src.replace(/  inputs: \[[\s\S]*?\],\n/, '');
      src = src.replace(
        teachingBlock.trim(),
        `const inputs = ${inputsMatch[1]};\n\nconst verdict = () => ({ ok: true, label: 'done' });\n${teachingBlock.trim()}`,
      );
    }
  }

  if (!src.includes('const teaching =')) {
    src = src.replace(
      /export const \w+ = definePlugin/,
      `${teachingBlock}\nexport const ${exportMatch[1]} = definePlugin`,
    );
  }

  if (!src.includes('const inputs =')) {
    const m = src.match(/  inputs: (\[[\s\S]*?\]),\n  record,/);
    if (m) {
      src = src.replace(`  inputs: ${m[1]},\n`, '  inputs,\n');
      src = src.replace(
        /export const \w+ = definePlugin/,
        `const inputs = ${m[1]};\nconst verdict = () => ({ ok: true, label: 'done' });\n${teachingBlock.trim()}\nexport const ${exportMatch[1]} = definePlugin`,
      );
    }
  }

  if (!src.includes('tabs: teaching')) {
    src = src.replace(
      /(code: \{ text: [\s\S]+?\},)\n/,
      `$1\n  codePieces,\n  quiz,\n  tabs: teaching.tabs,\n  wires: teaching.wires,\n`,
    );
  }

  if (src.includes('verdict:') && !src.includes('const verdict =')) {
    src = src.replace(/\n  verdict: [^,\n]+,/, '\n  verdict,');
  }

  writeFileSync(indexPath, src);
  console.log(`+ ${id}`);
}
