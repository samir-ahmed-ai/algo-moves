import type { Frame, Tone } from '../../core/types';
import { createRecorder } from './createRecorder';

/** Level-order tree representation used by prep tree simulators. */
export type LevelOrderTree = (number | null)[];

export interface TreeWalkState {
  tree: LevelOrderTree;
  current: number | null;
  visited: number[];
  depth: number;
  result: unknown;
  done: boolean;
}

export function createTreeRecorder(tree: LevelOrderTree, overrides?: Partial<TreeWalkState>) {
  return createRecorder<TreeWalkState>(() => ({
    tree,
    current: null,
    visited: [],
    depth: 0,
    result: null,
    done: false,
    ...overrides,
  }));
}

export function leftChild(i: number): number {
  return 2 * i + 1;
}

export function rightChild(i: number): number {
  return 2 * i + 2;
}

export function parent(i: number): number {
  return Math.floor((i - 1) / 2);
}

export function nodeValue(tree: LevelOrderTree, i: number): number | null {
  return i >= 0 && i < tree.length ? (tree[i] ?? null) : null;
}

export type TreeEmit = (
  type: string,
  note: string,
  caption: string,
  partial?: Partial<TreeWalkState>,
  tone?: Tone,
) => void;

/** Record a DFS visit sequence over a level-order tree array. */
export function recordTreeDfs(
  tree: LevelOrderTree,
  visit: (i: number, depth: number, emit: TreeEmit, ctx: { visited: Set<number> }) => void,
  initCaption: string,
): Frame<TreeWalkState>[] {
  const visited = new Set<number>();
  const { emit, frames } = createTreeRecorder(tree);
  emit('INIT', `n=${tree.length}`, initCaption, {});
  const walk = (i: number, depth: number) => {
    if (i < 0 || i >= tree.length || tree[i] == null || visited.has(i)) return;
    visit(i, depth, emit, { visited });
    visited.add(i);
    walk(leftChild(i), depth + 1);
    walk(rightChild(i), depth + 1);
  };
  if (tree.length > 0 && tree[0] != null) walk(0, 0);
  return frames;
}
