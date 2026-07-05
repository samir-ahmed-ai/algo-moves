import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
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
  heapSize: number;
  parent: number | null;
  child: number | null;
  swap: [number, number] | null;
  sortedFrom: number;
  comparisons: number;
  swaps: number;
  phase: 'build' | 'sort' | 'done';
}

function record({ values: initial }: SortInput): Frame<SortState>[] {
  const values = initial.slice();
  const n = values.length;
  const frames: Frame<SortState>[] = [];
  let comparisons = 0;
  let swaps = 0;
  let heapSize = n;
  let sortedFrom = n;
  let phase: SortState['phase'] = 'build';

  const emit = (
    type: string,
    note: string,
    caption: string,
    parent: number | null,
    child: number | null,
    swap: [number, number] | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        values: values.slice(),
        heapSize,
        parent,
        child,
        swap,
        sortedFrom,
        comparisons,
        swaps,
        phase,
      },
    });

  const siftDown = (root: number, size: number) => {
    let i = root;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let largest = i;
      if (left < size) {
        comparisons++;
        emit(
          'SIFT',
          `${values[largest]} ? L ${values[left]}`,
          `Compare parent ${values[largest]} at index ${i} with its left child ${values[left]} at index ${left}.`,
          i,
          left,
          null,
        );
        if (values[left] > values[largest]) largest = left;
      }
      if (right < size) {
        comparisons++;
        emit(
          'SIFT',
          `${values[largest]} ? R ${values[right]}`,
          `Compare current largest ${values[largest]} at index ${largest} with the right child ${values[right]} at index ${right}.`,
          i,
          right,
          null,
        );
        if (values[right] > values[largest]) largest = right;
      }
      if (largest === i) break;
      [values[i], values[largest]] = [values[largest], values[i]];
      swaps++;
      emit(
        'SWAP',
        `swap ${i}↔${largest}`,
        `The child ${values[i]} at index ${largest} was larger, so swap it up to the parent slot ${i} to restore the heap property.`,
        i,
        largest,
        [i, largest],
      );
      i = largest;
    }
  };

  emit(
    'INIT',
    `n=${n}`,
    `Heap sort: read the array as a binary max-heap in level order — the children of index i live at 2i+1 and 2i+2. First build a max-heap, then repeatedly extract the root.`,
    null,
    null,
    null,
  );

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    emit(
      'HEAPIFY',
      `heapify @${i}`,
      `Build phase: sift down the subtree rooted at index ${i} so its largest value rises to the top.`,
      i,
      null,
      null,
    );
    siftDown(i, n);
  }

  phase = 'sort';
  emit(
    'HEAPIFY',
    `max-heap ready`,
    `The max-heap is built — index 0 now holds the largest value of the whole array.`,
    0,
    null,
    null,
  );

  for (let end = n - 1; end > 0; end--) {
    [values[0], values[end]] = [values[end], values[0]];
    swaps++;
    heapSize = end;
    sortedFrom = end;
    emit(
      'EXTRACT',
      `extract → ${end}`,
      `Extract the max: swap the root into the sorted tail at index ${end}, then shrink the heap to length ${end}.`,
      0,
      null,
      [0, end],
    );
    siftDown(0, end);
  }

  phase = 'done';
  sortedFrom = 0;
  heapSize = 0;
  emit('DONE', 'sorted ✓', `Every root has been extracted to the tail — the array is fully sorted.`, null, null, null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SortState>) {
  const s = frame.state;
  const tone = (i: number): BarTone => {
    if (i >= s.sortedFrom) return 'sorted';
    if (s.swap && (s.swap[0] === i || s.swap[1] === i)) return 'swap';
    if (i === s.parent || i === s.child) return 'compare';
    if (s.phase === 'sort' && i === 0) return 'pivot';
    return 'idle';
  };
  return (
    <VizStage rail={
      <>
        <RailGroup label="phase">
          <RailStat k="phase" v={s.phase} tone={s.phase === 'done' ? 'good' : 'accent'} />
          <RailStat k="heap" v={s.heapSize} />
        </RailGroup>
        <RailGroup label="ops">
          <RailStat k="cmp" v={s.comparisons} />
          <RailStat k="swap" v={s.swaps} />
        </RailGroup>
        {s.phase === 'done' && <RailResult label="result" value="sorted" tone="good" />}
      </>
    }>
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
      extra={(s) => (
        <>
          <InspectorRow k="heap size" v={s.heapSize} />
          <InspectorRow k="phase" v={s.phase} />
        </>
      )}
    />
  );
}

const goSolution = `package main
func heapSort(nums []int) {
	n := len(nums)
	for i := n/2 - 1; i >= 0; i-- {
		siftDown(nums, i, n)
	}
	for end := n - 1; end > 0; end-- {
		nums[0], nums[end] = nums[end], nums[0]
		siftDown(nums, 0, end)
	}
}

func siftDown(nums []int, root, size int) {
	for {
		largest := root
		left, right := 2*root+1, 2*root+2
		if left < size && nums[left] > nums[largest] {
			largest = left
		}
		if right < size && nums[right] > nums[largest] {
			largest = right
		}
		if largest == root {
			return
		}
		nums[root], nums[largest] = nums[largest], nums[root]
		root = largest
	}
}
`;

const pySolution = `# Heap Sort — O(n log n) time, O(1) space
def heap_sort(nums: list[int]) -> None:
    build_max_heap(nums)
    for end in range(len(nums) - 1, 0, -1):
        nums[0], nums[end] = nums[end], nums[0]
        sift_down(nums, 0, end)
`;

const tsSolution = `// Heap Sort — O(n log n) time, O(1) space
function heapSort(nums: number[]): void {
  buildMaxHeap(nums);
  for (let end = nums.length - 1; end > 0; end--) {
    [nums[0], nums[end]] = [nums[end], nums[0]];
    siftDown(nums, 0, end);
  }
}
`;

const inputs = [
    { id: 'mix', label: '[5, 2, 8, 1, 9, 3]', value: { values: [5, 2, 8, 1, 9, 3] } },
    { id: 'rev', label: '[8, 7, 6, 5, 4, 3, 2] · worst', value: { values: [8, 7, 6, 5, 4, 3, 2] } },
    { id: 'dup', label: '[4, 2, 4, 1, 3, 2, 4, 1] · dups', value: { values: [4, 2, 4, 1, 3, 2, 4, 1] } },
  ];
const verdict = verdictAlwaysOk('sorted');
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, bad: badCases, intro, goodLabel: 'heapify steps' }, simulateQuestion: 'Which heap sift happens next?' },
});

export const heapSortPlugin = definePlugin<SortInput, SortState>({
  meta: {
    id: 'heap-sort',
    title: 'Heap sort',
    difficulty: 'Medium',
    tags: ['array', 'sorting', 'heap'],
    summary: 'Read the array as an in-place binary max-heap: build it by sifting down, then repeatedly swap the root to the tail and re-heapify the shrinking prefix.',
    source: 'https://en.wikipedia.org/wiki/Heapsort',
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
