#!/usr/bin/env node
// Scaffold a new ProblemPlugin (#96).  Usage:
//   npm run new-problem -- <kebab-id> "Title" [--difficulty Easy|Medium|Hard] [--dry-run]
// Creates src/plugins/<id>/index.tsx from a template and prints the two
// registration steps. See src/plugins/README.md for the full contract.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const id = positional[0];
const title = positional[1] ?? id;
const diffIdx = args.indexOf('--difficulty');
const difficulty = diffIdx >= 0 ? args[diffIdx + 1] : 'Easy';

if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Usage: npm run new-problem -- <kebab-id> "Title" [--difficulty Easy|Medium|Hard] [--dry-run]');
  console.error('  <kebab-id> must be lower-kebab-case, e.g. "two-sum".');
  process.exit(1);
}

const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const Pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
const pluginVar = `${camel}Plugin`;

const template = `import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { ArrayBars, type BarTone } from '../../components/ArrayBars';
import { wireTeachingStack } from '../_shared/pluginKit';
import { InspectorRow, VizEmpty, VizInspector } from '../_shared/vizKit';
import { goodCases, intro } from './cases';
import { quiz, codePieces } from './practice';

export interface ${Pascal}Input {
  values: number[];
}

export interface ${Pascal}State {
  values: number[];
  active: number | null;
}

function record({ values }: ${Pascal}Input): Frame<${Pascal}State>[] {
  const frames: Frame<${Pascal}State>[] = [];
  const emit = (type: string, note: string, caption: string, active: number | null, tone?: 'good' | 'bad') =>
    frames.push({ move: { type, note, caption, tone }, state: { values: values.slice(), active } });

  emit('INIT', 'start', 'Describe what the algorithm is about to do, in plain English.', null);
  for (let i = 0; i < values.length; i++) {
    emit('STEP', \`visit \${i}\`, \`Visiting index \${i} (value \${values[i]}).\`, i);
  }
  emit('DONE', 'done ✓', 'Summarise the result.', null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<${Pascal}State>) {
  const s = frame.state;
  const tone = (i: number): BarTone => (i === s.active ? 'compare' : 'idle');
  return (
    <div className="board-area">
      <ArrayBars values={s.values} tone={tone} height={220} />
    </div>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<${Pascal}State>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VizInspector>
      <InspectorRow k="active" v={s.active ?? '—'} />
    </VizInspector>
  );
}

const goSolution = \`package main

\`;

const inputs = [{ id: 'demo', label: '[5, 2, 8, 1]', value: { values: [5, 2, 8, 1] } }];
const verdict = () => ({ ok: true, label: 'done' });
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, intro }, simulateQuestion: 'Which move comes next?' },
});

export const ${pluginVar} = definePlugin<${Pascal}Input, ${Pascal}State>({
  meta: {
    id: '${id}',
    title: '${title}',
    difficulty: '${difficulty}',
    tags: [],
    summary: 'One-line description of the approach.',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
});
`;

const practiceTemplate = `import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'technique',
    prompt: 'What is the core technique in ${title}?',
    choices: [
      { label: 'Follow the step-by-step invariant in the visualizer', correct: true },
      { label: 'Random search' },
      { label: 'Sort then scan' },
    ],
    explain: 'Each frame shows one meaningful move — narrate the invariant after each step.',
  },
];

export const codePieces: CodePiece[] = [];
`;

const casesTemplate = `import type { WorkedCase } from '../_shared/practice';
import type { ${Pascal}Input } from './index';

export const intro = 'Worked examples for ${title}.';

export const goodCases: WorkedCase<${Pascal}Input>[] = [
  {
    id: 'demo',
    title: 'Demo input',
    input: { values: [5, 2, 8, 1] },
    inputLabel: '[5, 2, 8, 1]',
    returns: 'see visualizer',
    tone: 'ok',
    question: 'What invariant does each step preserve?',
    answer: 'Trace the captions — each move should preserve the algorithm invariant.',
  },
];
`;

const rel = `src/plugins/${id}/index.tsx`;
const target = join(root, rel);

if (dryRun) {
  console.log(`# (dry run) would write ${rel}\n`);
  console.log(template);
} else {
  const dir = join(root, 'src/plugins', id);
  if (existsSync(target)) {
    console.error(`✗ ${rel} already exists — aborting.`);
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, template);
  writeFileSync(join(dir, 'practice.ts'), practiceTemplate);
  writeFileSync(join(dir, 'cases.ts'), casesTemplate);
  console.log(`✓ created ${rel}, practice.ts, cases.ts`);
}

console.log(`\nNext, register it (2 steps):`);
console.log(`  1. src/plugins/index.ts:`);
console.log(`       import { ${pluginVar} } from './${id}';`);
console.log(`       // add ${pluginVar} to the plugins array`);
console.log(`  2. src/content/courses.ts:`);
console.log(`       { id: '${id}', kind: 'problem', pluginId: '${id}', status: 'todo' }`);
