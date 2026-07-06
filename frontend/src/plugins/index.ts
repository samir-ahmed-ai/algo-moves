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

/**
 * Plugin groups & lazy loading (#code-split).
 *
 * The catalog, sidebar and search only need plugin *metadata*, which is served
 * synchronously from the generated meta index (src/plugins/_generated). The heavy
 * implementation of each problem (record + View + tabs + code) is loaded on demand,
 * one chunk per group, the first time a problem in that group is opened.
 *
 * `curated` problems are hand-authored under src/plugins/<name>/ and kept in the
 * entry bundle (small, always-linked). The large generated groups — `imported`
 * (reference library), `prep`, and `go-course` — each live behind a dynamic
 * import() so Rollup emits a separate chunk.
 *
 * To add a curated problem: build src/plugins/<name>/ exporting a ProblemPlugin and
 * append it to `curatedPlugins` below — the loader, sidebar, player and move log
 * pick it up. After changing any plugin's metadata, run `npm run build-plugin-meta`.
 */
export type PluginGroup = 'curated' | 'imported' | 'prep' | 'go-course' | 'openrtb';

export const PLUGIN_GROUPS: PluginGroup[] = ['curated', 'imported', 'prep', 'go-course', 'openrtb'];

/** Hand-authored problems, statically linked into the entry bundle. */
export const curatedPlugins: ProblemPlugin<any, any>[] = [
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
];

/**
 * Per-group loaders. `curated` resolves synchronously; the generated groups are
 * dynamic import()s so their manifests + factories land in their own chunk.
 * Registered plugin folders (checked by scripts/check-orphans.mjs): './imported',
 * './imported/prep', './go-course', './openrtb'.
 */
export const GROUP_LOADERS: Record<PluginGroup, () => Promise<ProblemPlugin<any, any>[]>> = {
  curated: async () => curatedPlugins,
  imported: () => import('./imported').then((m) => m.importedPlugins),
  prep: () => import('./imported/prep').then((m) => m.prepPlugins),
  'go-course': () => import('./go-course').then((m) => m.goCoursePlugins),
  openrtb: () => import('./openrtb').then((m) => m.openrtbPlugins),
};
