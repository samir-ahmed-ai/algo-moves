import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface WordBreakInput {
  s: string;
  wordDict: string[];
}

interface WordBreakState {
  s: string;
  wordDict: string[];
  dp: boolean[]; // dp[i] = prefix s[0:i] is fully segmentable; dp has length s.length + 1
  i: number | null; // current end index we are trying to reach (prefix s[0:i])
  j: number | null; // current cut point being tested
  piece: string | null; // s[j:i], the substring we look up in the dictionary
  pieceInDict: boolean | null; // whether `piece` is a dictionary word
  done: boolean;
}

function record({ s, wordDict }: WordBreakInput): Frame<WordBreakState>[] {
  const frames: Frame<WordBreakState>[] = [];
  const words = new Set<string>(wordDict);
  const n = s.length;
  const dp = new Array<boolean>(n + 1).fill(false);

  const emit = (
    type: string,
    note: string,
    caption: string,
    patch: Partial<WordBreakState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        s,
        wordDict,
        dp: dp.slice(),
        i: null,
        j: null,
        piece: null,
        pieceInDict: null,
        done: false,
        ...patch,
      },
    });

  emit(
    'INIT',
    `dict={${wordDict.join(',')}}`,
    `Word Break: can "${s}" be cut into a sequence of dictionary words? dp[i] means the prefix s[0:i] is fully segmentable. We fill dp left to right in O(n²) time and O(n) space.`,
    {},
  );

  dp[0] = true;
  emit(
    'BASE',
    'dp[0]=true',
    `Base case: the empty prefix is trivially segmentable, so dp[0] = true. Every cut point j starts from this anchor.`,
    { i: 0 },
  );

  for (let i = 1; i <= n; i++) {
    emit(
      'REACH',
      `reach i=${i}`,
      `Now decide dp[${i}] — is the prefix "${s.slice(0, i)}" segmentable? Try every cut j < ${i}: the prefix works if s[0:j] is already segmentable AND the tail s[j:${i}] is a dictionary word.`,
      { i },
    );
    for (let j = 0; j < i; j++) {
      const piece = s.slice(j, i);
      const inDict = words.has(piece);
      const dpj = dp[j];
      emit(
        'CUT',
        `j=${j} "${piece}"`,
        `Cut at j=${j}: dp[${j}] is ${dpj ? 'true' : 'false'} and s[${j}:${i}] = "${piece}" ${inDict ? 'is' : 'is not'} in the dictionary. dp[${j}] && dict["${piece}"] = ${dpj && inDict ? 'true' : 'false'}.`,
        { i, j, piece, pieceInDict: inDict },
      );
      if (dpj && inDict) {
        dp[i] = true;
        emit(
          'SET',
          `dp[${i}]=true`,
          `Match! The prefix s[0:${j}] is segmentable and "${piece}" is a word, so "${s.slice(0, i)}" is segmentable too. Set dp[${i}] = true and stop scanning cuts for i=${i}.`,
          { i, j, piece, pieceInDict: inDict },
          'good',
        );
        break;
      }
    }
    if (!dp[i]) {
      emit(
        'NONE',
        `dp[${i}]=false`,
        `No cut worked for i=${i}: the prefix "${s.slice(0, i)}" cannot be split into dictionary words. dp[${i}] stays false.`,
        { i },
      );
    }
  }

  const answer = dp[n];
  emit(
    'DONE',
    answer ? 'segmentable' : 'not segmentable',
    `The table is complete. dp[${n}] = ${answer}, so "${s}" ${answer ? 'can' : 'cannot'} be broken into dictionary words.`,
    { i: n, done: true },
    answer ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<WordBreakState>) {
  const s = frame.state;
  const chars = s.s.split('');
  const pointers: ArrayPointer[] = [];
  if (s.j !== null) pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });
  if (s.i !== null && s.i < chars.length) {
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  }
  // Highlight the [j, i) window (the piece being tested) plus the segmentable
  // frontier already proven true.
  const tone = (idx: number) => {
    if (s.j !== null && s.i !== null && idx >= s.j && idx < s.i) return 'match';
    if (s.dp[idx]) return 'found';
    return '';
  };
  const window: [number, number] | null =
    s.j !== null && s.i !== null && s.i - 1 >= s.j ? [s.j, s.i - 1] : null;
  const dpLabels = s.dp.map((v) => (v ? 'T' : 'F'));
  const dpTone = (idx: number) => (s.i === idx ? 'found' : s.dp[idx] ? 'match' : '');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        dict = <span className="font-mono text-ink">{'{' + s.wordDict.join(', ') + '}'}</span>
        {s.piece !== null && !s.done && (
          <>
            {' · '}s[j:i] ={' '}
            <span className={cn('font-mono', s.pieceInDict ? 'text-good' : 'text-ink')}>
              "{s.piece}"
            </span>
          </>
        )}
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={window} />
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>dp (T = prefix segmentable)</div>
      <ArrayRow values={dpLabels} cellTone={dpTone} pointers={[]} windowRange={null} />
      {s.done && (
        <div className={cn('mt-1 font-mono', s.dp[s.s.length] ? 'text-good' : 'text-bad', vizText.base)}>
          → {s.dp[s.s.length] ? 'true' : 'false'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WordBreakState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const known = s.done;
  return (
    <VarGrid>
      <InspectorRow k="s" v={s.s} />
      <InspectorRow k="i (prefix end)" v={s.i ?? '—'} />
      <InspectorRow k="j (cut)" v={s.j ?? '—'} />
      <InspectorRow k="s[j:i]" v={s.piece !== null ? `"${s.piece}"` : '—'} />
      <InspectorRow
        k="dp[j] && dict"
        v={s.pieceInDict === null ? '—' : s.pieceInDict && s.j !== null && s.dp[s.j] ? 'true' : 'false'}
      />
      <InspectorRow
        k="answer"
        v={known ? (s.dp[s.s.length] ? 'true' : 'false') : '…filling'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-word-break';
export const title = 'Word break';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'wb1',
      label: '"leetcode" / [leet,code]',
      value: { s: 'leetcode', wordDict: ['leet', 'code'] },
    },
    {
      id: 'wb2',
      label: '"applepen" / [apple,pen]',
      value: { s: 'applepen', wordDict: ['apple', 'pen'] },
    },
  ] satisfies SampleInput<WordBreakInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordBreakState | undefined;
    const ok = s ? s.dp[s.s.length] : false;
    return { ok, label: ok ? 'segmentable' : 'not segmentable' };
  },
};
