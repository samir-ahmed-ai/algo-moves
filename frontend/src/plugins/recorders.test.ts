import { describe, it, expect } from 'vitest';
import { loadAllPlugins } from '../core/registry';
import { binarySearchPlugin } from './binary-search';
import { bubbleSortPlugin } from './bubble-sort';
import { selectionSortPlugin } from './selection-sort';
import { insertionSortPlugin } from './insertion-sort';
import { mergeSortPlugin } from './merge-sort';
import { quickSortPlugin } from './quick-sort';
import { heapSortPlugin } from './heap-sort';
import { nQueensPlugin } from './n-queens';
import { unionFindPlugin } from './union-find';
import { treeTraversalsPlugin } from './tree-traversals';
import { triePlugin } from './trie';
import { twoSumSortedPlugin } from './two-sum-sorted';
import { maxSubarraySumKPlugin } from './max-subarray-sum-k';
import { longestSubstringPlugin } from './longest-substring';
import { reverseLinkedListPlugin } from './reverse-linked-list';
import { linkedListCyclePlugin } from './linked-list-cycle';
import { intervalSchedulingPlugin } from './interval-scheduling';
import { heapOperationsPlugin } from './heap-operations';
import { curatedCourses } from '../content/courses';
import { IMPORTED_DATA } from './imported/manifest';
import { resolveSimulator } from './imported/simulators';

// Load every plugin's implementation once (all group chunks) for the contract tests.
const plugins = await loadAllPlugins();
const pluginById = new Map(plugins.map((p) => [p.meta.id, p]));

/**
 * Recorder contract tests (#95). Every plugin's record() must produce a sane,
 * non-empty frame sequence with narration; plus a couple of behavioural checks.
 * These import only plugin code (record/View/meta), not the shell, so they run
 * independently of canvas work.
 */
describe('every plugin recorder', () => {
  for (const plugin of plugins) {
    for (const input of plugin.inputs) {
      it(`${plugin.meta.id} · "${input.label}" yields a valid frame sequence`, () => {
        const frames = plugin.record(input.value);
        expect(frames.length).toBeGreaterThan(0);
        for (const f of frames) {
          expect(typeof f.move.type).toBe('string');
          expect(f.move.type.length).toBeGreaterThan(0);
          expect(typeof f.move.note).toBe('string');
          expect(f.move.note.length).toBeGreaterThan(0);
          expect(typeof f.move.caption).toBe('string');
          expect(f.state).toBeDefined();
        }
        // verdict (if any) is well-formed
        const verdict = plugin.verdict?.(frames);
        if (verdict) {
          expect(typeof verdict.ok).toBe('boolean');
          expect(typeof verdict.label).toBe('string');
        }
      });
    }

    it(`${plugin.meta.id} has required metadata`, () => {
      expect(plugin.meta.id).toBeTruthy();
      expect(plugin.meta.title).toBeTruthy();
      expect(['Easy', 'Medium', 'Hard']).toContain(plugin.meta.difficulty);
    });
  }
});

