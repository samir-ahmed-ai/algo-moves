import type { WorkedCase } from '../_shared/practice';
import type { UFInput } from './index';

/** Weighted graphs where Kruskal's disjoint-set drives the MST to completion. */
export const goodCases: WorkedCase<UFInput>[] = [
  {
    id: 'triangle',
    title: 'Triangle with a cycle edge (n = 3)',
    input: {
      n: 3,
      edges: [
        [0, 1, 1],
        [1, 2, 2],
        [0, 2, 3],
      ],
      pos: [
        [160, 40],
        [60, 200],
        [260, 200],
      ],
    },
    inputLabel: 'n=3 · edges (0,1,1) (1,2,2) (0,2,3)',
    returns: 'MST weight = 3',
    tone: 'ok',
    question:
      'Three edges, but the spanning tree only needs two — which one is skipped and how does the disjoint-set know?',
    answer:
      'Sorted ascending: (0,1,1) unions {0,1}, (1,2,2) unions {0,1,2}. Now find(0) and find(2) return the same root, so (0,2,3) is a same-set edge — accepting it would close a cycle, so it is rejected. MST = {(0,1),(1,2)}, weight 1+2 = 3.',
  },
  {
    id: 'pentagon',
    title: 'Five nodes, cheapest-first (n = 5)',
    input: {
      n: 5,
      edges: [
        [0, 1, 2],
        [0, 3, 6],
        [1, 2, 3],
        [1, 3, 8],
        [1, 4, 5],
        [2, 4, 7],
        [3, 4, 9],
      ],
      pos: [
        [160, 40],
        [60, 120],
        [110, 220],
        [260, 120],
        [210, 220],
      ],
    },
    inputLabel: 'n=5 · 7 weighted edges',
    returns: 'MST weight = 16',
    tone: 'ok',
    question: 'A spanning tree of 5 nodes needs 4 edges — which 4 does sorting by weight pick?',
    answer:
      'Greedily accept the cheapest edge that joins two different sets: (0,1,2), (1,2,3), (1,4,5), then (0,3,6). Each union merges two trees in the forest, so after 4 accepts all 5 nodes share one root and find returns it for everyone. Total weight 2+3+5+6 = 16.',
  },
  {
    id: 'hex',
    title: 'Six nodes with several cycle edges (n = 6)',
    input: {
      n: 6,
      edges: [
        [0, 1, 4],
        [0, 2, 3],
        [1, 2, 1],
        [1, 3, 2],
        [2, 3, 4],
        [3, 4, 2],
        [4, 5, 6],
        [2, 5, 5],
      ],
      pos: [
        [60, 60],
        [180, 40],
        [120, 140],
        [240, 140],
        [180, 230],
        [60, 200],
      ],
    },
    inputLabel: 'n=6 · 8 weighted edges',
    returns: 'MST weight = 13',
    tone: 'ok',
    question: 'With 8 edges but only 5 MST slots, why do (0,1) and (2,3) end up rejected?',
    answer:
      'Accept (1,2,1), (1,3,2), (3,4,2), (0,2,3). By now {0,1,2,3,4} are one set, so (0,1,4) and (2,3,4) are same-set cycle edges and get skipped. (2,5,5) brings in node 5 — 5 edges, all connected. Weight 1+2+2+3+5 = 13.',
  },
];

/** Edges Kruskal deliberately refuses: both endpoints already share a root. */
export const badCases: WorkedCase<UFInput>[] = [
  {
    id: 'cycle-reject',
    title: 'Square + diagonal: a guaranteed cycle edge (n = 4)',
    input: {
      n: 4,
      edges: [
        [0, 1, 1],
        [1, 2, 1],
        [2, 3, 1],
        [0, 3, 5],
        [0, 2, 9],
      ],
      pos: [
        [60, 60],
        [220, 60],
        [220, 200],
        [60, 200],
      ],
    },
    inputLabel: 'n=4 · ring of 1s + two long chords',
    returns: 'rejects 2 edges',
    tone: 'bad',
    question:
      'After the three weight-1 edges connect everything, what happens to (0,3,5) and (0,2,9)?',
    answer:
      'The three cheapest edges already link {0,1,2,3} into one set with 3 edges (n-1). For (0,3,5), find(0) == find(3); for (0,2,9), find(0) == find(2) — both are same-set edges that would create a cycle, so the disjoint-set rejects them. This is exactly how union-find prevents cycles: union only fires when the two roots differ.',
  },
];
