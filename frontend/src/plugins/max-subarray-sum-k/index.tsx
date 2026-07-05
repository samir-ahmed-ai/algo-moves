import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { ArrayRow, type ArrayPointer } from '../../components/board/ArrayRow';
import { InspectorRow, VizEmpty, VizInspector, VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

export interface WindowInput {
  values: number[];
  k: number;
}

export interface WindowState {
  values: number[];
  k: number;
  left: number;
  right: number;
  sum: number;
  best: number;
  bestStart: number;
  done: boolean;
}

function record({ values, k }: WindowInput): Frame<WindowState>[] {
  const frames: Frame<WindowState>[] = [];
  const n = values.length;

  let left = 0;
  let right = k - 1;
  let sum = 0;
  let best = 0;
  let bestStart = 0;
  let done = false;

  const emit = (type: string, note: string, caption: string, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { values, k, left, right, sum, best, bestStart, done },
    });

  emit(
    'INIT',
    `k=${k}`,
    `Fixed window of width ${k}: sum the first ${k} elements, then slide one step at a time, adding the entering value and dropping the leaving one.`,
  );

  for (let i = 0; i < k; i++) sum += values[i];
  best = sum;
  bestStart = 0;
  emit('BUILD', `sum ${sum}`, `Initial window [0,${right}] has sum ${sum}. That's our first candidate for the best.`);

  for (right = k; right < n; right++) {
    left = right - k + 1;
    const entering = values[right];
    const leaving = values[left - 1];
    sum += entering - leaving;
    if (sum > best) {
      best = sum;
      bestStart = left;
      emit(
        'BEST',
        `best ${best}`,
        `Slide to [${left},${right}]: +${entering} (values[${right}]) − ${leaving} (values[${left - 1}]) = ${sum}. New best!`,
      );
    } else {
      emit(
        'SLIDE',
        `sum ${sum}`,
        `Slide to [${left},${right}]: +${entering} (values[${right}]) − ${leaving} (values[${left - 1}]) = ${sum}. Best stays ${best}.`,
      );
    }
  }

  done = true;
  left = bestStart;
  right = bestStart + k - 1;
  emit('DONE', `best ${best}`, `Done. The maximum sum is ${best}, from window [${bestStart},${right}].`, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<WindowState>) {
  const s = frame.state;
  const bestEnd = s.bestStart + s.k - 1;
  const pointers: ArrayPointer[] = [
    { i: s.left, label: 'L', tone: 'accent', place: 'below' },
    { i: s.right, label: 'R', tone: 'bad', place: 'below' },
  ];
  const tone = (i: number) => {
    if (s.done && i >= s.bestStart && i <= bestEnd) return 'match';
    return '';
  };
  return (
    <VizStage rail={<>
      <RailGroup label="window">
        <RailStat k="sum" v={s.sum} tone="accent" />
        <RailStat k="best" v={s.best} tone={s.done ? 'good' : undefined} />
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.best} tone="good" />}
    </>}>
      <ArrayRow values={s.values} windowRange={[s.left, s.right]} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<WindowState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VizInspector>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="window" v={`[${s.left}, ${s.right}]`} />
      <InspectorRow k="sum" v={s.sum} />
      <InspectorRow k="best" v={s.best} />
      <InspectorRow k="best start" v={s.bestStart} />
    </VizInspector>
  );
}

const goSolution = `package main
func maxSubarraySumK(values []int, k int) int {
	sum := 0
	for i := 0; i < k; i++ {
		sum += values[i]
	}
	best := sum
	for right := k; right < len(values); right++ {
		sum += values[right] - values[right-k]
		if sum > best {
			best = sum
		}
	}
	return best
}
`;


const inputs = [
    { id: 'a', label: '[2,1,5,1,3,2,7,1] · k=3', value: { values: [2, 1, 5, 1, 3, 2, 7, 1], k: 3 } },
    { id: 'b', label: '[1,4,2,10,2,3,1,0,20] · k=4', value: { values: [1, 4, 2, 10, 2, 3, 1, 0, 20], k: 4 } },
    { id: 'c', label: '[5,2,1,1,1,1,1,8] · k=2', value: { values: [5, 2, 1, 1, 1, 1, 1, 8], k: 2 } },
  ];
const verdict = verdictAlwaysOk('max');
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, bad: badCases, intro, goodLabel: 'window steps' }, simulateQuestion: 'How does the window shift next?' },
});

export const maxSubarraySumKPlugin = definePlugin<WindowInput, WindowState>({
  meta: {
    id: 'max-subarray-sum-k',
    title: 'Max subarray sum (size k)',
    difficulty: 'Medium',
    tags: ['array', 'sliding-window'],
    summary:
      'Fixed-size sliding window: seed the sum of the first k elements, then slide one step at a time, adding the entering value and dropping the leaving one to track the best window in O(n).',
    source: 'https://leetcode.com/problems/maximum-average-subarray-i/',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const last = frames[frames.length - 1];
    return { ok: true, label: `best ${last?.state.best ?? 0}` };
  },
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 'values', label: 'Array', type: 'numberArray', min: -9, max: 99 }, { key: 'k', label: 'Window size (k)', type: 'number', min: 1, max: 12 }],
});