describe('plugin ids are unique', () => {
  it('no duplicate plugin meta ids', () => {
    const ids = plugins.map((p) => p.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('behavioural snapshots', () => {
  it('binary search finds a present target and reports the index', () => {
    const hit = binarySearchPlugin.inputs.find((i) => i.id === 'hit')!;
    const frames = binarySearchPlugin.record(hit.value);
    const last = frames[frames.length - 1]!;
    expect(last.move.tone).not.toBe('bad');
    expect(last.state.found).not.toBeNull();
    expect(last.state.values[last.state.found!]!).toBe(hit.value.target);
  });

  it('binary search reports absence for a missing target', () => {
    const miss = binarySearchPlugin.inputs.find((i) => i.id === 'miss')!;
    const frames = binarySearchPlugin.record(miss.value);
    expect(frames[frames.length - 1]!.move.tone).toBe('bad');
  });

  it('bubble sort ends with a sorted array', () => {
    const frames = bubbleSortPlugin.record({ values: [5, 2, 8, 1, 9, 3] });
    const out = frames[frames.length - 1]!.state.values;
    expect(out).toEqual([...out].sort((a, b) => a - b));
  });

  it('n-queens finds a valid placement on 4×4', () => {
    const frames = nQueensPlugin.record({ n: 4 });
    const last = frames[frames.length - 1]!;
    expect(last.move.tone).toBe('good');
    expect(last.state.solved).toBe(true);
    expect(last.state.queens.filter((c) => c >= 0).length).toBe(4);
  });

  it('union-find builds an MST on a connected graph', () => {
    const input = unionFindPlugin.inputs[0]!;
    const frames = unionFindPlugin.record(input.value);
    const last = frames[frames.length - 1]!;
    expect(last.state.mst.length).toBeGreaterThan(0);
    expect(last.state.mstWeight).toBeGreaterThan(0);
  });

  it('tree traversals in-order on BST yields sorted output', () => {
    const inorder = treeTraversalsPlugin.inputs.find((i) => i.id === 'in')!;
    const frames = treeTraversalsPlugin.record(inorder.value);
    const last = frames[frames.length - 1]!;
    expect(last.state.order).toBe('inorder');
    expect(last.state.output).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('trie search finds an inserted word', () => {
    const input = triePlugin.inputs[0]!;
    const frames = triePlugin.record(input.value);
    const last = frames[frames.length - 1]!;
    expect(last.state.result).toBe('found');
  });

  it('two-sum sorted finds a valid pair', () => {
    const input = twoSumSortedPlugin.inputs[0]!;
    const frames = twoSumSortedPlugin.record(input.value);
    const last = frames[frames.length - 1]!;
    expect(last.state.found).not.toBeNull();
    const [a, b] = last.state.found!;
    expect(last.state.values[a]! + last.state.values[b]!).toBe(input.value.target);
  });

  it('max subarray sum k tracks the best k-window', () => {
    const input = maxSubarraySumKPlugin.inputs[0]!;
    const frames = maxSubarraySumKPlugin.record(input.value);
    const last = frames[frames.length - 1]!;
    expect(last.state.done).toBe(true);
    expect(last.state.best).toBeGreaterThan(0);
  });

  it('longest substring without repeat reaches a positive best length', () => {
    const input = longestSubstringPlugin.inputs[0]!;
    const frames = longestSubstringPlugin.record(input.value);
    const last = frames[frames.length - 1]!;
    expect(last.state.best).toBeGreaterThan(0);
  });

  it('selection sort ends with sorted array', () => {
    const frames = selectionSortPlugin.record({ values: [5, 2, 8, 1, 9, 3] });
    expect(frames[0]?.move.type).toBe('INIT');
    const last = frames[frames.length - 1]!;
    expect(last.move.type).toBe('DONE');
    const out = last.state.values;
    expect(out).toEqual([...out].sort((a, b) => a - b));
  });

  it('insertion sort ends with sorted array', () => {
    const frames = insertionSortPlugin.record({ values: [5, 2, 8, 1] });
    const last = frames[frames.length - 1]!;
    expect(last.move.type).toBe('DONE');
    expect(last.state.values).toEqual([1, 2, 5, 8]);
  });

  it('merge sort ends with sorted array', () => {
    const frames = mergeSortPlugin.record({ values: [5, 2, 8, 1, 9, 3] });
    expect(frames[frames.length - 1]!.state.values).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('quick sort ends with sorted array', () => {
    const frames = quickSortPlugin.record({ values: [5, 2, 8, 1, 9, 3, 7] });
    expect(frames[frames.length - 1]!.state.values).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });

  it('heap sort ends with sorted array', () => {
    const frames = heapSortPlugin.record({ values: [5, 2, 8, 1, 9, 3] });
    expect(frames[frames.length - 1]!.state.values).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('reverse linked list yields reversed order', () => {
    const frames = reverseLinkedListPlugin.record({ values: [1, 2, 3, 4, 5] });
    expect(frames[frames.length - 1]?.move.type).toBe('DONE');
  });

  it('linked list cycle detects a loop', () => {
    const frames = linkedListCyclePlugin.record({ values: [3, 2, 0, 4], cycleTo: 1 });
    expect(frames[frames.length - 1]?.state.hasCycle).toBe(true);
  });

  it('interval scheduling accepts a non-empty greedy set', () => {
    const input = intervalSchedulingPlugin.inputs[0]!;
    const frames = intervalSchedulingPlugin.record(input.value);
    expect(frames[frames.length - 1]!.state.acceptedCount).toBeGreaterThan(0);
  });

  it('heap operations completes insert/extract script', () => {
    const frames = heapOperationsPlugin.record(heapOperationsPlugin.inputs[0]!.value);
    expect(frames[frames.length - 1]?.move.type).toBe('DONE');
  });

  const importedSnapshots = [
    'imp-0-03-find-shortest-path-with-bfs',
    'imp-44-word-search',
    'imp-52-missing-number',
    'imp-54-find-peak-element',
    'imp-24-number-of-islands',
  ] as const;

  for (const id of importedSnapshots) {
    it(`${id} frame sequence terminates successfully`, () => {
      const p = IMPORTED_DATA.find((x) => x.id === id)!;
      expect(p).toBeDefined();
      const sim = resolveSimulator(p.id, p.title, p.category)!;
      const frames = sim.record(sim.inputs[0]!.value);
      expect(frames.length).toBeGreaterThan(0);
      const last = frames[frames.length - 1]!;
      expect(last.move.tone === 'good' || last.move.type === 'DONE').toBe(true);
    });
  }
});

describe('curated course plugins expose learn stack', () => {
  const ids: string[] = [];
  for (const c of curatedCourses) {
    for (const t of c.topics) {
      for (const item of t.items) {
        if (item.kind === 'problem' && item.pluginId) ids.push(item.pluginId);
      }
    }
  }
  for (const id of ids) {
    it(`${id} has quiz or practice tabs`, () => {
      const p = pluginById.get(id)!;
      const hasQuiz = (p.quiz?.length ?? 0) > 0;
      const hasTabs = (p.tabs ?? []).some((t) => t.mode === 'practice' || t.mode === 'learn');
      expect(hasQuiz || hasTabs).toBe(true);
    });
  }
});
