import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LcpInput {
  strs: string[];
}

interface LcpState {
  strs: string[];
  col: number | null; // char column currently being compared
  row: number | null; // which word (index into strs) we are checking against word 0
  matched: number; // number of leading chars confirmed common so far
  result: string | null; // final common prefix once known
  done: boolean;
}

function record({ strs }: LcpInput): Frame<LcpState>[] {  const base = strs.length > 0 ? strs[0] : '';

  const { emit, frames } = createRecorder<LcpState>(() => ({
        strs,
        col: null,
        row: null,
        matched: 0,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `${strs.length} words`,
    `Longest Common Prefix by vertical scan: fix word 0 ("${base}") as the yardstick and walk its characters column by column. At each column, every other word must have the same character; the first mismatch (or a word that runs out) ends the prefix.`,
    {},
  );

  if (strs.length === 0) {
    emit('DONE', 'empty set', `There are no words at all, so the longest common prefix is the empty string "".`, { result: '', done: true }, 'bad');
    return frames;
  }

  for (let i = 0; i < base.length; i++) {
    const c = base[i];
    emit(
      'COLUMN',
      `col ${i} = '${c}'`,
      `Column ${i}: word 0 has '${c}' here. Check that every other word also has '${c}' at index ${i}.`,
      { col: i, matched: i },
    );

    for (let j = 1; j < strs.length; j++) {
      const w = strs[j];
      if (i >= w.length) {
        emit(
          'MISMATCH',
          `"${w}" too short`,
          `Word ${j} ("${w}") has only ${w.length} character${w.length === 1 ? '' : 's'}, so it has nothing at index ${i}. The common prefix cannot extend past column ${i}. Answer = word0[:${i}] = "${base.slice(0, i)}".`,
          { col: i, row: j, matched: i, result: base.slice(0, i), done: true },
          'bad',
        );
        return frames;
      }
      if (w[i] !== c) {
        emit(
          'MISMATCH',
          `'${w[i]}' ≠ '${c}'`,
          `Word ${j} ("${w}") has '${w[i]}' at index ${i}, which differs from '${c}'. That breaks the prefix here. Answer = word0[:${i}] = "${base.slice(0, i)}".`,
          { col: i, row: j, matched: i, result: base.slice(0, i), done: true },
          'bad',
        );
        return frames;
      }
      emit(
        'MATCH',
        `"${w}"[${i}]='${c}'`,
        `Word ${j} ("${w}") also has '${c}' at index ${i} — still a match. Keep checking the rest of this column.`,
        { col: i, row: j, matched: i },
        'good',
      );
    }

    emit(
      'COLUMN_OK',
      `col ${i} common`,
      `Every word shares '${c}' at column ${i}, so the prefix now includes '${c}'. Confirmed prefix so far: "${base.slice(0, i + 1)}".`,
      { col: i, matched: i + 1 },
      'good',
    );
  }

  emit(
    'DONE',
    `"${base}"`,
    `We consumed all of word 0 without any mismatch, so word 0 itself is a prefix of every word. The longest common prefix is "${base}".`,
    { matched: base.length, result: base, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LcpState>) {
  const s = frame.state;
  const base = s.strs.length > 0 ? s.strs[0] : '';
  const baseChars = base.split('');
  const pointers: ArrayPointer[] = [];
  if (s.col !== null) pointers.push({ i: s.col, label: 'col', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (i < s.matched) return 'found';
    if (s.col === i) return s.done ? 'dead' : 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        word 0 = <span className="font-mono text-ink">"{base}"</span> · comparing{' '}
        <span className="font-mono text-ink">{s.strs.length}</span> word{s.strs.length === 1 ? '' : 's'}
      </div>
      <ArrayRow values={baseChars} cellTone={tone} pointers={pointers} windowRange={s.matched > 0 ? [0, s.matched - 1] : null} />
      <div className={cn('mt-1 flex flex-col gap-[2px] font-mono', vizText.sm)}>
        {s.strs.map((w, j) => {
          const isActive = s.row === j;
          const chars = w.split('');
          return (
            <div key={j} className={cn(isActive ? 'text-ink' : 'text-ink3')}>
              <span className="text-ink3">w{j}:</span>{' '}
              {chars.map((ch, k) => {
                const inPrefix = k < s.matched;
                const atCol = s.col === k && isActive;
                return (
                  <span
                    key={k}
                    className={cn(inPrefix ? 'text-good' : atCol ? 'text-accent' : undefined)}
                  >
                    {ch}
                  </span>
                );
              })}
              {chars.length === 0 && <span className="text-ink3">∅</span>}
            </div>
          );
        })}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono', s.result === '' ? 'text-ink3' : 'text-good', vizText.base)}>
          → prefix = "{s.result}"
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LcpState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const base = s.strs.length > 0 ? s.strs[0] : '';
  return (
    <VarGrid>
      <InspectorRow k="words" v={s.strs.length} />
      <InspectorRow k="word 0" v={`"${base}"`} />
      <InspectorRow k="column (i)" v={s.col ?? '—'} />
      <InspectorRow k="checking word (j)" v={s.row ?? '—'} />
      <InspectorRow k="prefix length" v={s.matched} />
      <InspectorRow k="prefix" v={s.result !== null ? `"${s.result}"` : `"${base.slice(0, s.matched)}"`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-longest-common-prefix';
export const title = 'Longest common prefix';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Longest common prefix\"?",
    choices: [
      {
        label: "Vertical scan — fits this problem",
        correct: true
      },
      {
        label: "Double string trick — different approach"
      },
      {
        label: "Index Map — different approach"
      },
      {
        label: "Stack of unmatched indices — different approach"
      }
    ],
    explain: "Compare column by column across all words"
  },
  {
    id: "init",
    prompt: "At the start of a run (Longest common prefix), what strategy is established?",
    choices: [
      {
        label: "Compare column by column across — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Longest Common Prefix by vertical scan: fix word 0 (\"\") as the yardstick and walk its characters column by column. At each column, every other word must have the same character; the first mismatch (or a word that runs out) ends the prefix."
  },
  {
    id: "key-step",
    prompt: "On the \"MISMATCH\" step ('' ≠ ''), what happens?",
    choices: [
      {
        label: "Word (\"\") has '' at index — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Word  (\"\") has '' at index , which differs from ''. That breaks the prefix here. Answer = word0[:] = \"\"."
  },
  {
    id: "state",
    prompt: "What does the `col` field track in the visualization state?",
    choices: [
      {
        label: "char column currently being compared — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder keeps `col` in sync: char column currently being compared"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Longest common prefix\"?",
    choices: [
      {
        label: "O(n*m) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O( time, O(1) space — wrong order of growth"
      },
      {
        label: "O(n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n*m). O(1). for i in word0: any mismatch/short -> return word0[:i]"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "We consumed all of word 0 — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "We consumed all of word 0 without any mismatch, so word 0 itself is a prefix of every word. The longest common prefix is \"\"."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'lcp1', label: '["flower","flow","flight"]', value: { strs: ['flower', 'flow', 'flight'] } },
    { id: 'lcp2', label: '["dog","racecar","car"]', value: { strs: ['dog', 'racecar', 'car'] } },
  ] satisfies SampleInput<LcpInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LcpState | undefined;
    const prefix = s?.result ?? '';
    return { ok: prefix.length > 0, label: prefix.length > 0 ? `"${prefix}"` : 'no common prefix' };
  },
};
