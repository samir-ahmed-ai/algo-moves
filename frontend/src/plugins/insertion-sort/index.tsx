import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
} from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import {
  createInsertionSortRecorder,
  type SortInput,
  type InsertionSortState as SortState,
} from '../_shared/sortRecorder';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { ArrayBars, type BarTone } from '../../components/board/ArrayBars';
import { InspectorRow, VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';
import { SortInspector } from '../_shared/sortInspector';

function record({ values: initial }: SortInput): Frame<SortState>[] {
  const { values, n, frames, emit, incCompare, incShift, setSortedUpto } =
    createInsertionSortRecorder(initial);

  emit(
    'INIT',
    `n=${n}`,
    `Insertion sort: grow a sorted prefix. The first element is trivially a sorted run of length 1.`,
    null,
    null,
    null,
  );

  for (let i = 1; i < n; i++) {
    const key = values[i];
    let j = i - 1;
    emit(
      'KEY',
      `key=${key}`,
      `Pick values[${i}] = ${key} as the key, then slide it left into the sorted prefix.`,
      key,
      i,
      null,
    );

    while (j >= 0) {
      incCompare();
      emit(
        'CMP',
        `${values[j]} ? ${key}`,
        `Compare the key ${key} against values[${j}] = ${values[j]} just to its left.`,
        key,
        j + 1,
        j,
      );
      if (values[j] <= key) break;
      values[j + 1] = values[j];
      incShift();
      emit(
        'SHIFT',
        `shift ${values[j]} →`,
        `${values[j]} is bigger than the key, so shift it one slot right to open a gap.`,
        key,
        j,
        j,
      );
      j--;
    }

    values[j + 1] = key;
    setSortedUpto(i + 1);
    emit(
      'PLACE',
      `place ${key} @${j + 1}`,
      `Drop the key ${key} into the gap at index ${j + 1}. The sorted prefix now spans the first ${i + 1}.`,
      key,
      j + 1,
      null,
    );
  }

  setSortedUpto(n);
  emit(
    'DONE',
    'sorted ✓',
    `Every key has been inserted into its place — the array is sorted.`,
    null,
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
    if (i === s.keyIdx) return 'pivot';
    if (i === s.compare) return 'compare';
    if (i < s.sortedUpto) return 'sorted';
    return 'idle';
  };
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="scan">
            <RailStat k="key" v={s.key ?? '—'} tone="accent" />
            <RailStat k="keyIdx" v={s.keyIdx ?? '—'} />
            <RailStat k="compare" v={s.compare ?? '—'} />
          </RailGroup>
          <RailGroup label="progress">
            <RailStat k="sorted" v={s.sortedUpto} tone={s.sortedUpto > 0 ? 'good' : undefined} />
            <RailStat k="cmps" v={s.comparisons} />
            <RailStat k="shifts" v={s.shifts} />
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
      metricLabel="shifts"
      metricValue={(s) => s.shifts}
      sortedLabel="sorted prefix"
      sortedValue={(s) => s.sortedUpto}
      extra={(s) => <InspectorRow k="key" v={s.key ?? '—'} />}
    />
  );
}

const goSolution = `package main
func insertionSort(nums []int) {
	for i := 1; i < len(nums); i++ {
		key := nums[i]
		j := i - 1
		for j >= 0 && nums[j] > key {
			nums[j+1] = nums[j]
			j--
		}
		nums[j+1] = key
	}
}
`;

const pySolution = `# Insertion Sort — O(n^2) worst, O(n) best | O(1) space
def insertion_sort(nums: list[int]) -> None:
    for i in range(1, len(nums)):
        key = nums[i]
        j = i - 1
        while j >= 0 and nums[j] > key:
            nums[j + 1] = nums[j]
            j -= 1
        nums[j + 1] = key
`;

const tsSolution = `// Insertion Sort — O(n^2) worst, O(n) best | O(1) space
function insertionSort(nums: number[]): void {
  for (let i = 1; i < nums.length; i++) {
    const key = nums[i];
    let j = i - 1;
    while (j >= 0 && nums[j] > key) {
      nums[j + 1] = nums[j];
      j--;
    }
    nums[j + 1] = key;
  }
}
`;

const inputs = [
  { id: 'mix', label: '[5, 2, 8, 1, 9, 3]', value: { values: [5, 2, 8, 1, 9, 3] } },
  { id: 'rev', label: '[7, 6, 5, 4, 3] · worst', value: { values: [7, 6, 5, 4, 3] } },
  { id: 'near', label: '[1, 2, 4, 3, 5] · best', value: { values: [1, 2, 4, 3, 5] } },
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
    cases: { good: goodCases, bad: badCases, intro, goodLabel: 'insertion steps' },
    simulateQuestion: 'Which element is inserted into the sorted prefix next?',
  },
});

export const insertionSortPlugin = definePlugin<SortInput, SortState>({
  meta: {
    id: 'insertion-sort',
    title: 'Insertion sort',
    difficulty: 'Easy',
    tags: ['array', 'sorting'],
    summary:
      'Grow a sorted prefix: take each next element as a key, shift larger sorted elements right, then drop the key into the gap.',
    source: 'https://en.wikipedia.org/wiki/Insertion_sort',
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
