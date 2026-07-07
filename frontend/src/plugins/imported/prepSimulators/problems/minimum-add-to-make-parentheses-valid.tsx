import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MinAddInput {
  s: string;
}

interface MinAddState {
  chars: string[];
  i: number | null; // current index being scanned
  open: number; // unmatched '(' waiting for a partner
  close: number; // ')' with no partner → must insert a '(' before it
  action: 'open+' | 'match' | 'close+' | null; // what happened at this step
  done: boolean;
}

function record({ s }: MinAddInput): Frame<MinAddState>[] {
  const chars = s.split('');
  let open = 0;
  let close = 0;

  const { emit, frames } = createRecorder<MinAddState>(() => ({
    chars,
    i: null,
    open,
    close,
    action: null,
    done: false,
  }));

  emit(
    'INIT',
    `"${s}"`,
    `Minimum Add to Make Parentheses Valid: scan left to right with two counters. open = unmatched '(' still waiting for a ')'; close = orphan ')' that has no '(' to its left. The answer is open + close. Time O(n), Space O(1).`,
    {},
  );

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '(') {
      open++;
      emit(
        'OPEN',
        `open=${open}`,
        `Char ${i} is '(' — a new unmatched open. Increment open to ${open}; it now waits for a future ')' to close it.`,
        { i, action: 'open+' },
      );
    } else if (open > 0) {
      open--;
      emit(
        'MATCH',
        `open=${open}`,
        `Char ${i} is ')' and there is a waiting '(' (open was ${open + 1}). They pair up, so decrement open to ${open}. No insertion needed.`,
        { i, action: 'match' },
      );
    } else {
      close++;
      emit(
        'CLOSE',
        `close=${close}`,
        `Char ${i} is ')' but open is 0 — nothing to match it. This ')' is an orphan, so we must insert a '(' before it: increment close to ${close}.`,
        { i, action: 'close+' },
        'bad',
      );
    }
  }

  const answer = open + close;
  emit(
    'DONE',
    `${answer} to add`,
    `Scan finished. ${open} '(' are still unmatched (each needs a ')') and ${close} ')' were orphans (each needed a '('). Minimum insertions = open + close = ${open} + ${close} = ${answer}.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MinAddState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    const tone: ArrayPointer['tone'] =
      s.action === 'close+' ? 'bad' : s.action === 'match' ? 'good' : 'accent';
    pointers.push({ i: s.i, label: 'i', tone, place: 'above' });
  }
  const tone = (i: number) => {
    if (s.i !== i) return '';
    if (s.action === 'match') return 'found';
    if (s.action === 'close+') return 'dead';
    return 'match';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        open = <span className="font-mono text-ink">{s.open}</span>
        {' · '}close = <span className="font-mono text-ink">{s.close}</span>
        {' · '}to add = <span className="font-mono text-ink">{s.open + s.close}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → insert {s.open + s.close} parenthes{s.open + s.close === 1 ? 'is' : 'es'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MinAddState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="s[i]" v={s.i !== null ? s.chars[s.i] : '—'} />
      <InspectorRow k="open (unmatched '(')" v={s.open} />
      <InspectorRow k="close (orphan ')')" v={s.close} />
      <InspectorRow k="to add (open+close)" v={s.open + s.close} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-minimum-add-to-make-parentheses-valid';
export const title = 'Minimum Add to Make Parentheses Valid';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Minimum Add to Make Parentheses Valid"?',
    choices: [
      {
        label: 'Counter — fits this problem',
        correct: true,
      },
      {
        label: 'Bitmask Hash Set — different approach',
      },
      {
        label: 'DP reachability — different approach',
      },
      {
        label: 'Greedy (pick highest count) — different approach',
      },
    ],
    explain: 'See Minimum Add To Make Parentheses Valid pattern',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Minimum Add to Make Parentheses Valid), what strategy is established?',
    choices: [
      {
        label: 'See Minimum Add To Make Parentheses — described in INIT caption',
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
      "Minimum Add to Make Parentheses Valid: scan left to right with two counters. open = unmatched '(' still waiting for a ')'; close = orphan ')' that has no '(' to its left. The answer is open + close. Time O(n), Space O(1).",
  },
  {
    id: 'key-step',
    prompt: 'On the "MATCH" step (open=), what happens?',
    choices: [
      {
        label: "Char is ')' and there — this move caption",
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
      "Char  is ')' and there is a waiting '(' (open was ). They pair up, so decrement open to . No insertion needed.",
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'current index being scanned — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: current index being scanned',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Minimum Add to Make Parentheses Valid"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n^2) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n^2) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n·L) time, O(n·L) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). Minimum Add To Make Parentheses Valid',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: "Scan finished. '(' are still unmatched — final DONE caption",
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
    explain:
      "Scan finished.  '(' are still unmatched (each needs a ')') and  ')' were orphans (each needed a '('). Minimum insertions = open + close =  +  = .",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'maq1', label: '"())"', value: { s: '())' } },
    { id: 'maq2', label: '"((("', value: { s: '(((' } },
  ] satisfies SampleInput<MinAddInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinAddState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const n = s.open + s.close;
    return { ok: true, label: `${n} to add` };
  },
};
