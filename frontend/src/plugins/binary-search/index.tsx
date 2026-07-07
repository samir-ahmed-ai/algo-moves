import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../core/types';
import { verdictLastFrameTone } from '../_shared/verdictKit';
import { ArrayRow, type ArrayPointer } from '../../components/board/ArrayRow';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, badCases } from './cases';
import { quiz, codePieces } from './practice';
import {
  InspectorRow,
  VizEmpty,
  VizInspector,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../_shared/vizKit';

export interface BinInput {
  values: number[];
  target: number;
}

export interface BinState {
  values: number[];
  target: number;
  lo: number;
  hi: number;
  mid: number | null;
  found: number | null;
  dead: boolean[];
  done: boolean;
}

function record({ values, target }: BinInput): Frame<BinState>[] {
  const frames: Frame<BinState>[] = [];
  const dead = new Array(values.length).fill(false);
  let lo = 0;
  let hi = values.length - 1;
  let found: number | null = null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    mid: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { values, target, lo, hi, mid, found, dead: dead.slice(), done: tone != null },
    });

  emit(
    'INIT',
    `lo=0 hi=${hi}`,
    `Search for ${target} in a sorted array. The window is the whole array: lo=0, hi=${hi}. Anything outside [lo, hi] can't hold the answer.`,
    null,
  );

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    emit(
      'MID',
      `mid=${mid}`,
      `Look at the middle of the live window: mid=${mid}, value ${values[mid]}.`,
      mid,
    );
    if (values[mid] === target) {
      found = mid;
      emit(
        'FOUND',
        `found @${mid}`,
        `values[${mid}] = ${target}. Target found at index ${mid}.`,
        mid,
        'good',
      );
      return frames;
    }
    if (values[mid] < target) {
      for (let i = lo; i <= mid; i++) dead[i] = true;
      lo = mid + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `${values[mid]} < ${target}, so the target must be to the right. Discard everything up to mid and set lo = ${lo}.`,
        mid,
      );
    } else {
      for (let i = mid; i <= hi; i++) dead[i] = true;
      hi = mid - 1;
      emit(
        'LEFT',
        `hi=${hi}`,
        `${values[mid]} > ${target}, so the target must be to the left. Discard everything from mid up and set hi = ${hi}.`,
        mid,
      );
    }
  }

  emit(
    'MISS',
    'absent',
    `lo passed hi with no match — ${target} is not in the array. Return -1.`,
    null,
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<BinState>) {
  const s = frame.state;
  const live = s.lo <= s.hi;
  const width = live ? s.hi - s.lo + 1 : 0;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  if (live) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.found === i) return 'found';
    if (s.mid === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  const resultValue = s.found !== null ? `index ${s.found}` : s.done ? '-1 (absent)' : '…';
  const resultTone = s.found !== null ? 'good' : s.done ? 'bad' : 'accent';
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="pointers">
            <RailStat k="target" v={s.target} tone="accent" />
            <RailStat k="lo" v={s.lo} />
            <RailStat k="hi" v={s.hi} />
            <RailStat k="mid" v={s.mid ?? '—'} />
            <RailStat k="window" v={width} />
          </RailGroup>
          {s.done && <RailResult label="result" value={resultValue} tone={resultTone} />}
        </>
      }
    >
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<BinState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const width = s.lo <= s.hi ? s.hi - s.lo + 1 : 0;
  return (
    <VizInspector>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="window size" v={width} />
      <InspectorRow
        k="result"
        v={s.found !== null ? `index ${s.found}` : s.done ? '-1 (absent)' : '…searching'}
      />
    </VizInspector>
  );
}

const goSolution = `package main
func search(nums []int, target int) int {
	lo, hi := 0, len(nums)-1
	for lo <= hi {
		mid := (lo + hi) / 2
		switch {
		case nums[mid] == target:
			return mid
		case nums[mid] < target:
			lo = mid + 1
		default:
			hi = mid - 1
		}
	}
	return -1
}
`;

const pySolution = `# Binary Search — LeetCode #704
# Time: O(log n) | Space: O(1)

def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`;

const tsSolution = `// Binary Search — LeetCode #704
// Time: O(log n) | Space: O(1)

function search(nums: number[], target: number): number {
  let lo = 0,
    hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
`;

const inputs: SampleInput<BinInput>[] = [
  {
    id: 'hit',
    label: 'find 9 · present',
    value: { values: [1, 3, 4, 6, 8, 9, 11, 14, 17], target: 9 },
  },
  {
    id: 'miss',
    label: 'find 7 · absent',
    value: { values: [1, 3, 4, 6, 8, 9, 11, 14, 17], target: 7 },
  },
  {
    id: 'first',
    label: 'find 2 · edge',
    value: { values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 2 },
  },
];

const verdict = verdictLastFrameTone('found', 'absent');

const casesIntro =
  'Binary search needs a sorted array. Each step compares the middle of the live [lo, hi] window and throws away the half that cannot hold the target, so the search space halves every comparison — O(log n).';

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
      intro: casesIntro,
      goodLabel: 'target present',
      badLabel: 'target absent — returns -1',
    },
    simulateQuestion: 'Which half does binary search keep next?',
  },
});

export const binarySearchPlugin = definePlugin<BinInput, BinState>({
  meta: {
    id: 'binary-search',
    title: 'Binary search',
    difficulty: 'Easy',
    tags: ['array', 'binary-search'],
    source: 'https://leetcode.com/problems/binary-search/',
    summary:
      'Halve a sorted window each step: compare the middle, then keep the side that can contain the target.',
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
  editable: [
    { key: 'values', label: 'Sorted array', type: 'numberArray', min: 0, max: 99 },
    { key: 'target', label: 'Target', type: 'number', min: 0, max: 99 },
  ],
  inputBuilders: ['pad', 'arpeggiator', 'custom'],
});
