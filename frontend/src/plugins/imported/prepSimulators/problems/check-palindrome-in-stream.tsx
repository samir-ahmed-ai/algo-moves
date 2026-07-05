import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PalStreamInput {
  chars: string;
}

interface PalStreamState {
  stream: string[];
  idx: number | null;
  stack: string[];
  matched: boolean;
  ok: boolean;
  result: boolean | null;
  done: boolean;
}

function checkPalindromeInStream(chars: string[]): boolean {
  const back: string[] = [];
  let ok = true;
  for (const ch of chars) {
    const n = back.length;
    if (n > 0 && back[n - 1] === ch) {
      back.pop();
    } else {
      back.push(ch);
      ok = false;
    }
  }
  return ok && back.length === 0;
}

function record({ chars: raw }: PalStreamInput): Frame<PalStreamState>[] {
  const stream = raw.split('');  const stack: string[] = [];
  let ok = true;

  const { emit, frames } = createRecorder<PalStreamState>(() => ({
        stream,
        idx: null,
        stack: stack.slice(),
        matched: false,
        ok,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    'empty stack',
    `Streaming palindrome check: each letter either cancels the stack top (if equal) or gets pushed. A palindrome stream keeps \`ok\` true and ends with an empty stack.`,
    {},
  );

  for (let idx = 0; idx < stream.length; idx++) {
    const ch = stream[idx];
    const n = stack.length;
    if (n > 0 && stack[n - 1] === ch) {
      stack.pop();
      emit(
        'MATCH',
        `pop '${ch}'`,
        `Letter '${ch}': stack top is also '${ch}' — pop (matched pair). Stack shrinks toward the center of the palindrome.`,
        { idx, matched: true },
        'good',
      );
    } else {
      stack.push(ch);
      ok = false;
      emit(
        'PUSH',
        `push '${ch}'`,
        `Letter '${ch}': no matching top — push onto the stack and mark \`ok = false\` (unmatched prefix).`,
        { idx, matched: false },
        'bad',
      );
    }
  }

  const result = ok && stack.length === 0;
  emit(
    'DONE',
    result ? 'palindrome' : 'not palindrome',
    result
      ? `Stream exhausted with empty stack and every letter matched — this is a palindrome stream.`
      : `Stream done but stack has ${stack.length} unmatched letter(s) — not a palindrome stream.`,
    { result, done: true },
    result ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PalStreamState>) {
  const s = frame.state;
  const consumed = s.idx !== null ? s.stream.slice(0, s.idx + 1) : [];
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        stream
        {s.idx !== null && (
          <>
            {' · '}at{' '}
            <span className="font-mono text-accent">{s.stream[s.idx]}</span>
            {s.matched ? ' (matched)' : ' (pushed)'}
          </>
        )}
      </div>
      <div className={cn('font-mono', vizText.sm)}>
        {s.stream.map((c, i) => (
          <span
            key={i}
            className={cn(
              'mr-0.5',
              s.idx === i ? 'rounded bg-accentbg text-accent' : i < (s.idx ?? -1) ? 'text-ink3' : 'text-ink',
            )}
          >
            {c}
          </span>
        ))}
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        stack (top →){' '}
        {s.stack.length === 0 ? (
          <span className="text-ink3">empty</span>
        ) : (
          s.stack.map((c, i) => (
            <span key={i} className={cn('mr-1 rounded px-1', i === s.stack.length - 1 ? 'bg-accentbg text-accent' : 'text-ink')}>
              {c}
            </span>
          ))
        )}
      </div>
      <div className={cn('mt-1', vizText.sm, s.result === true ? 'text-good' : s.result === false ? 'text-bad' : 'text-ink3')}>
        ok = {s.ok ? 'true' : 'false'} · consumed [{consumed.join('')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PalStreamState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="idx" v={s.idx ?? '—'} />
      <InspectorRow k="stack size" v={s.stack.length} />
      <InspectorRow k="stack top" v={s.stack[s.stack.length - 1] ?? '—'} />
      <InspectorRow k="ok" v={s.ok ? 'true' : 'false'} />
      <InspectorRow k="result" v={s.result === null ? '…' : s.result ? 'palindrome' : 'no'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-check-palindrome-in-stream';
export const title = 'Check palindrome in stream';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Check palindrome in stream\"?",
    choices: [
      {
        label: "Streaming palindrome stack — fits this problem",
        correct: true
      },
      {
        label: "String builder scan — different approach"
      },
      {
        label: "Filesystem walk with size filter — different approach"
      },
      {
        label: "In-place byte reversal — different approach"
      }
    ],
    explain: "Cancel matching letters off a stack; empty at the end means palindrome"
  },
  {
    id: "key-step",
    prompt: "On the \"PUSH\" step (push ''), what happens?",
    choices: [
      {
        label: "Letter '': no matching top — — this move caption",
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
    explain: "Letter '': no matching top — push onto the stack and mark \\"
  },
  {
    id: "state",
    prompt: "What does the `stream` field track in the visualization state?",
    choices: [
      {
        label: "Field stream in state — updated each frame",
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
    explain: "The recorder snapshots `stream` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Check palindrome in stream\"?",
    choices: [
      {
        label: "O(1) amortized per letter time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n log k) time, O(k) space — wrong order of growth"
      },
      {
        label: "O(1) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(file size) time, O(1) space — wrong order of growth"
      }
    ],
    explain: "O(1) amortized per letter. O(n). top==ch -> pop (matched) else push; ok && stack empty"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Letter '': no matching top — — final DONE caption",
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
    explain: "Letter '': no matching top — push onto the stack and mark \\"
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ps1', label: '"abccba"', value: { chars: 'abccba' } },
    { id: 'ps2', label: '"abc"', value: { chars: 'abc' } },
  ] satisfies SampleInput<PalStreamInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PalStreamState | undefined;
    if (s?.result === null || s?.result === undefined) return { ok: false, label: 'incomplete' };
    const expected = checkPalindromeInStream(s.stream);
    return { ok: s.result === expected, label: s.result ? 'palindrome' : 'not palindrome' };
  },
};
