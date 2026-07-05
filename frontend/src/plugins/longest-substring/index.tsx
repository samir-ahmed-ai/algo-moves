import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { ArrayRow, type ArrayPointer } from '../../components/board/ArrayRow';
import { InspectorRow, VizEmpty, VizInspector, VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

export interface LSInput {
  s: string;
}

export interface LSState {
  chars: string[];
  left: number;
  right: number;
  inWindow: string;
  best: number;
  bestLeft: number;
  bestRight: number;
  done: boolean;
}

function record({ s }: LSInput): Frame<LSState>[] {
  const chars = s.split('');
  const frames: Frame<LSState>[] = [];
  const seen = new Set<string>();
  let left = 0;
  let best = 0;
  let bestLeft = 0;
  let bestRight = -1;

  const emit = (
    type: string,
    note: string,
    caption: string,
    right: number,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chars,
        left,
        right,
        inWindow: right >= left ? chars.slice(left, right + 1).join('') : '',
        best,
        bestLeft,
        bestRight,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `"${s}"`,
    `Grow a window from the left, adding one character at a time. Whenever a repeat sneaks in, slide the left edge forward until the window is unique again, tracking the longest stretch seen.`,
    -1,
  );

  for (let right = 0; right < chars.length; right++) {
    const c = chars[right];
    while (seen.has(c)) {
      seen.delete(chars[left]);
      left++;
      emit(
        'SHRINK',
        `drop '${chars[left - 1]}'`,
        `'${c}' is already inside the window, so shrink from the left — drop '${chars[left - 1]}' and advance left to ${left}.`,
        right - 1,
      );
    }
    seen.add(c);
    emit(
      'EXPAND',
      `add '${c}'`,
      `'${c}' is fresh, so extend the window to the right. Current window "${chars.slice(left, right + 1).join('')}" spans [${left}, ${right}].`,
      right,
    );
    const len = right - left + 1;
    if (len > best) {
      best = len;
      bestLeft = left;
      bestRight = right;
      emit(
        'BEST',
        `len ${best}`,
        `New longest window of length ${best}: "${chars.slice(left, right + 1).join('')}" at [${left}, ${right}].`,
        right,
      );
    }
  }

  emit(
    'DONE',
    `len ${best}`,
    `Scan complete. The longest substring without repeating characters has length ${best}: "${chars.slice(bestLeft, bestRight + 1).join('')}".`,
    chars.length - 1,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LSState>) {
  const s = frame.state;
  const hasWindow = s.right >= s.left && s.right >= 0;
  const pointers: ArrayPointer[] = [];
  if (s.left < s.chars.length) {
    pointers.push({ i: s.left, label: 'L', tone: 'accent', place: 'below' });
  }
  if (s.right >= 0) {
    pointers.push({ i: s.right, label: 'R', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.done && i >= s.bestLeft && i <= s.bestRight) return 'match';
    return '';
  };
  const len = s.right >= s.left ? s.right - s.left + 1 : 0;
  return (
    <VizStage rail={<>
      <RailGroup label="window">
        <RailStat k="substr" v={s.inWindow || '∅'} tone="accent" />
        <RailStat k="len" v={len} />
      </RailGroup>
      <RailResult label="best" value={s.best} tone={s.done ? 'good' : 'accent'} />
    </>}>
      <ArrayRow
        values={s.chars}
        windowRange={hasWindow ? [s.left, s.right] : null}
        cellTone={tone}
        pointers={pointers}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const len = s.right >= s.left ? s.right - s.left + 1 : 0;
  return (
    <VizInspector>
      <InspectorRow k="window" v={`[${s.left}, ${s.right}]`} />
      <InspectorRow k="substring" v={s.inWindow || '∅'} />
      <InspectorRow k="length" v={len} />
      <InspectorRow k="best" v={s.best} />
      <InspectorRow k="best bounds" v={s.bestRight >= s.bestLeft ? `[${s.bestLeft}, ${s.bestRight}]` : '—'} />
    </VizInspector>
  );
}

const goSolution = `package main
func lengthOfLongestSubstring(s string) int {
	seen := make(map[byte]int)
	best, left := 0, 0
	for right := 0; right < len(s); right++ {
		c := s[right]
		if i, ok := seen[c]; ok && i >= left {
			left = i + 1
		}
		seen[c] = right
		if right-left+1 > best {
			best = right - left + 1
		}
	}
	return best
}
`;


const inputs = [
    { id: 'abcabcbb', label: '"abcabcbb"', value: { s: 'abcabcbb' } },
    { id: 'pwwkew', label: '"pwwkew"', value: { s: 'pwwkew' } },
    { id: 'bbbbb', label: '"bbbbb"', value: { s: 'bbbbb' } },
  ];
const verdict = verdictAlwaysOk('longest');
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, bad: badCases, intro, goodLabel: 'window steps' }, simulateQuestion: 'How does the window expand or shrink next?' },
});

export const longestSubstringPlugin = definePlugin<LSInput, LSState>({
  meta: {
    id: 'longest-substring',
    title: 'Longest substring w/o repeat',
    difficulty: 'Medium',
    tags: ['array', 'sliding-window'],
    source: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    summary:
      'A variable-size sliding window: expand right over fresh characters and shrink from the left whenever a duplicate appears, tracking the longest unique span.',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const best = frames[frames.length - 1]?.state.best ?? 0;
    return { ok: true, label: `len ${best}` };
  },
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 's', label: 'String', type: 'string' }],
});
