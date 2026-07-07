import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface JustifyInput {
  words: string[];
  maxWidth: number;
}

interface JustifyState {
  words: string[];
  maxWidth: number;
  i: number | null; // first word index of the current line
  j: number | null; // one past the last word packed on this line
  lineChars: string[]; // the line currently being rendered, as a char array
  lastLine: boolean; // is this the final line (left-justified)?
  result: string[]; // finished, padded lines
  done: boolean;
}

// Render a middle line: words separated by evenly distributed spaces so the
// line hits exactly maxWidth. Mirrors the `else` branch of the Go solution.
function renderJustified(parts: string[], maxWidth: number): string {
  const numWords = parts.length;
  const lineLen = parts.reduce((a, w) => a + w.length, 0) + (numWords - 1);
  const totalSpaces = maxWidth - (lineLen - (numWords - 1));
  const perGap = Math.floor(totalSpaces / (numWords - 1));
  const extra = totalSpaces % (numWords - 1);
  let out = '';
  for (let k = 0; k < numWords; k++) {
    out += parts[k]!;
    if (k < numWords - 1) {
      const gaps = perGap + (k < extra ? 1 : 0);
      out += ' '.repeat(gaps);
    }
  }
  return out;
}

// Render a left-justified line (last line or single word): single spaces then
// right pad. Mirrors the first branch of the Go solution.
function renderLeft(parts: string[], maxWidth: number): string {
  let out = parts.join(' ');
  if (out.length < maxWidth) out += ' '.repeat(maxWidth - out.length);
  return out;
}

