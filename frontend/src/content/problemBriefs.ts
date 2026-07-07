import type { Item } from './types';
import type { SampleInput } from '../core/types';
import { curatedGistFor, gistFor } from './gists';
import { GENERATED_PROBLEM_BRIEFS } from './_generated/problemBriefs';
import { formatJsonDisplay } from '@/lib/utils/formatJsonDisplay';

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

/** Hand-tuned overrides for weak generated asks or insights. Cases fall through to generated data. */
export const PROBLEM_BRIEFS: Record<string, Partial<ProblemBrief>> = {
  'linked-list-cycle': {
    statements: [
      'Given the head of a linked list, decide whether it contains a cycle.',
      'Use fast and slow pointers: if they ever meet, a cycle exists; if fast reaches null, the list is acyclic.',
    ],
  },
  'binary-search': {
    statements: [
      'Find the index of target in a sorted array, or return -1 if it is absent.',
      'Compare against the midpoint each step and discard the half that cannot contain the target.',
    ],
  },
  'climbing-stairs': {
    statements: [
      'Count how many distinct ways you can climb n stairs when each step is 1 or 2.',
      'Each landing depends only on the previous two — fill dp[i] = dp[i-1] + dp[i-2] left to right.',
    ],
  },
  subsets: {
    statements: [
      'Return every possible subset of the distinct integers in nums.',
      'At each index, branch: include the element or skip it, then backtrack.',
    ],
  },
};

function ensurePeriod(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function gistForItem(item: Item): string | undefined {
  return curatedGistFor(item);
}

function overrideForItem(item: Item): Partial<ProblemBrief> | undefined {
  return PROBLEM_BRIEFS[item.id] ?? (item.pluginId ? PROBLEM_BRIEFS[item.pluginId] : undefined);
}

function generatedForItem(item: Item) {
  const id = (item.pluginId ?? item.id).trim();
  return GENERATED_PROBLEM_BRIEFS[id];
}

function normalizeStatements(statements: ReadonlyArray<string>, item: Item): [string, string] {
  const first = ensurePeriod(statements[0] ?? gistFor(item));
  const second = ensurePeriod(statements[1] ?? fallbackSecond(item, first));
  return [first, second];
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
  if (item.summary && item.summary.length > 4) {
    const fromItem = secondFromSummary(item.summary, first);
    if (fromItem) return fromItem;
  }
  return 'Use the animation to watch how state evolves step by step.';
}

/** Runtime fallback when generated data is missing (safety net). */
function runtimeStatementsFor(item: Item): [string, string] {
  const gist = gistForItem(item);
  if (gist) {
    return [ensurePeriod(gist), fallbackSecond(item, gist)];
  }

  const first = ensurePeriod(gistFor(item));
  const second = secondFromSummary(item.summary ?? '', first) ?? fallbackSecond(item, first);
  return [first, second];
}

/** Resolve two problem-specific sentences for the info panel. */
export function statementsFor(item: Item): [string, string] {
  const override = overrideForItem(item);
  if (override?.statements && override.statements.length >= 2) {
    return normalizeStatements(override.statements, item);
  }

  const generated = generatedForItem(item);
  if (generated?.statements) {
    return normalizeStatements(generated.statements, item);
  }

  return runtimeStatementsFor(item);
}

function casesFromInputs(inputs: SampleInput[]): ProblemBriefCase[] {
  return inputs.slice(0, 2).map((inp, i) => ({
    label: `Example ${i + 1}`,
    input:
      inp.label.trim().startsWith('[') || inp.label.includes('=')
        ? inp.label
        : formatJsonDisplay(inp.value),
    note: inp.hint,
  }));
}

/** Resolve example cases: override → generated → live plugin inputs. */
export function casesFor(item: Item, inputs: SampleInput[] = []): ProblemBriefCase[] {
  const override = overrideForItem(item);
  const generated = generatedForItem(item);

  if (override?.cases && override.cases.length > 0) return override.cases;
  if (generated?.cases && generated.cases.length > 0) return generated.cases;
  return casesFromInputs(inputs);
}

/** Resolve curated, generated, or fallback brief copy for the active problem. */
export function briefFor(item: Item, inputs: SampleInput[] = []): ProblemBrief {
  return {
    statements: [...statementsFor(item)],
    cases: casesFor(item, inputs),
  };
}
