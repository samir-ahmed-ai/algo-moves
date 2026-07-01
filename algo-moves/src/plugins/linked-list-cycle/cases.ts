import type { WorkedCase } from '../_shared/practice';
import type { CycleInput } from './index';

export const goodCases: WorkedCase<CycleInput>[] = [
  {
    id: 'meet',
    title: 'Cycle detected',
    input: { values: [3, 2, 0, -4], cycleTo: 1 },
    inputLabel: 'list 3→2→0→−4→2 (cycle at index 1)',
    returns: 'slow meets fast inside cycle',
    tone: 'ok',
    question: 'Why move slow one step and fast two steps?',
    answer: 'Inside a cycle the fast pointer gains one node on slow each lap. They must meet within cycle length steps — O(n) time, O(1) space.',
  },
];

export const badCases: WorkedCase<CycleInput>[] = [
  {
    id: 'no-cycle',
    title: 'Tail ends at null',
    input: { values: [1, 2, 3], cycleTo: -1 },
    inputLabel: 'list 1→2→3→null',
    returns: 'fast reaches null — no cycle',
    tone: 'bad',
    question: 'When does Floyd\'s algorithm return false?',
    answer: 'If fast (or fast.next) becomes null, the list is acyclic. No need for a second phase to find the entrance.',
  },
];

export const intro = "Floyd's tortoise and hare: if there is a cycle, fast and slow must eventually meet.";
