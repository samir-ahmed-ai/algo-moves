import type { WorkedCase } from '../_shared/practice';
import type { LSInput } from './index';

export const goodCases: WorkedCase<LSInput>[] = [
  {
    id: 'classic',
    title: 'Longest without repeat',
    input: { s: 'abcabcbb' },
    inputLabel: 's = "abcabcbb"',
    returns: 'length 3 ("abc")',
    tone: 'ok',
    question: 'When you see a duplicate, what happens to the left pointer?',
    answer: 'Jump left to one past the previous occurrence of the duplicate character — the window must stay duplicate-free, so shrink from the left until the repeat is gone.',
  },
];

export const badCases: WorkedCase<LSInput>[] = [
  {
    id: 'repeat-at-edge',
    title: 'Duplicate at window edge',
    input: { s: 'abba' },
    inputLabel: 's = "abba"',
    returns: 'length 2 ("ab" or "ba")',
    tone: 'bad',
    question: 'When the second "b" arrives, why not only move left by one?',
    answer: 'Left must leap past the first "b" at index 1, not just ++, or the window still contains two b\'s. Map last-seen index to avoid off-by-one shrinks.',
  },
];

export const intro = 'Variable window expands right and contracts left when a duplicate appears — track last index per character.';
