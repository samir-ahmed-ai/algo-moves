import type { ProblemPlugin } from '../core';
import { binarySearchPlugin } from './binary-search';
import { bubbleSortPlugin } from './bubble-sort';
import { selectionSortPlugin } from './selection-sort';
import { insertionSortPlugin } from './insertion-sort';
import { quickSortPlugin } from './quick-sort';
import { mergeSortPlugin } from './merge-sort';
import { heapSortPlugin } from './heap-sort';
import { nQueensPlugin } from './n-queens';
import { treeTraversalsPlugin } from './tree-traversals';
import { triePlugin } from './trie';
import { heapOperationsPlugin } from './heap-operations';
import { unionFindPlugin } from './union-find';
import { reverseLinkedListPlugin } from './reverse-linked-list';
import { linkedListCyclePlugin } from './linked-list-cycle';
import { intervalSchedulingPlugin } from './interval-scheduling';
import { twoSumSortedPlugin } from './two-sum-sorted';
import { maxSubarraySumKPlugin } from './max-subarray-sum-k';
import { longestSubstringPlugin } from './longest-substring';
import { importedPlugins } from './imported';
import { prepPlugins } from './imported/prep';
import { goCoursePlugins } from './go-course';

/**
 * The plugin manifest. To add a problem visualizer, build a folder under
 * src/plugins/<name>/ exporting a ProblemPlugin and append it here — the shell,
 * sidebar, player and move log pick it up with no further wiring.
 *
 * `importedPlugins` are auto-generated from algo/progress/**\/solution.go
 * (see scripts/import-problems.mjs) — the full reference library.
 *
 * Overlapping curated problems (is-bipartite, climbing-stairs, etc.) are
 * imported-canonical — see courses.ts pluginId and imported/practice/migrated.ts.
 */
export const plugins: ProblemPlugin<any, any>[] = [
  unionFindPlugin,
  treeTraversalsPlugin,
  triePlugin,
  binarySearchPlugin,
  twoSumSortedPlugin,
  maxSubarraySumKPlugin,
  longestSubstringPlugin,
  reverseLinkedListPlugin,
  linkedListCyclePlugin,
  bubbleSortPlugin,
  selectionSortPlugin,
  insertionSortPlugin,
  quickSortPlugin,
  mergeSortPlugin,
  heapSortPlugin,
  heapOperationsPlugin,
  nQueensPlugin,
  intervalSchedulingPlugin,
  ...importedPlugins,
  ...prepPlugins,
  ...goCoursePlugins,
];
