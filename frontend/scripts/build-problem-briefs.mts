/**
 * Generates problem statements + written test cases for every plugin.
 * Run: `npm run build-problem-briefs`  (check: `--check`).
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ProblemPlugin, SampleInput } from '@/core/types';
import type { PluginGroup } from '@/plugins';
import { curatedPlugins } from '@/plugins';
import { importedPlugins } from '@/plugins/imported';
import { prepPlugins } from '@/plugins/imported/prep';
import { goCoursePlugins } from '@/plugins/go-course';
import { openrtbPlugins } from '@/plugins/openrtb';
import { PREP_DATA } from '@/plugins/imported/prepManifest';
import { PROBLEM_GISTS } from '@/content/gists';
import { ensurePeriod, titleToAsk, secondFromSummary } from './problem-brief-utils.mjs';
import { formatJsonDisplay } from '@/lib/utils/formatJsonDisplay';

function inputDisplayLabel(input: SampleInput<unknown>): string {
  const label = input.label ?? '';
  if (label.startsWith('[') || label.includes('=')) return label;
  return formatJsonDisplay(input.value);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', '_generated');

const GROUPS: [PluginGroup, ProblemPlugin<any, any>[]][] = [
  ['curated', curatedPlugins],
  ['imported', importedPlugins],
  ['prep', prepPlugins],
  ['go-course', goCoursePlugins],
  ['openrtb', openrtbPlugins],
];

interface BriefCase {
  label: string;
  input: string;
  output?: string;
  note?: string;
}

interface BriefEntry {
  statements: [string, string];
  cases: BriefCase[];
}

const prepById = new Map(PREP_DATA.map((p) => [p.id, p]));

const SHAPE_GIST: Record<string, string> = {
  backtracking: 'Explore every choice; undo the ones that fail and keep what works.',
  graph: 'Walk the network node by node to answer a reachability or distance question.',
  binarySearch: 'Halve a sorted range each step to zero in on the answer.',
  dp: 'Split it into overlapping subproblems and build the answer up from small cases.',
  grid: 'Sweep the grid cell by cell, tracking what each position depends on.',
  tree: 'Recurse down the tree, combining answers from the children.',
  array: 'Scan the sequence, keeping just enough state to solve it in one pass.',
  heap: 'Keep the best candidate on top so each step pulls the min or max in log time.',
  linkedList: 'Re-thread the pointers as you walk the list once.',
  generic: 'Read the setup, then spot the pattern that cracks it.',
};

function gistForPlugin(
  id: string,
  meta: { title: string; summary: string; tags: string[] },
): string {
  const curated = PROBLEM_GISTS[id];
  if (curated) return curated;

  const sentence =
    meta.summary
      .trim()
      .match(/^.*?[.!?](\s|$)/)?.[0]
      ?.trim()
      .replace(/[.!?]+$/, '') ?? '';
  if (sentence.split(/\s+/).length >= 5 && sentence.length <= 120) {
    return `${sentence}.`;
  }

  const tags = meta.tags;
  if (tags.some((t) => ['graph', 'bfs', 'dfs', 'union-find'].includes(t))) return SHAPE_GIST.graph;
  if (tags.includes('dp')) return SHAPE_GIST.dp;
  if (tags.includes('binary-search')) return SHAPE_GIST.binarySearch;
  if (tags.includes('backtracking')) return SHAPE_GIST.backtracking;
  if (tags.includes('linked-list')) return SHAPE_GIST.linkedList;
  if (tags.includes('heap')) return SHAPE_GIST.heap;
  if (tags.includes('tree')) return SHAPE_GIST.tree;
  if (tags.includes('array') || tags.includes('string')) return SHAPE_GIST.array;
  return SHAPE_GIST.generic;
}

function insightForPlugin(
  id: string,
  meta: { summary: string },
  first: string,
  prep?: (typeof PREP_DATA)[number],
): string {
  if (prep?.visual) return ensurePeriod(prep.visual);
  const fromSummary = secondFromSummary(meta.summary, first);
  if (fromSummary) return fromSummary;
  if (prep?.pattern) return ensurePeriod(`Core pattern: ${prep.pattern}`);
  if (prep?.memorize) return ensurePeriod(prep.memorize);
  return 'Use the animation to watch how state evolves step by step.';
}

function askForPlugin(
  id: string,
  meta: { title: string; summary: string; tags: string[] },
): string {
  const gist = PROBLEM_GISTS[id];
  if (gist) return ensurePeriod(gist);
  const prep = prepById.get(id);
  if (prep?.ask?.trim()) return ensurePeriod(prep.ask);
  if (prep) return titleToAsk(prep.title, prep.slug);
  return ensurePeriod(gistForPlugin(id, meta));
}

function caseOutput(plugin: ProblemPlugin<any, any>, input: SampleInput<any>): string | undefined {
  try {
    const frames = plugin.record(input.value);
    if (!frames.length) return undefined;
    const verdict = plugin.verdict?.(frames);
    if (!verdict?.ok || !verdict.label) return undefined;
    return verdict.label.replace(/^→\s*/, '').trim();
  } catch {
    return undefined;
  }
}

