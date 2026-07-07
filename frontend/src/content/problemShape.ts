/**
 * Per-problem drawable shape + mnemonic glyph resolution. Extracted from
 * CategoryBoard so the topic board, the home launchpad, and Mobile Mode all draw
 * the *same* little picture for a problem from one source of truth.
 *
 * Glyphs are inner SVG markup drawn in a `0 0 48 48` viewBox; strokes inherit
 * `currentColor` with `var(--accent)`/good/bad focal detail, so they stay
 * theme-safe across dark / light / colour-blind / preset palettes.
 */
import type { Item } from './types';
import { PROBLEM_GLYPHS } from './glyphs';

export type ShapeKey =
  | 'graph'
  | 'array'
  | 'tree'
  | 'grid'
  | 'linkedList'
  | 'heap'
  | 'dp'
  | 'binarySearch'
  | 'backtracking'
  | 'generic';

/** Per-shape fallback glyph — used when a problem has no bespoke glyph by id. */
export const SHAPE_GLYPHS: Record<ShapeKey, string> = {
  graph:
    '<circle cx="11" cy="15" r="3.2"/><circle cx="31" cy="10" r="3.2"/><circle cx="38" cy="28" r="3.2"/><circle cx="17" cy="36" r="3.2"/><circle cx="24" cy="23" r="2.6" fill="var(--accent)" stroke="none"/><path d="M13.6 13.4 28.4 11M13 17.6 16 33M19.4 35 35.4 29.4M14 16.6 21.6 22M33.6 11.8 26.2 21"/>',
  array:
    '<rect x="6" y="19" width="8" height="10" rx="1"/><rect x="15" y="19" width="8" height="10" rx="1"/><rect x="24" y="19" width="8" height="10" rx="1"/><rect x="33" y="19" width="8" height="10" rx="1"/><path d="M10 34.5v2M28 34.5v2"/><path d="M12.4 36.5 10 38.5 7.6 36.5" stroke="var(--accent)"/><path d="M30.4 36.5 28 38.5 25.6 36.5" stroke="var(--accent)"/>',
  tree: '<circle cx="24" cy="9" r="3.2" fill="var(--accent)" stroke="none"/><circle cx="13" cy="25" r="3.2"/><circle cx="35" cy="25" r="3.2"/><circle cx="8" cy="40" r="3"/><circle cx="19" cy="40" r="3"/><circle cx="35" cy="40" r="3"/><path d="M21.6 11.4 15.4 22.6M26.4 11.4 32.6 22.6M11.2 27.8 9.2 37.2M14.8 27.8 17.6 37.2M35 28.2v9"/>',
  grid: '<rect x="8" y="8" width="32" height="32" rx="2"/><path d="M18.7 8v32M29.3 8v32M8 18.7h32M8 29.3h32"/><rect x="18.7" y="18.7" width="10.6" height="10.6" fill="var(--accent)" fill-opacity="0.85" stroke="none"/>',
  linkedList:
    '<rect x="5" y="19" width="11" height="10" rx="2"/><rect x="24" y="19" width="11" height="10" rx="2"/><circle cx="42" cy="24" r="2.4" fill="currentColor" stroke="none"/><path d="M16 24h5.4" stroke="var(--accent)"/><path d="M19.4 21.6 22 24 19.4 26.4" stroke="var(--accent)"/><path d="M35 24h4.6"/><circle cx="10.5" cy="24" r="1.5" fill="var(--accent)" stroke="none"/>',
  heap: '<circle cx="24" cy="10" r="3.2" fill="var(--accent)" stroke="none"/><circle cx="14" cy="25" r="3.2"/><circle cx="34" cy="25" r="3.2"/><circle cx="9" cy="39" r="3"/><circle cx="19" cy="39" r="3"/><circle cx="29" cy="39" r="3"/><path d="M21.8 12.4 16.2 22.6M26.2 12.4 31.8 22.6M12.2 27.6 10.4 36.4M15.8 27.6 17.6 36.4M32 27.6 30.2 36.4"/>',
  dp: '<rect x="7" y="9" width="34" height="30" rx="2"/><path d="M7 19h34M7 29h34M17 9v30M27 9v30"/><rect x="7" y="9" width="10" height="10" fill="var(--good)" fill-opacity="0.8" stroke="none"/><rect x="17" y="9" width="10" height="10" fill="var(--good)" fill-opacity="0.4" stroke="none"/><rect x="7" y="19" width="10" height="10" fill="var(--good)" fill-opacity="0.4" stroke="none"/><rect x="17" y="19" width="10" height="10" fill="var(--accent)" stroke="none"/>',
  binarySearch:
    '<rect x="5" y="20" width="6.4" height="9" rx="1" opacity="0.4"/><rect x="12.4" y="20" width="6.4" height="9" rx="1" opacity="0.4"/><rect x="19.8" y="18.5" width="7.4" height="12" rx="1" stroke="var(--accent)"/><rect x="28.2" y="20" width="6.4" height="9" rx="1"/><rect x="35.6" y="20" width="6.4" height="9" rx="1"/><path d="M23.5 14.4v3.4" stroke="var(--accent)"/><path d="M21.4 14.6 23.5 12.4 25.6 14.6z" fill="var(--accent)" stroke="var(--accent)"/>',
  backtracking:
    '<circle cx="24" cy="9" r="2.8"/><circle cx="13" cy="24" r="2.8"/><circle cx="35" cy="24" r="2.8" fill="var(--accent)" stroke="none"/><circle cx="31" cy="39" r="2.6"/><circle cx="40" cy="39" r="2.6"/><path d="M22.2 11.2 15 21.4M26 11.2 33.2 21.4M35.6 26.6 31.8 36.4M36.6 26.6 39.4 36.4"/><path d="M11.2 26.2 8 32" stroke="var(--bad)" stroke-dasharray="2 2.2"/><path d="M8.4 31.6 10.8 30.8 10.2 28.2" stroke="var(--bad)"/>',
  generic:
    '<rect x="11" y="7" width="26" height="34" rx="3"/><path d="M16 16h16M16 22h16M16 28h11"/><circle cx="31" cy="31" r="6" stroke="var(--accent)"/><path d="M35.4 35.4 39.5 39.5" stroke="var(--accent)"/>',
};

