import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { verdictLastFrameTone, verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { ArrayRow, type ArrayPointer } from '../../components/board/ArrayRow';
import { InspectorRow, VizEmpty, VizInspector, VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

export interface TwoSumInput {
  values: number[];
  target: number;
}

export interface TwoSumState {
  values: number[];
  target: number;
  left: number;
  right: number;
  sum: number | null;
  found: [number, number] | null;
  done: boolean;
}

function record({ values, target }: TwoSumInput): Frame<TwoSumState>[] {
  const frames: Frame<TwoSumState>[] = [];
  let left = 0;
  let right = values.length - 1;
  let found: [number, number] | null = null;

  const emit = (type: string, note: string, caption: string, sum: number | null, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { values, target, left, right, sum, found, done: tone != null },
    });

  emit('INIT', `t=${target}`, `Array is sorted, so put one pointer at each end. Their sum tells us which way to move: too big → pull right in, too small → push left out.`, null);

  while (left < right) {
    const sum = values[left] + values[right];
    if (sum === target) {
      found = [left, right];
      emit('FOUND', `${left}+${right}`, `${values[left]} + ${values[right]} = ${target}. Pair found at indices ${left} and ${right}.`, sum, 'good');
      return frames;
    }
    if (sum < target) {
      emit('LOW', `sum ${sum} < ${target}`, `${values[left]} + ${values[right]} = ${sum}, below ${target}. The smallest value can't help — move left rightward to a bigger number.`, sum);
      left++;
    } else {
      emit('HIGH', `sum ${sum} > ${target}`, `${values[left]} + ${values[right]} = ${sum}, above ${target}. The largest value is too big — move right leftward to a smaller number.`, sum);
      right--;
    }
  }

  emit('MISS', 'no pair', `The pointers met without hitting ${target}. No two numbers sum to the target.`, null, 'bad');
  return frames;
}

function View({ frame }: PluginViewProps<TwoSumState>) {
  const s = frame.state;
  const live = s.left < s.right && !s.found;
  const pointers: ArrayPointer[] = [];
  if (s.found) {
    pointers.push({ i: s.found[0], label: 'L', tone: 'good', place: 'below' });
    pointers.push({ i: s.found[1], label: 'R', tone: 'good', place: 'below' });
  } else if (live || s.left <= s.right) {
    pointers.push({ i: s.left, label: 'L', tone: 'accent', place: 'below' });
    pointers.push({ i: s.right, label: 'R', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.found && (s.found[0] === i || s.found[1] === i)) return 'match';
    if (i < s.left || i > s.right) return 'dead';
    return '';
  };
  const resultValue = s.found ? `[${s.found[0]}, ${s.found[1]}]` : s.done ? 'none' : '…';
  const resultTone = s.found ? 'good' : s.done ? 'bad' : 'accent';
  return (
    <VizStage rail={<>
      <RailGroup label="scan">
        <RailStat k="target" v={s.target} />
        <RailStat k="L[i]" v={s.values[s.left]} tone="accent" />
        <RailStat k="R[j]" v={s.values[s.right]} tone="bad" />
        <RailStat k="sum" v={s.sum ?? '—'} tone={s.sum !== null ? 'accent' : undefined} />
      </RailGroup>
      <RailResult label="answer" value={resultValue} tone={resultTone} />
    </>}>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TwoSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VizInspector>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="left" v={`${s.left} (=${s.values[s.left]})`} />
      <InspectorRow k="right" v={`${s.right} (=${s.values[s.right]})`} />
      <InspectorRow k="sum" v={s.sum ?? '—'} />
      <InspectorRow k="result" v={s.found ? `[${s.found[0]}, ${s.found[1]}]` : s.done ? 'none' : '…'} />
    </VizInspector>
  );
}

const goSolution = `package main
func twoSum(numbers []int, target int) []int {
	lo, hi := 0, len(numbers)-1
	for lo < hi {
		sum := numbers[lo] + numbers[hi]
		switch {
		case sum == target:
			return []int{lo + 1, hi + 1}
		case sum < target:
			lo++
		default:
			hi--
		}
	}
	return nil
}
`;


const inputs = [
    { id: 'hit', label: '[2,7,11,15] · t=9', value: { values: [2, 7, 11, 15], target: 9 } },
    { id: 'mid', label: '[1,3,4,5,7,11] · t=9', value: { values: [1, 3, 4, 5, 7, 11], target: 9 } },
    { id: 'miss', label: '[1,2,3,4] · t=99', value: { values: [1, 2, 3, 4], target: 99 } },
  ];
const verdict = verdictAlwaysOk('found');
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, bad: badCases, intro, goodLabel: 'two-pointer moves' }, simulateQuestion: 'Which pointer moves next?' },
});

export const twoSumSortedPlugin = definePlugin<TwoSumInput, TwoSumState>({
  meta: {
    id: 'two-sum-sorted',
    title: 'Two sum II (sorted)',
    difficulty: 'Medium',
    tags: ['array', 'two-pointers'],
    source: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/',
    summary: 'Two pointers from both ends of a sorted array; the running sum decides which pointer to move inward.',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict: verdictLastFrameTone('pair found', 'no pair'),
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 'values', label: 'Sorted array', type: 'numberArray', min: 0, max: 99 }, { key: 'target', label: 'Target', type: 'number', min: 0, max: 99 }],
});
