import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { TreeBoard } from '../../components/TreeBoard';
import { QueueTape } from '../../components/QueueTape';
import { InspectorRow, VizEmpty, VizInspector, VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

type Op = { kind: 'insert'; value: number } | { kind: 'extract' };

export interface HeapInput {
  ops: Op[];
}

export interface HeapState {
  heap: number[];
  active: number | null;
  compareWith: number | null;
  swap: [number, number] | null;
  op: string;
  size: number;
}

const parent = (i: number) => Math.floor((i - 1) / 2);
const left = (i: number) => 2 * i + 1;
const right = (i: number) => 2 * i + 2;

function record({ ops }: HeapInput): Frame<HeapState>[] {
  const frames: Frame<HeapState>[] = [];
  const heap: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    fields: { active?: number | null; compareWith?: number | null; swap?: [number, number] | null; op: string },
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        heap: heap.slice(),
        active: fields.active ?? null,
        compareWith: fields.compareWith ?? null,
        swap: fields.swap ?? null,
        op: fields.op,
        size: heap.length,
      },
    });

  emit(
    'INIT',
    'min-heap',
    'A binary min-heap is a complete tree in a level-order array: parent of i is (i-1)/2, children are 2i+1 and 2i+2, and every parent stays ≤ its children.',
    { op: 'start' },
  );

  const siftUp = (start: number, opLabel: string) => {
    let i = start;
    while (i > 0) {
      const p = parent(i);
      emit(
        'SIFTUP',
        `${heap[i]} vs parent ${heap[p]}`,
        `Sift-up: compare ${heap[i]} (index ${i}) with its parent ${heap[p]} (index ${p}).`,
        { active: i, compareWith: p, op: opLabel },
      );
      if (heap[i] >= heap[p]) {
        emit(
          'SIFTUP',
          `${heap[i]} ≥ ${heap[p]}`,
          `${heap[i]} ≥ parent ${heap[p]}, so the heap property holds — stop sifting up.`,
          { active: i, compareWith: p, op: opLabel },
        );
        return;
      }
      emit(
        'SWAP',
        `swap ${heap[i]} ↔ ${heap[p]}`,
        `${heap[i]} < parent ${heap[p]}, so swap them to bubble the smaller value up.`,
        { active: i, compareWith: p, swap: [i, p], op: opLabel },
      );
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
    emit(
      'SIFTUP',
      'reached root',
      'The value reached the root, so the heap property is restored.',
      { active: 0, op: opLabel },
    );
  };

  const siftDown = (start: number, opLabel: string) => {
    let i = start;
    while (true) {
      const l = left(i);
      const r = right(i);
      let smallest = i;
      if (l < heap.length && heap[l] < heap[smallest]) smallest = l;
      if (r < heap.length && heap[r] < heap[smallest]) smallest = r;
      if (smallest === i) {
        emit(
          'SIFTDOWN',
          `${heap[i]} settled`,
          `Sift-down: ${heap[i]} (index ${i}) is ≤ both children, so the heap property holds — stop.`,
          { active: i, op: opLabel },
        );
        return;
      }
      emit(
        'SIFTDOWN',
        `${heap[i]} vs child ${heap[smallest]}`,
        `Sift-down: compare ${heap[i]} (index ${i}) with its smaller child ${heap[smallest]} (index ${smallest}).`,
        { active: i, compareWith: smallest, op: opLabel },
      );
      emit(
        'SWAP',
        `swap ${heap[i]} ↔ ${heap[smallest]}`,
        `${heap[i]} > child ${heap[smallest]}, so swap them to push the larger value down.`,
        { active: i, compareWith: smallest, swap: [i, smallest], op: opLabel },
      );
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  };

  for (const op of ops) {
    if (op.kind === 'insert') {
      const opLabel = `insert ${op.value}`;
      heap.push(op.value);
      const at = heap.length - 1;
      emit(
        'INSERT',
        `push ${op.value}`,
        `Insert ${op.value} at the end of the array (index ${at}) to keep the tree complete, then sift it up.`,
        { active: at, op: opLabel },
      );
      siftUp(at, opLabel);
    } else {
      const opLabel = 'extract-min';
      if (heap.length === 0) {
        emit('EXTRACT', 'empty', 'Extract-min on an empty heap is a no-op.', { op: opLabel });
        continue;
      }
      const min = heap[0];
      emit(
        'EXTRACT',
        `min = ${min}`,
        `Extract-min: the root ${min} (index 0) is the minimum — remove it.`,
        { active: 0, op: opLabel },
      );
      const last = heap.pop() as number;
      if (heap.length === 0) {
        emit(
          'DONE',
          `extracted ${min}`,
          `The heap is now empty after extracting ${min}.`,
          { op: opLabel },
        );
        continue;
      }
      heap[0] = last;
      emit(
        'MOVE',
        `root ← ${last}`,
        `Move the last element ${last} to the root to refill the hole, then sift it down.`,
        { active: 0, op: opLabel },
      );
      siftDown(0, opLabel);
      emit(
        'DONE',
        `extracted ${min}`,
        `Removed ${min}; the new root ${heap[0]} is the current minimum.`,
        { op: opLabel },
      );
    }
  }

  emit(
    'DONE',
    heap.length ? `[${heap.join(',')}]` : 'empty',
    `All operations complete. Final heap (level order) = [${heap.join(', ')}].`,
    { op: 'done' },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<HeapState>) {
  const s = frame.state;
  const swapped = (i: number) => s.swap != null && (s.swap[0] === i || s.swap[1] === i);
  const done = s.op === 'done';
  return (
    <VizStage rail={
      <>
        <RailGroup label="op">
          <RailStat k="current" v={s.op} tone="accent" />
          <RailStat k="size" v={s.size} />
          <RailStat k="root (min)" v={s.size ? s.heap[0] : '—'} />
        </RailGroup>
        {done && <RailResult label="final heap" value={s.size ? `[${s.heap.join(',')}]` : '∅'} tone={s.size ? 'accent' : 'bad'} />}
      </>
    }>
      <TreeBoard
        tree={s.heap}
        nodeClass={(i) =>
          swapped(i) || s.active === i ? 'team-1' : s.compareWith === i ? 'team-2' : 'team-0'
        }
        activeNode={s.active}
        highlightChild={s.compareWith}
      />
      <QueueTape items={s.heap} label="array (level order) →" />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<HeapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VizInspector>
      <InspectorRow k="op" v={s.op} />
      <InspectorRow k="size" v={s.size} />
      <InspectorRow k="root (min)" v={s.size ? s.heap[0] : '—'} />
      <InspectorRow k="array" v={s.size ? `[${s.heap.join(', ')}]` : '∅'} />
    </VizInspector>
  );
}

const goSolution = `package main
type MinHeap struct{ a []int }

func (h *MinHeap) Insert(v int) {
	h.a = append(h.a, v)
	h.siftUp(len(h.a) - 1)
}

func (h *MinHeap) ExtractMin() (int, bool) {
	if len(h.a) == 0 {
		return 0, false
	}
	min := h.a[0]
	last := len(h.a) - 1
	h.a[0] = h.a[last]
	h.a = h.a[:last]
	if len(h.a) > 0 {
		h.siftDown(0)
	}
	return min, true
}

func (h *MinHeap) siftUp(i int) {
	for i > 0 {
		p := (i - 1) / 2
		if h.a[i] >= h.a[p] {
			return
		}
		h.a[i], h.a[p] = h.a[p], h.a[i]
		i = p
	}
}

func (h *MinHeap) siftDown(i int) {
	n := len(h.a)
	for {
		l, r, smallest := 2*i+1, 2*i+2, i
		if l < n && h.a[l] < h.a[smallest] {
			smallest = l
		}
		if r < n && h.a[r] < h.a[smallest] {
			smallest = r
		}
		if smallest == i {
			return
		}
		h.a[i], h.a[smallest] = h.a[smallest], h.a[i]
		i = smallest
	}
}
`;

const script1: Op[] = [
  { kind: 'insert', value: 5 },
  { kind: 'insert', value: 3 },
  { kind: 'insert', value: 8 },
  { kind: 'insert', value: 1 },
  { kind: 'insert', value: 4 },
  { kind: 'extract' },
  { kind: 'extract' },
];

const script2: Op[] = [
  { kind: 'insert', value: 9 },
  { kind: 'insert', value: 6 },
  { kind: 'insert', value: 2 },
  { kind: 'insert', value: 7 },
  { kind: 'extract' },
  { kind: 'insert', value: 1 },
  { kind: 'extract' },
];


const inputs = [
    { id: 'script1', label: 'insert 5,3,8,1,4 · extract×2', value: { ops: script1 } },
    { id: 'script2', label: 'insert 9,6,2,7 · extract · insert 1 · extract', value: { ops: script2 } },
  ];
const verdict = verdictAlwaysOk('done');
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, intro, goodLabel: 'heap ops' }, simulateQuestion: 'Which heap index swaps next?' },
});

export const heapOperationsPlugin = definePlugin<HeapInput, HeapState>({
  meta: {
    id: 'heap-operations',
    title: 'Heap operations',
    difficulty: 'Medium',
    tags: ['heap', 'tree', 'priority-queue'],
    summary: 'Binary min-heap insert and extract-min on a complete tree, showing sift-up and sift-down step by step.',
    source: 'https://leetcode.com/problems/find-k-pairs-with-smallest-sums/',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
});