function record({ words, maxWidth }: JustifyInput): Frame<JustifyState>[] {
  const result: string[] = [];

  const { emit, frames } = createPrepRecorder<JustifyState>(() => ({
    words,
    maxWidth,
    i: null,
    j: null,
    lineChars: [],
    lastLine: false,
    result: [...result],
    done: false,
  }));

  emit(
    'INIT',
    `width=${maxWidth}`,
    `Text Justification: greedily pack as many words as fit into each ${maxWidth}-wide line, then space them out. Every line except the last is fully justified; the last line is left-justified.`,
    {},
  );

  let i = 0;
  while (i < words.length) {
    // Greedily grow the line: start with words[i]!, add words while they fit.
    let lineLen = words[i]!.length;
    let j = i + 1;
    emit(
      'START',
      `line @ ${i}`,
      `Start a new line with "${words[i]!}" (length ${words[i]!.length}). We will keep adding words while the running length + 1 space + next word still fits in ${maxWidth}.`,
      { i, j: i + 1, lineChars: [...words[i]!] },
    );

    while (j < words.length && lineLen + 1 + words[j]!.length <= maxWidth) {
      lineLen += 1 + words[j]!.length;
      j++;
      emit(
        'PACK',
        `+${words[j - 1]!}`,
        `"${words[j - 1]!}" fits: adding it makes the minimum length ${lineLen} (≤ ${maxWidth}). Extend the line and check the next word.`,
        { i, j, lineChars: [...words.slice(i, j).join(' ')] },
      );
    }

    const numWords = j - i;
    const parts = words.slice(i, j);
    const isLast = j === words.length || numWords === 1;
    let rendered: string;

    if (isLast) {
      rendered = renderLeft(parts, maxWidth);
      emit(
        'STOP',
        j === words.length ? 'last line' : 'single word',
        `${j === words.length ? 'This is the final line' : 'Only one word fits'}, so it is left-justified: join with single spaces and pad the right side to ${maxWidth}.`,
        { i, j, lineChars: [...rendered], lastLine: true },
      );
    } else {
      const totalSpaces = maxWidth - (lineLen - (numWords - 1));
      const perGap = Math.floor(totalSpaces / (numWords - 1));
      const extra = totalSpaces % (numWords - 1);
      emit(
        'STOP',
        `${numWords} words`,
        `No more words fit. ${numWords} words occupy ${lineLen - (numWords - 1)} chars, leaving ${totalSpaces} spaces across ${numWords - 1} gaps → ${perGap} per gap, with the leftmost ${extra} gap${extra === 1 ? '' : 's'} getting one extra.`,
        { i, j, lineChars: [...words.slice(i, j).join(' ')] },
      );
      rendered = renderJustified(parts, maxWidth);
    }

    result.push(rendered);
    emit(
      'EMIT',
      `"${rendered}"`,
      `Line finished (exactly ${rendered.length} chars): "${rendered}". Advance to word index ${j} and begin the next line.`,
      { i, j, lineChars: [...rendered], lastLine: isLast },
      'good',
    );

    i = j;
  }

  emit(
    'DONE',
    `${result.length} lines`,
    `All words placed. The paragraph is ${result.length} justified line${result.length === 1 ? '' : 's'}, each exactly ${maxWidth} characters wide.`,
    { done: true, lineChars: [] },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<JustifyState>) {
  const s = frame.state;
  // Show spaces as a visible middle-dot glyph so justification reads on the board.
  const cells = s.lineChars.map((ch) => (ch === ' ' ? '·' : ch));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i < cells.length)
    pointers.push({ i: s.i, label: 'line', tone: 'accent', place: 'above' });
  const tone = (idx: number) => (s.lineChars[idx]! === ' ' ? '' : 'match');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        maxWidth = <span className="font-mono text-ink">{s.maxWidth}</span>
        {s.i !== null && s.j !== null && !s.done && (
          <>
            {' · '}words[<span className="font-mono text-ink">{s.i}</span>..
            <span className="font-mono text-ink">{s.j}</span>)
          </>
        )}
      </div>
      {cells.length > 0 ? (
        <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('mt-1 font-mono text-ink3', vizText.sm)}>—</div>
      )}
      <div className={cn('mt-2 flex flex-col gap-0.5', vizText.sm)}>
        {s.result.map((line, k) => (
          <div key={k} className="font-mono text-good whitespace-pre">
            |{line.replace(/ /g, '·')}|
          </div>
        ))}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<JustifyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const words = s.i !== null && s.j !== null ? s.words.slice(s.i, s.j).join(' ') : '—';
  return (
    <VarGrid>
      <InspectorRow k="maxWidth" v={s.maxWidth} />
      <InspectorRow k="i (line start)" v={s.i ?? '—'} />
      <InspectorRow k="j (next word)" v={s.j ?? '—'} />
      <InspectorRow k="words on line" v={words} />
      <InspectorRow k="line width" v={s.lineChars.length} />
      <InspectorRow k="lines done" v={s.result.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-text-justification';
export const title = 'Text Justification';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Text Justification"?',
    choices: [
      {
        label: 'Greedy Line Packing — fits this problem',
        correct: true,
      },
      {
        label: 'Adjacent swap — different approach',
      },
      {
        label: 'Two pointers — different approach',
      },
      {
        label: 'Reverse in place — different approach',
      },
    ],
    explain: 'See Text Justification pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Text Justification), what strategy is established?',
    choices: [
      {
        label: 'See Text Justification pattern — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Text Justification: greedily pack as many words as fit into each -wide line, then space them out. Every line except the last is fully justified; the last line is left-justified.',
  },
  {
    id: 'key-step',
    prompt: 'On the "STOP" step ( words), what happens?',
    choices: [
      {
        label: 'No more words fit. words occupy — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      'No more words fit.  words occupy  chars, leaving  spaces across  gaps →  per gap, with the leftmost  gap getting one extra.',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'first word index — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `i` in sync: first word index of the current line',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Text Justification"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n*m) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O( time, O(words) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(n). Text Justification',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'All words placed. The paragraph — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: 'All words placed. The paragraph is  justified line, each exactly  characters wide.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'tj1',
      label: '["What","must","be","done"] · w=10',
      value: { words: ['What', 'must', 'be', 'done'], maxWidth: 10 },
    },
    {
      id: 'tj2',
      label: '["a","b","c","d","e"] · w=5',
      value: { words: ['a', 'b', 'c', 'd', 'e'], maxWidth: 5 },
    },
  ] satisfies SampleInput<JustifyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as JustifyState | undefined;
    if (!s) return { ok: false, label: 'no lines' };
    const ok = s.result.length > 0 && s.result.every((l) => l.length === s.maxWidth);
    return { ok, label: `${s.result.length} lines @ ${s.maxWidth}w` };
  },
};
