import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
} from '../../core/types';
import { ArrayBars, type BarTone } from '../../components/board/ArrayBars';
import { wireTeachingStack } from '../_shared/pluginKit';
import {
  createSelectionSortRecorder,
  type SortInput,
  type SelectionSortState as SortState,
} from '../_shared/sortRecorder';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { SortInspector } from '../_shared/sortInspector';
import { VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

function record({ values: initial }: SortInput): Frame<SortState>[] {
  const { values, n, frames, emit, incCompare, incSwap, setSortedUpto } =
    createSelectionSortRecorder(initial);

  emit(
    'INIT',
    `n=${n}`,
    `Selection sort: each round, scan the unsorted suffix to find the smallest value, then swap it to the front. The prefix stays sorted.`,
    null,
    null,
  );

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    emit(
      'MIN',
      `min=${minIdx}`,
      `Start round ${i + 1}: assume the smallest of the unsorted part is at ${minIdx} (value ${values[minIdx]}).`,
      null,
      minIdx,
    );
    for (let j = i + 1; j < n; j++) {
      incCompare();
      emit(
        'SCAN',
        `${values[j]} ? ${values[minIdx]}`,
        `Compare ${values[j]} at index ${j} against the current minimum ${values[minIdx]}.`,
        j,
        minIdx,
      );
      if (values[j] < values[minIdx]) {
        minIdx = j;
        emit(
          'MIN',
          `min=${minIdx}`,
          `${values[j]} is smaller, so the new minimum is at index ${minIdx}.`,
          null,
          minIdx,
        );
      }
    }
    if (minIdx !== i) {
      [values[i], values[minIdx]] = [values[minIdx], values[i]];
      incSwap();
      emit(
        'SWAP',
        `swap ${i}↔${minIdx}`,
        `Swap the minimum into position ${i}. It now holds its final value.`,
        null,
        i,
      );
    } else {
      emit(
        'SWAP',
        `min already @${i}`,
        `The minimum is already at index ${i}, so no swap is needed.`,
        null,
        i,
      );
    }
    setSortedUpto(i + 1);
    emit(
      'LOCK',
      `sorted ${i + 1}`,
      `Index ${i} is locked in. The sorted prefix now spans the first ${i + 1} element${i === 0 ? '' : 's'}.`,
      null,
      null,
    );
  }
  setSortedUpto(n);
  emit(
    'DONE',
    'sorted ✓',
    `Only one element remains, so it's already in place — the array is fully sorted.`,
    null,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SortState>) {
  const s = frame.state;
  const done = frame.move.type === 'DONE';
  const tone = (i: number): BarTone => {
    if (i < s.sortedUpto) return 'sorted';
    if (i === s.minIdx) return 'min';
    if (i === s.compare) return 'compare';
    return 'idle';
  };
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="round">
            <RailStat k="min@" v={s.minIdx ?? '—'} tone="accent" />
            <RailStat k="sorted" v={s.sortedUpto} tone={s.sortedUpto > 0 ? 'good' : undefined} />
          </RailGroup>
          <RailGroup label="stats">
            <RailStat k="cmps" v={s.comparisons} />
            <RailStat k="swaps" v={s.swaps} />
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
      sortedLabel="sorted prefix"
      sortedValue={(s) =>
        s.sortedUpto > 0 ? `${s.sortedUpto} element${s.sortedUpto === 1 ? '' : 's'}` : '— (none)'
      }
    />
  );
}

const goSolution = `package main
func selectionSort(nums []int) {
	n := len(nums)
	for i := 0; i < n-1; i++ {
		minIdx := i
		for j := i + 1; j < n; j++ {
			if nums[j] < nums[minIdx] {
				minIdx = j
			}
		}
		if minIdx != i {
			nums[i], nums[minIdx] = nums[minIdx], nums[i]
		}
	}
}
`;

const pySolution = `# Selection Sort — O(n^2) comparisons, O(1) space

def selection_sort(nums: list[int]) -> None:
    n = len(nums)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if nums[j] < nums[min_idx]:
                min_idx = j
        if min_idx != i:
            nums[i], nums[min_idx] = nums[min_idx], nums[i]
`;

const tsSolution = `// Selection Sort — O(n^2) comparisons, O(1) space

function selectionSort(nums: number[]): void {
  const n = nums.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (nums[j] < nums[minIdx]) minIdx = j;
    }
    if (minIdx !== i) [nums[i], nums[minIdx]] = [nums[minIdx], nums[i]];
  }
}
`;

const inputs = [
  { id: 'mix', label: '[5, 2, 8, 1, 9, 3]', value: { values: [5, 2, 8, 1, 9, 3] } },
  { id: 'rev', label: '[7, 6, 5, 4, 3] · worst', value: { values: [7, 6, 5, 4, 3] } },
  { id: 'near', label: '[1, 2, 4, 3, 5] · nearly sorted', value: { values: [1, 2, 4, 3, 5] } },
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
    cases: {
      good: goodCases,
      bad: badCases,
      intro,
      goodLabel: 'selection passes',
      badLabel: 'worst cases',
    },
    simulateQuestion: 'Which index is chosen as the minimum next?',
  },
});

export const selectionSortPlugin = definePlugin<SortInput, SortState>({
  meta: {
    id: 'selection-sort',
    title: 'Selection sort',
    difficulty: 'Easy',
    tags: ['array', 'sorting'],
    summary:
      'Each round, scan the unsorted suffix for its minimum and swap it into the next slot; the prefix grows sorted one element at a time.',
    source: 'https://en.wikipedia.org/wiki/Selection_sort',
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
