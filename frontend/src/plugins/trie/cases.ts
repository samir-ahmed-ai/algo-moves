import type { WorkedCase } from '../_shared/practice';
import type { TrieInput } from './index';

export const goodCases: WorkedCase<TrieInput>[] = [
  {
    id: 'shared-prefix',
    title: 'Shared prefix reuses nodes',
    input: { insert: ['cat', 'car', 'card'], search: 'car' },
    inputLabel: 'insert ["cat","car","card"] · search "car"',
    returns: 'found',
    tone: 'ok',
    question: 'All three words start with "ca" — how many nodes hold that prefix?',
    answer:
      'Just one chain: root → c → a. "cat" and "car" branch at depth 2, and "card" extends "car" with a "d". Inserting "car" descends into the existing c, a, r nodes, marks r as end-of-word, and search "car" walks that same path to a terminal node.',
  },
  {
    id: 'branch-words',
    title: 'Two words on the same branch',
    input: { insert: ['in', 'inn'], search: 'in' },
    inputLabel: 'insert ["in","inn"] · search "in"',
    returns: 'found',
    tone: 'ok',
    question: 'Both "in" and "inn" live on one chain — how does the trie store both?',
    answer:
      'The chain root → i → n → n holds both. The first "n" is marked end-of-word for "in"; the second "n" is marked end-of-word for "inn". A word can end on an internal node, so search "in" succeeds even though the path continues past it.',
  },
];

export const badCases: WorkedCase<TrieInput>[] = [
  {
    id: 'prefix-not-word',
    title: 'Prefix exists but is not a word',
    input: { insert: ['cat'], search: 'ca' },
    inputLabel: 'insert ["cat"] · search "ca"',
    returns: 'not found',
    tone: 'bad',
    question: 'The path c → a clearly exists. Why does searching "ca" still fail?',
    answer:
      'Search reaches the "a" node fine, but that node was never marked end-of-word — only the final "t" of "cat" carries the terminal flag. A stored word and a mere prefix look the same except for that flag, so "ca" returns not found.',
  },
  {
    id: 'clear-miss',
    title: 'No matching prefix',
    input: { insert: ['cat', 'dog'], search: 'cow' },
    inputLabel: 'insert ["cat","dog"] · search "cow"',
    returns: 'not found',
    tone: 'bad',
    question:
      'Search walks c → o, but the root has children "c" and "d" only — where does it stop?',
    answer:
      'It matches "c" into the cat branch, then looks for an "o" child of "c" and finds none (the only child there is "a"). The walk halts immediately and reports absent — search never scans unrelated branches like "dog".',
  },
];

export const intro =
  'Trie paths share prefixes; terminal flags distinguish whole words from mere prefixes.';
