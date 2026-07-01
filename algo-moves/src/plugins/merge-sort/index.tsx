import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { ArrayBars, type BarTone } from '../../components/ArrayBars';
import { InspectorRow } from '../_shared/vizKit';
import { SortInspector } from '../_shared/sortInspector';

export interface SortInput {
  values: number[];
}

export interface SortState {
  values: number[];
  leftRun: [number, number] | null;
  rightRun: [number, number] | null;
  writeIdx: number | null;
  compareA: number | null;
  compareB: number | null;
  comparisons: number;
  writes: number;
}

function record({ values: initial }: SortInput): Frame<SortState>[] {
  const values = initial.slice();
  const n = values.length;
  const frames: Frame<SortState>[] = [];
  let comparisons = 0;
  let writes = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    leftRun: [number, number] | null,
    rightRun: [number, number] | null,
    writeIdx: number | null,
    compareA: number | null,
    compareB: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        values: values.slice(),
        leftRun,
        rightRun,
        writeIdx,
        compareA,
        compareB,
        comparisons,
        writes,
      },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Merge sort: treat each element as a sorted run of length 1, then repeatedly merge adjacent runs into larger sorted runs until one run covers the whole array.`,
    null,
    null,
    null,
    null,
    null,
  );

  for (let width = 1; width < n; width *= 2) {
    for (let lo = 0; lo + width < n; lo += 2 * width) {
      const mid = lo + width - 1;
      const hi = Math.min(lo + 2 * width - 1, n - 1);
      const leftRun: [number, number] = [lo, mid];
      const rightRun: [number, number] = [mid + 1, hi];

      emit(
        'MERGE',
        `[${lo}..${mid}] + [${mid + 1}..${hi}]`,
        `Merge two adjacent sorted runs: left [${lo}..${mid}] and right [${mid + 1}..${hi}]. Compare their fronts and write the smaller value back, one slot at a time.`,
        leftRun,
        rightRun,
        null,
        null,
        null,
      );

      const buffer = values.slice(lo, hi + 1);
      const leftLen = mid - lo + 1;
      let li = 0;
      let ri = leftLen;
      let write = lo;

      while (li < leftLen && ri < buffer.length) {
        const aIdx = lo + li;
        const bIdx = lo + ri;
        comparisons++;
        emit(
          'CMP',
          `${buffer[li]} ? ${buffer[ri]}`,
          `Compare the run fronts: left ${buffer[li]} at ${aIdx} vs right ${buffer[ri]} at ${bIdx}. The smaller one is written next.`,
          leftRun,
          rightRun,
          null,
          aIdx,
          bIdx,
        );
        if (buffer[li] <= buffer[ri]) {
          values[write] = buffer[li];
          writes++;
          li++;
        } else {
          values[write] = buffer[ri];
          writes++;
          ri++;
        }
        emit(
          'WRITE',
          `pos ${write} = ${values[write]}`,
          `Write the smaller value ${values[write]} into position ${write}, then advance that run's front.`,
          leftRun,
          rightRun,
          write,
          null,
          null,
        );
        write++;
      }

      while (li < leftLen) {
        values[write] = buffer[li];
        writes++;
        emit(
          'WRITE',
          `pos ${write} = ${values[write]}`,
          `Right run is exhausted, so copy the remaining left value ${values[write]} into position ${write}.`,
          leftRun,
          rightRun,
          write,
          null,
          null,
        );
        li++;
        write++;
      }

      while (ri < buffer.length) {
        values[write] = buffer[ri];
        writes++;
        emit(
          'WRITE',
          `pos ${write} = ${values[write]}`,
          `Left run is exhausted, so copy the remaining right value ${values[write]} into position ${write}.`,
          leftRun,
          rightRun,
          write,
          null,
          null,
        );
        ri++;
        write++;
      }
    }
  }

  emit(
    'DONE',
    'sorted ✓',
    `Every pair of runs has been merged up to a single run covering the array — it is fully sorted.`,
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
  const done = s.leftRun === null && s.rightRun === null && frame.move.type === 'DONE';
  const inSpan = (i: number): boolean => {
    const l = s.leftRun;
    const r = s.rightRun;
    return (
      (l !== null && i >= l[0] && i <= l[1]) || (r !== null && i >= r[0] && i <= r[1])
    );
  };
  const tone = (i: number): BarTone => {
    if (done) return 'sorted';
    if (s.writeIdx === i) return 'swap';
    if (s.compareA === i || s.compareB === i) return 'compare';
    if (inSpan(i)) return 'pivot';
    return 'idle';
  };
  return (
    <div className="board-area">
      <ArrayBars values={s.values} tone={tone} height={242} />
    </div>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<SortState>) {
  return (
    <SortInspector
      frame={frame}
      selectedNode={selectedNode}
      metricLabel="writes"
      metricValue={(s) => s.writes}
      hideSorted
      extra={(s) => {
        const span =
          s.leftRun !== null && s.rightRun !== null
            ? `[${s.leftRun[0]}..${s.leftRun[1]}] + [${s.rightRun[0]}..${s.rightRun[1]}]`
            : '—';
        return <InspectorRow k="merge span" v={span} />;
      }}
    />
  );
}

const goSolution = `package main
func mergeSort(nums []int) {
	n := len(nums)
	buf := make([]int, n)
	for width := 1; width < n; width *= 2 {
		for lo := 0; lo+width < n; lo += 2 * width {
			mid := lo + width - 1
			hi := lo + 2*width - 1
			if hi > n-1 {
				hi = n - 1
			}
			i, j, k := lo, mid+1, lo
			for i <= mid && j <= hi {
				if nums[i] <= nums[j] {
					buf[k] = nums[i]
					i++
				} else {
					buf[k] = nums[j]
					j++
				}
				k++
			}
			for i <= mid {
				buf[k] = nums[i]
				i++
				k++
			}
			for j <= hi {
				buf[k] = nums[j]
				j++
				k++
			}
			copy(nums[lo:hi+1], buf[lo:hi+1])
		}
	}
}
`;

const pySolution = `# Merge Sort — O(n log n) time, O(n) auxiliary space
def merge_sort(nums: list[int]) -> None:
    n = len(nums)
    buf = [0] * n
    width = 1
    while width < n:
        lo = 0
        while lo + width < n:
            # merge nums[lo:lo+width] with nums[lo+width:...]
            lo += 2 * width
        width *= 2
`;

const tsSolution = `// Merge Sort — O(n log n) time, O(n) auxiliary space
function mergeSort(nums: number[]): void {
  const n = nums.length;
  const buf = new Array<number>(n);
  for (let width = 1; width < n; width *= 2) {
    for (let lo = 0; lo + width < n; lo += 2 * width) {
      // merge nums[lo:lo+width] with nums[lo+width:...]
    }
  }
}
`;

const inputs = [
    { id: 'mix', label: '[5, 2, 8, 1, 9, 3]', value: { values: [5, 2, 8, 1, 9, 3] } },
    { id: 'rev', label: '[8, 7, 6, 5, 4, 3, 2] · worst', value: { values: [8, 7, 6, 5, 4, 3, 2] } },
    { id: 'dup', label: '[4, 2, 4, 1, 3, 2, 4, 1] · dups', value: { values: [4, 2, 4, 1, 3, 2, 4, 1] } },
  ];
const verdict = () => ({ ok: true, label: 'sorted' });
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, bad: badCases, intro, goodLabel: 'merge steps' }, simulateQuestion: 'Which merge or split happens next?' },
});

export const mergeSortPlugin = definePlugin<SortInput, SortState>({
  meta: {
    id: 'merge-sort',
    title: 'Merge sort',
    difficulty: 'Medium',
    tags: ['array', 'sorting'],
    summary: 'Treat each element as a sorted run, then repeatedly merge adjacent runs by comparing their fronts and writing the smaller value back, doubling run width each pass.',
    source: 'https://en.wikipedia.org/wiki/Merge_sort',
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