function casesForPlugin(
  plugin: ProblemPlugin<any, any>,
  prep?: (typeof PREP_DATA)[number],
): BriefCase[] {
  const defaultNote = prep?.visual ? ensurePeriod(prep.visual) : undefined;
  return plugin.inputs.slice(0, 2).map((input, i) => {
    const output = caseOutput(plugin, input);
    return {
      label: `Example ${i + 1}`,
      input: inputDisplayLabel(input),
      ...(output ? { output } : {}),
      ...(input.hint || defaultNote ? { note: input.hint ?? defaultNote } : {}),
    };
  });
}

function briefForPlugin(plugin: ProblemPlugin<any, any>): BriefEntry {
  const id = plugin.meta.id;
  const prep = prepById.get(id);
  const meta = {
    title: plugin.meta.title,
    summary: plugin.meta.summary,
    tags: plugin.meta.tags,
  };
  const first = askForPlugin(id, meta);
  const second = insightForPlugin(id, meta, first, prep);
  return {
    statements: [first, second],
    cases: casesForPlugin(plugin, prep),
  };
}

const briefs: Record<string, BriefEntry> = {};
const seen = new Set<string>();

for (const [, plugins] of GROUPS) {
  for (const plugin of plugins) {
    const id = plugin.meta.id;
    if (seen.has(id)) continue;
    seen.add(id);
    briefs[id] = briefForPlugin(plugin);
  }
}

const BANNER =
  '// AUTO-GENERATED by scripts/build-problem-briefs.mts — do not edit by hand.\n' +
  '// Run `npm run build-problem-briefs` after changing plugins, prep data, or gists.\n' +
  '// Output: src/content/_generated/problemBriefs.ts\n';

const outFile =
  BANNER +
  `export interface GeneratedProblemBriefCase {\n` +
  `  label: string;\n  input: string;\n  output?: string;\n  note?: string;\n}\n\n` +
  `export interface GeneratedProblemBrief {\n` +
  `  statements: [string, string];\n  cases: GeneratedProblemBriefCase[];\n}\n\n` +
  `export const GENERATED_PROBLEM_BRIEFS: Record<string, GeneratedProblemBrief> = ${JSON.stringify(briefs, null, 2)};\n`;

const target = join(outDir, 'problemBriefs.ts');
const check = process.argv.includes('--check');
const current = existsSync(target) ? readFileSync(target, 'utf8') : null;

if (current === outFile) {
  if (check) console.log(`✓ problem briefs up to date (${Object.keys(briefs).length} plugins).`);
} else if (check) {
  console.error(`✗ problemBriefs.ts is out of date — run \`npm run build-problem-briefs\`.`);
  process.exit(1);
} else {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(target, outFile);
  console.log(`✓ wrote problemBriefs.ts (${Object.keys(briefs).length} plugins).`);
}
