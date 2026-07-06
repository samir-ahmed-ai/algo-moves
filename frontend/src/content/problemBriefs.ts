import type { Item } from './types';
import type { SampleInput } from '../core/types';
import { PROBLEM_GISTS, gistFor } from './gists';
import { PREP_DATA } from '@/plugins/imported/prepManifest';
import { PLUGIN_META } from '@/plugins/_generated/pluginMeta';

export interface ProblemBriefCase {
  label: string;
  input: string;
  output?: string;
  note?: string;
}

export interface ProblemBrief {
  statements: string[];
  cases: ProblemBriefCase[];
}

const prepById = new Map(PREP_DATA.map((p) => [p.id, p]));
const metaById = new Map(PLUGIN_META.map((m) => [m.id, m]));

/** Hand-tuned problem intros and example writeups, keyed by item id or plugin id. */
export const PROBLEM_BRIEFS: Record<string, ProblemBrief> = {
  'linked-list-cycle': {
    statements: [
      'Given the head of a linked list, decide whether it contains a cycle.',
      'Use fast and slow pointers: if they ever meet, a cycle exists; if fast reaches null, the list is acyclic.',
    ],
    cases: [],
  },
  'binary-search': {
    statements: [
      'Find the index of target in a sorted array, or return -1 if it is absent.',
      'Compare against the midpoint each step and discard the half that cannot contain the target.',
    ],
    cases: [],
  },
  'climbing-stairs': {
    statements: [
      'Count how many distinct ways you can climb n stairs when each step is 1 or 2.',
      'Each landing depends only on the previous two — fill dp[i] = dp[i-1] + dp[i-2] left to right.',
    ],
    cases: [],
  },
  subsets: {
    statements: [
      'Return every possible subset of the distinct integers in nums.',
      'At each index, branch: include the element or skip it, then backtrack.',
    ],
    cases: [],
  },
};

function ensurePeriod(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function gistForItem(item: Item): string | undefined {
  return (
    PROBLEM_GISTS[item.id] ?? (item.pluginId ? PROBLEM_GISTS[item.pluginId] : undefined)
  );
}

function prepForItem(item: Item) {
  return prepById.get(item.id) ?? (item.pluginId ? prepById.get(item.pluginId) : undefined);
}

function metaForItem(item: Item) {
  return metaById.get(item.pluginId ?? item.id);
}

/** Split a plugin meta summary into a second statement when it carries detail after ':' or '.'. */
function secondFromSummary(summary: string, first: string): string | undefined {
  const trimmed = summary.trim();
  if (!trimmed || trimmed.length < 12) return undefined;

  const colonIdx = trimmed.indexOf(': ');
  if (colonIdx > 0 && colonIdx < trimmed.length - 3) {
    const second = trimmed.slice(colonIdx + 2).trim();
    if (second.length >= 12 && !first.includes(second)) return ensurePeriod(second);
  }

  const dotMatch = trimmed.match(/^[^.!?]+[.!?]\s+(.+)$/s);
  if (dotMatch?.[1]) {
    const second = dotMatch[1].trim();
    if (second.length >= 12 && !first.includes(second)) return ensurePeriod(second);
  }

  if (trimmed.length >= 12 && trimmed !== first && !first.includes(trimmed)) {
    return ensurePeriod(trimmed);
  }

  return undefined;
}

function fallbackSecond(item: Item, first: string): string {
  const meta = metaForItem(item);
  if (meta?.summary) {
    const fromMeta = secondFromSummary(meta.summary, first);
    if (fromMeta) return fromMeta;
  }
  if (item.summary && item.summary.length > 4) {
    const fromItem = secondFromSummary(item.summary, first);
    if (fromItem) return fromItem;
  }
  const prep = prepForItem(item);
  if (prep?.pattern) {
    return ensurePeriod(`Core pattern: ${prep.pattern}`);
  }
  return 'Use the animation to watch how state evolves step by step.';
}

/** Resolve two problem-specific sentences for the info panel. */
export function statementsFor(item: Item): [string, string] {
  const curated =
    PROBLEM_BRIEFS[item.id] ?? (item.pluginId ? PROBLEM_BRIEFS[item.pluginId] : undefined);
  if (curated?.statements.length >= 2) {
    return [curated.statements[0], curated.statements[1]];
  }

  const prep = prepForItem(item);
  if (prep) {
    const ask = gistForItem(item) ?? `Solve "${prep.title}" on the given input.`;
    const insight = ensurePeriod(prep.visual || prep.acquired.split('—')[0] || prep.pattern);
    return [ensurePeriod(ask), insight];
  }

  const gist = gistForItem(item);
  if (gist) {
    return [ensurePeriod(gist), fallbackSecond(item, gist)];
  }

  const meta = metaForItem(item);
  if (meta?.summary && meta.summary.length > 12) {
    const first = ensurePeriod(gistFor(item));
    const second = secondFromSummary(meta.summary, first) ?? fallbackSecond(item, first);
    return [first, second];
  }

  const lines = [ensurePeriod(gistFor(item)), fallbackSecond(item, gistFor(item))];
  return [lines[0], lines[1]];
}

function formatBriefInput(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function casesFromInputs(inputs: SampleInput[]): ProblemBriefCase[] {
  return inputs.slice(0, 2).map((inp, i) => ({
    label: `Example ${i + 1}`,
    input:
      inp.label.startsWith('[') || inp.label.includes('=') ? inp.label : formatBriefInput(inp.value),
    note: inp.hint,
  }));
}

/** Resolve curated or fallback brief copy for the active problem. */
export function briefFor(item: Item, inputs: SampleInput[] = []): ProblemBrief {
  const curated =
    PROBLEM_BRIEFS[item.id] ?? (item.pluginId ? PROBLEM_BRIEFS[item.pluginId] : undefined);
  const statements = curated?.statements ?? [...statementsFor(item)];
  return {
    statements,
    cases: curated?.cases ?? casesFromInputs(inputs),
  };
}
