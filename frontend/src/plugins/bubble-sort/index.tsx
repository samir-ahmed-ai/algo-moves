import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
} from '../../core/types';
import { ArrayBars, type BarTone } from '../../components/board/ArrayBars';
import { wireTeachingStack } from '../_shared/pluginKit';
import { createSortRecorder, type SortInput, type SortState } from '../_shared/sortRecorder';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { SortInspector } from '../_shared/sortInspector';
import { VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

function record({ values: initial }: SortInput): Frame<SortState>[] {
  const { values, n, emit, frames, incCompare, incSwap, setSortedFrom } =
    createSortRecorder(initial);

  emit(
    'INIT',
    `n=${n}`,
    `Bubble sort: repeatedly walk the array, swapping adjacent out-of-order pairs. The largest unsorted value "bubbles" to the end each pass.`,
    null,
    null,
  );

  for (let i = 0; i < n - 1; i++) {
    let didSwap = false;
    for (let j = 0; j < n - 1 - i; j++) {
      incCompare();
      emit(
        'CMP',
        `${values[j]} ? ${values[j + 1]}`,
        `Compare the adjacent pair at ${j} and ${j + 1}: ${values[j]} vs ${values[j + 1]}.`,
        [j, j + 1],
        null,
      );
      if (values[j] > values[j + 1]) {
        [values[j], values[j + 1]] = [values[j + 1], values[j]];
        incSwap();
        didSwap = true;
        emit(
          'SWAP',
          `swap ${j}↔${j + 1}`,
          `${values[j + 1]} was bigger, so swap them. The larger value moves one step right.`,
          null,
          [j, j + 1],
        );
      }
    }
    setSortedFrom(n - 1 - i);
    const tail = n - 1 - i;
    emit(
      'LOCK',
      `pass ${i + 1} done`,
      `Pass ${i + 1} finished — index ${tail} now holds its final value. The tail is sorted.`,
      null,
      null,
    );
    if (!didSwap) break;
  }
  setSortedFrom(0);
  emit(
    'DONE',
    'sorted ✓',
    `A full pass made no swaps, so the array is sorted.`,
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
    if (s.swap && (s.swap[0] === i || s.swap[1] === i)) return 'swap';
    if (s.compare && (s.compare[0] === i || s.compare[1] === i)) return 'compare';
    if (i >= s.sortedFrom) return 'sorted';
    return 'idle';
  };
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="ops">
            <RailStat k="cmp" v={s.comparisons} />
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
  return <SortInspector frame={frame} selectedNode={selectedNode} />;
}

const goSolution = `package main
func bubbleSort(nums []int) {
	n := len(nums)
	for i := 0; i < n-1; i++ {
		swapped := false
		for j := 0; j < n-1-i; j++ {
			if nums[j] > nums[j+1] {
				nums[j], nums[j+1] = nums[j+1], nums[j]
				swapped = true
			}
		}
		if !swapped {
			break
		}
	}
}
`;

const pySolution = `# Bubble Sort
# Time: O(n^2) worst/avg, O(n) best | Space: O(1)

def bubble_sort(nums: list[int]) -> None:
    n = len(nums)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if nums[j] > nums[j + 1]:
                nums[j], nums[j + 1] = nums[j + 1], nums[j]
                swapped = True
        if not swapped:
            break
`;

const tsSolution = `// Bubble Sort
// Time: O(n^2) worst/avg, O(n) best | Space: O(1)

function bubbleSort(nums: number[]): void {
  const n = nums.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (nums[j] > nums[j + 1]) {
        [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
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
    cases: {
      good: goodCases,
      bad: badCases,
      intro,
      goodLabel: 'bubble passes',
      badLabel: 'worst cases',
    },
    simulateQuestion: 'Which adjacent pair is compared or swapped next?',
  },
});

export const bubbleSortPlugin = definePlugin<SortInput, SortState>({
  meta: {
    id: 'bubble-sort',
    title: 'Bubble sort',
    difficulty: 'Easy',
    tags: ['array', 'sorting'],
    summary:
      'Walk the array swapping adjacent out-of-order pairs; each pass floats the next-largest value to its final slot.',
    source: 'https://en.wikipedia.org/wiki/Bubble_sort',
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
