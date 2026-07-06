import type { Item } from './types';
import type { SampleInput } from '../core/types';
import { gistFor } from './gists';

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

/** Hand-tuned problem intros and example writeups, keyed by item id or plugin id. */
export const PROBLEM_BRIEFS: Record<string, ProblemBrief> = {
  'prep-arrays-find-duplicate-number': {
    statements: [
      'Given n + 1 integers in the range 1…n, exactly one value appears twice — find it without modifying the array.',
      'Treat each index as a jump link i → nums[i]; a duplicate creates a cycle, and Floyd\'s tortoise-and-hare finds the entrance in O(n) time with O(1) extra space.',
    ],
    cases: [
      {
        label: 'Example 1',
        input: 'nums = [1, 3, 4, 2, 2]',
        output: '2',
        note: 'Following jump links eventually loops on index 2 — the duplicated value is 2.',
      },
      {
        label: 'Example 2',
        input: 'nums = [3, 1, 3, 4, 2]',
        output: '3',
        note: 'Two positions hold 3; cycle detection lands on 3 without a hash set.',
      },
    ],
  },
  'linked-list-cycle': {
    statements: [
      'Given the head of a linked list, decide whether it contains a cycle.',
      'Use fast and slow pointers: if they ever meet, a cycle exists; if fast reaches null, the list is acyclic.',
    ],
    cases: [
      {
        label: 'Example 1',
        input: '3 → 2 → 0 → -4 ↩ (tail connects to node index 1)',
        output: 'true',
        note: 'Slow and fast collide inside the loop.',
      },
      {
        label: 'Example 2',
        input: '1 → 2 (no back edge)',
        output: 'false',
        note: 'Fast reaches the end before any collision.',
      },
    ],
  },
  'binary-search': {
    statements: [
      'Find the index of target in a sorted array, or return -1 if it is absent.',
      'Compare against the midpoint each step and discard the half that cannot contain the target.',
    ],
    cases: [
      {
        label: 'Example 1',
        input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9',
        output: '4',
        note: 'Mid comparisons shrink [0,5] → [3,5] → hit index 4.',
      },
      {
        label: 'Example 2',
        input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2',
        output: '-1',
        note: 'Window collapses with no match.',
      },
    ],
  },
  'climbing-stairs': {
    statements: [
      'Count how many distinct ways you can climb n stairs when each step is 1 or 2.',
      'Each landing depends only on the previous two — fill dp[i] = dp[i-1] + dp[i-2] left to right.',
    ],
    cases: [
      {
        label: 'Example 1',
        input: 'n = 2',
        output: '2',
        note: '1+1 or a single 2-step.',
      },
      {
        label: 'Example 2',
        input: 'n = 3',
        output: '3',
        note: '1+1+1, 1+2, or 2+1.',
      },
    ],
  },
  subsets: {
    statements: [
      'Return every possible subset of the distinct integers in nums.',
      'At each index, branch: include the element or skip it, then backtrack.',
    ],
    cases: [
      {
        label: 'Example 1',
        input: 'nums = [1, 2, 3]',
        output: '[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]',
        note: '2³ subsets from three independent include/skip choices.',
      },
      {
        label: 'Example 2',
        input: 'nums = [0]',
        output: '[[],[0]]',
        note: 'Single element yields empty set plus {0}.',
      },
    ],
  },
};

function formatBriefInput(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function fallbackStatements(item: Item): string[] {
  const lines: string[] = [];
  const gist = gistFor(item);
  if (gist) lines.push(gist);
  if (item.summary && item.summary.length > 4 && !lines.includes(item.summary)) {
    lines.push(item.summary.endsWith('.') ? item.summary : `${item.summary}.`);
  }
  if (lines.length === 0) lines.push('Study the examples, then identify the pattern that drives the solution.');
  if (lines.length === 1) {
    lines.push('Use the animation to watch how state evolves step by step.');
  }
  return lines.slice(0, 2);
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
  if (curated) return curated;
  return {
    statements: fallbackStatements(item),
    cases: casesFromInputs(inputs),
  };
}
