import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
} from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { ArrayBars, type BarTone } from '../../components/board/ArrayBars';
import { InspectorRow, VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';
import { SortInspector } from '../_shared/sortInspector';

export interface SortInput {
  values: number[];
}

export interface SortState {
  values: number[];
  lo: number | null;
  hi: number | null;
  pivotIdx: number | null;
  i: number | null;
  j: number | null;
  sorted: boolean[];
  comparisons: number;
  swaps: number;
}

function record({ values: initial }: SortInput): Frame<SortState>[] {
  const values = initial.slice();
  const n = values.length;
  const frames: Frame<SortState>[] = [];
  const sorted = new Array<boolean>(n).fill(false);
  let comparisons = 0;
  let swaps = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    lo: number | null,
    hi: number | null,
    pivotIdx: number | null,
    i: number | null,
    j: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, ...(tone !== undefined ? { tone } : {}) },
      state: {
        values: values.slice(),
        lo,
        hi,
        pivotIdx,
        i,
        j,
        sorted: sorted.slice(),
        comparisons,
        swaps,
      },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Quick sort: pick a pivot, partition smaller values to its left and larger to its right, then recurse on each side. Here we use an explicit stack of ranges instead of recursion.`,
    null,
    null,
    null,
    null,
    null,
  );

  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop()!;
    if (lo >= hi) {
      if (lo === hi) {
        sorted[lo] = true;
        emit(
          'SEAT',
          `[${lo}] fixed`,
          `Range [${lo}, ${hi}] has a single element — it is already in its final position.`,
          lo,
          hi,
          null,
          null,
          null,
        );
      }
      continue;
    }

    const pivot = values[hi]!;
    emit(
      'PIVOT',
      `pivot=${pivot}`,
      `Partition range [${lo}, ${hi}]. Choose the last element, ${pivot} at index ${hi}, as the pivot.`,
      lo,
      hi,
      hi,
      null,
      null,
    );

    let i = lo;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      const atJ = values[j]!;
      emit(
        'CMP',
        `${atJ} ? ${pivot}`,
        `Scan index ${j}: is ${atJ} < pivot ${pivot}?`,
        lo,
        hi,
        hi,
        i,
        j,
      );
      if (atJ < pivot) {
        if (i !== j) {
          const atI = values[i]!;
          values[i] = atJ;
          values[j] = atI;
          swaps++;
        }
        emit(
          'SWAP',
          `swap ${i}↔${j}`,
          `${values[i]} < pivot, so move it into the "smaller" zone by swapping indices ${i} and ${j}. Advance the boundary.`,
          lo,
          hi,
          hi,
          i,
          j,
        );
        i++;
      }
    }

    if (i !== hi) {
      const atI = values[i]!;
      const atHi = values[hi]!;
      values[i] = atHi;
      values[hi] = atI;
      swaps++;
    }
    sorted[i] = true;
    emit(
      'SEAT',
      `pivot@${i}`,
      `Swap the pivot into the boundary slot ${i}. Everything left is smaller, everything right is larger — index ${i} now holds its final value.`,
      lo,
      hi,
      i,
      i,
      null,
    );

    stack.push([i + 1, hi]);
    stack.push([lo, i - 1]);
  }

  emit(
    'DONE',
    'sorted ✓',
    `Every range has been partitioned and every pivot seated — the array is fully sorted.`,
    null,
    null,
    null,
    null,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SortState>) {
  const s = frame.state;
  const tone = (idx: number): BarTone => {
    if (s.sorted[idx]) return 'sorted';
    if (s.pivotIdx === idx) return 'pivot';
    if (s.j === idx) return 'compare';
    if (s.i === idx) return 'swap';
    return 'idle';
  };
  const finalized = s.sorted.filter(Boolean).length;
  const done = frame.move?.type === 'DONE';
  const range = s.lo !== null && s.hi !== null ? `[${s.lo},${s.hi}]` : '—';
  const pivotVal = s.pivotIdx !== null ? s.values[s.pivotIdx] : '—';
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="partition">
            <RailStat k="range" v={range} />
            <RailStat k="pivot" v={pivotVal} tone="accent" />
            <RailStat k="i" v={s.i ?? '—'} />
            <RailStat k="j" v={s.j ?? '—'} />
          </RailGroup>
          <RailGroup label="stats">
            <RailStat k="cmps" v={s.comparisons} />
            <RailStat k="swaps" v={s.swaps} />
            <RailStat
              k="fixed"
              v={`${finalized}/${s.values.length}`}
              tone={done ? 'good' : undefined}
            />
          </RailGroup>
          {done && <RailResult label="result" value="sorted ✓" tone="good" />}
        </>
      }
    >
      <ArrayBars values={s.values} tone={tone} height={242} />
    </VizStage>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<SortState>) {
  return (
    <SortInspector
      frame={frame}
      selectedNode={selectedNode}
      hideSorted
      extra={(s) => {
        const finalized = s.sorted.filter(Boolean).length;
        const range = s.lo !== null && s.hi !== null ? `[${s.lo}, ${s.hi}]` : '—';
        const pivotVal = s.pivotIdx !== null ? s.values[s.pivotIdx] : '—';
        return (
          <>
            <InspectorRow k="range [lo, hi]" v={range} />
            <InspectorRow k="pivot value" v={pivotVal} />
            <InspectorRow k="finalized" v={`${finalized} / ${s.values.length}`} />
          </>
        );
      }}
    />
  );
}

const goSolution = `package main
func quickSort(nums []int) {
	stack := [][2]int{{0, len(nums) - 1}}
	for len(stack) > 0 {
		r := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		lo, hi := r[0], r[1]
		if lo >= hi {
			continue
		}
		pivot := nums[hi]
		i := lo
		for j := lo; j < hi; j++ {
			if nums[j] < pivot {
				nums[i], nums[j] = nums[j], nums[i]
				i++
			}
		}
		nums[i], nums[hi] = nums[hi], nums[i]
		stack = append(stack, [2]int{i + 1, hi})
		stack = append(stack, [2]int{lo, i - 1})
	}
}
`;

const pySolution = `# Quick Sort — O(n log n) average, O(n^2) worst | O(log n) stack
def quick_sort(nums: list[int], lo: int = 0, hi: int | None = None) -> None:
    if hi is None:
        hi = len(nums) - 1
    if lo >= hi:
        return
    p = partition(nums, lo, hi)
    quick_sort(nums, lo, p - 1)
    quick_sort(nums, p + 1, hi)
`;

const tsSolution = `// Quick Sort — O(n log n) average, O(n^2) worst | O(log n) stack
function quickSort(nums: number[], lo = 0, hi = nums.length - 1): void {
  if (lo >= hi) return;
  const p = partition(nums, lo, hi);
  quickSort(nums, lo, p - 1);
  quickSort(nums, p + 1, hi);
}
`;

const inputs = [
  { id: 'mix', label: '[5, 2, 8, 1, 9, 3, 7]', value: { values: [5, 2, 8, 1, 9, 3, 7] } },
  { id: 'rev', label: '[7, 6, 5, 4, 3, 2] · worst', value: { values: [7, 6, 5, 4, 3, 2] } },
  { id: 'dup', label: '[4, 2, 4, 1, 3, 2, 4] · dups', value: { values: [4, 2, 4, 1, 3, 2, 4] } },
];
const verdict = verdictAlwaysOk('sorted');
const teaching = wireTeachingStack({
  record,
  View,
  inputs,
  verdict,
  practice: {
    quiz,
    codePieces,
    cases: { good: goodCases, bad: badCases, intro, goodLabel: 'partition steps' },
    simulateQuestion: 'Which partition step happens next?',
  },
});

export const quickSortPlugin = definePlugin<SortInput, SortState>({
  meta: {
    id: 'quick-sort',
    title: 'Quick sort',
    difficulty: 'Medium',
    tags: ['array', 'sorting'],
    summary:
      'Pick a pivot, partition smaller values left and larger right with Lomuto, seat the pivot, then sort each side — driven by an explicit range stack.',
    source: 'https://en.wikipedia.org/wiki/Quicksort',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  extraCode: [
    { text: pySolution, lang: 'python', file: 'solution.py' },
    { text: tsSolution, lang: 'typescript', file: 'solution.ts' },
  ],
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 'values', label: 'Array', type: 'numberArray', min: 0, max: 99 }],
});
