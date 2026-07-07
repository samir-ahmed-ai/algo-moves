#!/usr/bin/env node
// Scaffold a prep simulator stub. Usage:
//   npm run scaffold-prep-sim -- <manifestId-or-slug> [--force]
// Reads prepManifest.ts for title/id and writes prepSimulators/problems/<slug>.tsx
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'src/plugins/imported/prepManifest.ts');
const outDir = join(root, 'src/plugins/imported/prepSimulators/problems');

function parseArgs(argv) {
  const options = { force: false, query: '' };
  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else if (!options.query) {
      options.query = arg.trim();
    } else {
      console.error(`Unexpected argument: ${arg}`);
      process.exit(1);
    }
  }
  return options;
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function tsString(value) {
  return JSON.stringify(String(value ?? ''));
}

const { force, query } = parseArgs(process.argv.slice(2));

if (!query) {
  console.error('Usage: npm run scaffold-prep-sim -- <manifestId-or-slug> [--force]');
  process.exit(1);
}

const raw = readFileSync(manifestPath, 'utf8');
const jsonMatch = raw.match(/export const PREP_DATA[^=]*=\s*(\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error('Could not parse prepManifest.ts');
  process.exit(1);
}
const entries = JSON.parse(jsonMatch[1]);
const normalizedQuery = slugify(query);
const entry = entries.find(
  (e) =>
    e.id === query ||
    e.slug === query ||
    slugify(e.slug) === normalizedQuery ||
    e.id.endsWith(`-${normalizedQuery}`),
);
if (!entry) {
  console.error(`No prep manifest entry for "${query}"`);
  process.exit(1);
}

const slug = slugify(entry.slug);
if (!slug) {
  console.error(`Prep manifest entry has no usable slug: ${entry.id}`);
  process.exit(1);
}

const outPath = join(outDir, `${slug}.tsx`);
if (existsSync(outPath) && !force) {
  console.error(`Already exists: ${outPath} (use --force to overwrite)`);
  process.exit(1);
}

const pascal = slug
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');
const initCaption = `${entry.title}: ${entry.visual || entry.pattern || 'step through the algorithm.'}`;

const template = `import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ${pascal}Input {
  [key: string]: unknown;
}

interface ${pascal}State {
  op: string;
  done: boolean;
}

function record(_input: ${pascal}Input): Frame<${pascal}State>[] {
  const rec = createRecorder<${pascal}State>(() => ({ op: 'init', done: false }));
  rec.emit('INIT', 'start', ${tsString(initCaption)});
  rec.emit('STEP', 'work', 'Take one algorithmic step toward the answer.');
  rec.emit('DONE', 'done', 'Done.', { op: 'done', done: true }, 'good');
  return rec.frames;
}

function View({ frame }: PluginViewProps<${pascal}State>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        op = <span className="font-mono text-ink">{s.op}</span>
        {s.done && ' ✓'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<${pascal}State>) {
  if (!frame) return <VizEmpty />;
  return (
    <VarGrid>
      <InspectorRow k="op" v={frame.state.op} />
      <InspectorRow k="done" v={frame.state.done ? 'yes' : 'no'} />
    </VarGrid>
  );
}

export const manifestId = ${tsString(entry.id)};
export const title = ${tsString(entry.title)};

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ex1', label: 'example', value: {} as ${pascal}Input },
  ] satisfies SampleInput<${pascal}Input>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ${pascal}State | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, template);
console.log(`Wrote ${outPath}`);
console.log(`  manifestId: ${entry.id}`);
console.log(`  title: ${entry.title}`);