const COURSE_SHAPE: Record<string, ShapeKey> = {
  graphs: 'graph',
  trees: 'tree',
  heaps: 'heap',
  'linked-lists': 'linkedList',
  'binary-search': 'binarySearch',
  'dynamic-programming': 'dp',
  backtracking: 'backtracking',
  arrays: 'array',
  greedy: 'array',
  // prep library courses whose problems don't carry a shape-matching tag.
  'prep-hash-maps': 'array',
  'prep-stacks-queues': 'array',
  'prep-prefix-sum': 'array',
  'prep-math': 'array',
};

/** Map a problem to one drawable shape — most-specific structure tag first, then pattern, then course. */
export function shapeFor(item: Item): ShapeKey {
  const has = (t: string) => item.tags.includes(t);
  if (has('linked-list')) return 'linkedList';
  if (has('heap') || has('priority-queue')) return 'heap';
  if (has('trie')) return 'tree';
  if (has('grid')) return 'grid';
  if (has('tree')) return 'tree';
  if (has('dp')) return 'dp';
  if (has('binary-search')) return 'binarySearch';
  if (has('backtracking')) return 'backtracking';
  if (
    has('graph') ||
    has('bfs') ||
    has('dfs') ||
    has('topological-sort') ||
    has('dijkstra') ||
    has('union-find') ||
    has('mst') ||
    has('shortest-path') ||
    has('2-coloring')
  )
    return 'graph';
  if (
    has('two-pointers') ||
    has('sliding-window') ||
    has('sorting') ||
    has('intervals') ||
    has('array') ||
    has('string')
  )
    return 'array';
  return COURSE_SHAPE[item.courseId] ?? 'generic';
}

/** Bespoke glyph by id (item then plugin), falling back to the per-shape glyph. */
export function glyphFor(item: Item): string {
  return (
    PROBLEM_GLYPHS[item.id] ??
    (item.pluginId ? PROBLEM_GLYPHS[item.pluginId] : undefined) ??
    SHAPE_GLYPHS[shapeFor(item)]
  );
}
