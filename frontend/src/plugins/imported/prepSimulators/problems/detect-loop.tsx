import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface DetectLoopInput {
  /** Node values, laid out left→right as the chain. */
  values: number[];
  /**
   * Index the tail's Next points back to. -1 means no loop (null tail).
   * Must be in [0, values.length-1] when set.
   */
  loopAt: number;
}

type Phase = 'init' | 'race' | 'reset' | 'walk' | 'done';

interface DetectLoopState {
  values: number[];
  loopAt: number; // where the chain reconnects (-1 = none)
  slow: number | null; // current slow index
  fast: number | null; // current fast index
  phase: Phase;
  entry: number | null; // detected loop-entry index
  hasLoop: boolean | null; // null until decided
  done: boolean;
}

/**
 * Faithful re-implementation of the Go detectLoop (Floyd cycle).
 * The list is a value array; `next(i)` follows the chain, wrapping the tail
 * back to `loopAt` when a loop exists, else returning null past the end.
 */
function record({ values, loopAt }: DetectLoopInput): Frame<DetectLoopState>[] {  const n = values.length;

  const next = (i: number | null): number | null => {
    if (i === null) return null;
    if (i < n - 1) return i + 1;
    // i is the tail
    return loopAt >= 0 ? loopAt : null;
  };

  const { emit, frames } = createRecorder<DetectLoopState>(() => ({
        values,
        loopAt,
        slow: null,
        fast: null,
        phase: 'init',
        entry: null,
        hasLoop: null,
        done: false
      }));

  if (n === 0) {
    emit('INIT', 'empty', 'The list is empty, so there is nothing to traverse — no loop.', {
      phase: 'done',
      hasLoop: false,
      done: true,
    }, 'bad');
    return frames;
  }

  emit(
    'INIT',
    'slow=fast=head',
    `Floyd cycle detection: start the slow and fast pointers both at the head (index 0). Slow moves 1 step per turn, fast moves 2. If a loop exists they will eventually meet inside it.`,
    { slow: 0, fast: 0, phase: 'race' },
  );

  let slow: number | null = 0;
  let fast: number | null = 0;

  // for (fast != nil && fast.Next != nil)
  while (fast !== null && next(fast) !== null) {
    slow = next(slow);
    fast = next(next(fast));
    emit(
      'STEP',
      `slow=${slow}, fast=${fast}`,
      `Advance: slow steps once to value ${slow !== null ? values[slow] : '∅'} (index ${slow}), fast steps twice to value ${fast !== null ? values[fast] : '∅'} (index ${fast}). Check whether they now sit on the same node.`,
      { slow, fast, phase: 'race' },
    );

    if (slow === fast) {
      emit(
        'MEET',
        `meet@${slow}`,
        `Slow and fast collide at index ${slow} (value ${slow !== null ? values[slow] : '∅'}) — that proves a loop exists. Now reset slow to the head and advance both by 1; they will meet again exactly at the loop entry.`,
        { slow, fast, phase: 'reset', hasLoop: true },
        'good',
      );

      slow = 0;
      emit(
        'RESET',
        'slow=head',
        `Reset slow back to the head (index 0). Fast stays parked at the meeting point. From here both pointers move one step at a time.`,
        { slow, fast, phase: 'walk', hasLoop: true },
      );

      // for slow != fast
      while (slow !== fast) {
        slow = next(slow);
        fast = next(fast);
        emit(
          'WALK',
          `slow=${slow}, fast=${fast}`,
          `Walk in lockstep: slow → index ${slow}, fast → index ${fast}. They are still apart, so keep advancing both by one.`,
          { slow, fast, phase: 'walk', hasLoop: true },
        );
      }

      emit(
        'ENTRY',
        `entry@${slow}`,
        `slow and fast meet again at index ${slow} (value ${slow !== null ? values[slow] : '∅'}) — that is the start of the loop. Return this node.`,
        { slow, fast, phase: 'done', hasLoop: true, entry: slow, done: true },
        'good',
      );
      return frames;
    }
  }

  emit(
    'NULL',
    'fast hit end',
    `Fast reached the end of the list (a null Next) without ever meeting slow. A list with a loop never ends, so this list has no cycle — return null.`,
    { slow, fast, phase: 'done', hasLoop: false, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<DetectLoopState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.slow !== null) pointers.push({ i: s.slow, label: 'slow', tone: 'accent', place: 'above' });
  if (s.fast !== null) pointers.push({ i: s.fast, label: 'fast', tone: 'warn', place: 'below' });

  const tone = (i: number) => {
    if (s.entry !== null && i === s.entry) return 'found';
    if (s.slow === i && s.fast === i) return 'match';
    return '';
  };

  const chainHint = s.values
    .map((v) => `${v}`)
    .join(' → ');
  const loopTail =
    s.loopAt >= 0
      ? ` ↺ back to index ${s.loopAt} (value ${s.values[s.loopAt]})`
      : ' → ∅';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        chain: <span className="font-mono text-ink">{chainHint}</span>
        <span className="font-mono text-ink2">{loopTail}</span>
      </div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        phase: <span className="font-mono text-ink">{s.phase}</span>
        {s.hasLoop !== null && (
          <>
            {' · '}loop ={' '}
            <span className={cn('font-mono', s.hasLoop ? 'text-good' : 'text-ink')}>
              {s.hasLoop ? 'yes' : 'no'}
            </span>
          </>
        )}
      </div>
      {s.entry !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → loop entry at index {s.entry} (value {s.values[s.entry]})
        </div>
      )}
      {s.done && s.hasLoop === false && (
        <div className={cn('mt-1 font-mono text-ink2', vizText.base)}>→ no loop (null)</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DetectLoopState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (i: number | null) => (i !== null ? `${i} (=${s.values[i]})` : '—');
  return (
    <VarGrid>
      <InspectorRow k="len" v={s.values.length} />
      <InspectorRow k="loopAt" v={s.loopAt >= 0 ? s.loopAt : 'none'} />
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="slow" v={at(s.slow)} />
      <InspectorRow k="fast" v={at(s.fast)} />
      <InspectorRow k="has loop" v={s.hasLoop === null ? '…' : s.hasLoop ? 'yes' : 'no'} />
      <InspectorRow k="entry" v={s.entry !== null ? at(s.entry) : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-detect-loop';
export const title = 'Detect loop';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'dl1',
      label: '[1,2,3,4,5] ↺ idx 1',
      value: { values: [1, 2, 3, 4, 5], loopAt: 1 },
    },
    {
      id: 'dl2',
      label: '[1,2,3,4] no loop',
      value: { values: [1, 2, 3, 4], loopAt: -1 },
    },
  ] satisfies SampleInput<DetectLoopInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DetectLoopState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    if (s.entry !== null) {
      return { ok: true, label: `loop entry @ ${s.entry} (val ${s.values[s.entry]})` };
    }
    return { ok: s.hasLoop === false, label: 'no loop' };
  },
};
