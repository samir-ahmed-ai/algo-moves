import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SwapLRInput {
  start: string;
  target: string;
}

interface SwapLRState {
  start: string; // start string as-is
  target: string; // target string as-is
  i: number | null; // pointer into start (points at the char under test, or n when past end)
  j: number | null; // pointer into target
  result: boolean | null; // final verdict once known
  reason: string; // short human reason for the current step / failure
  done: boolean;
}

function record({ start, target }: SwapLRInput): Frame<SwapLRState>[] {  const n = start.length;

  const { emit, frames } = createRecorder<SwapLRState>(() => ({
        start,
        target,
        i: null,
        j: null,
        result: null,
        reason: '',
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `Swap Adjacent in LR String: an 'L' can only move left and an 'R' can only move right (past 'X' blanks). Walk both strings with two pointers, skipping 'X', and check the non-X letters match in order with the right position constraint.`,
    { i: 0, j: 0 },
  );

  if (start.length !== target.length) {
    emit(
      'FAIL',
      'length mismatch',
      `start and target have different lengths, so no sequence of swaps can turn one into the other.`,
      { i: null, j: null, result: false, reason: 'length mismatch', done: true },
      'bad',
    );
    return frames;
  }

  let i = 0;
  let j = 0;

  while (i < n || j < n) {
    // Skip 'X' in start.
    while (i < n && start[i] === 'X') {
      emit(
        'SKIP_START',
        `start[${i}]=X`,
        `start[${i}] is 'X' (a blank), which letters slide across freely. Advance i past it.`,
        { i, j, reason: `skip X in start` },
      );
      i++;
    }
    // Skip 'X' in target.
    while (j < n && target[j] === 'X') {
      emit(
        'SKIP_TARGET',
        `target[${j}]=X`,
        `target[${j}] is 'X' (a blank). Advance j past it so we only line up real letters.`,
        { i, j, reason: `skip X in target` },
      );
      j++;
    }

    // Both ran out together, or exactly one did.
    if ((i === n) !== (j === n)) {
      emit(
        'FAIL',
        'letter count differs',
        `One pointer reached the end while the other still has a letter (i=${i}, j=${j}). The two strings have a different number of L/R letters, so it is impossible.`,
        { i: i < n ? i : null, j: j < n ? j : null, result: false, reason: 'unequal L/R counts', done: true },
        'bad',
      );
      return frames;
    }

    if (i === n) {
      emit(
        'BREAK',
        'both exhausted',
        `Both pointers reached the end at the same time. Every L/R letter has been matched successfully.`,
        { i: null, j: null, reason: 'all letters matched' },
      );
      break;
    }

    // Now start[i] and target[j] are the next real letters.
    const a = start[i];
    const b = target[j];
    emit(
      'COMPARE',
      `${a} vs ${b}`,
      `Compare the next real letters: start[${i}] = '${a}' and target[${j}] = '${b}'. They must be the same letter.`,
      { i, j, reason: `compare ${a} vs ${b}` },
    );

    if (a !== b) {
      emit(
        'FAIL',
        `${a} ≠ ${b}`,
        `start[${i}] = '${a}' but target[${j}] = '${b}'. Different letters can never be produced by swapping, so it is impossible.`,
        { i, j, result: false, reason: `letter mismatch ${a}≠${b}`, done: true },
        'bad',
      );
      return frames;
    }

    if (a === 'L' && i < j) {
      emit(
        'FAIL',
        'L must not move right',
        `This is an 'L', which can only move left. But it sits at i=${i} in start and would need to end at j=${j} in target (i < j), i.e. move right. Impossible.`,
        { i, j, result: false, reason: 'L would move right', done: true },
        'bad',
      );
      return frames;
    }

    if (a === 'R' && i > j) {
      emit(
        'FAIL',
        'R must not move left',
        `This is an 'R', which can only move right. But it sits at i=${i} in start and would need to end at j=${j} in target (i > j), i.e. move left. Impossible.`,
        { i, j, result: false, reason: 'R would move left', done: true },
        'bad',
      );
      return frames;
    }

    emit(
      'OK',
      `${a} placement valid`,
      `'${a}' at start[${i}] can reach target[${j}]: ${a === 'L' ? `an 'L' moving left needs i ≥ j (${i} ≥ ${j})` : `an 'R' moving right needs i ≤ j (${i} ≤ ${j})`}. Valid — advance both pointers.`,
      { i, j, reason: `${a} ok` },
      'good',
    );

    i++;
    j++;
  }

  emit(
    'DONE',
    'transformable',
    `Every letter matched with a legal move direction, so start CAN be transformed into target. Answer: true.`,
    { i: null, j: null, result: true, reason: 'all letters matched', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SwapLRState>) {
  const s = frame.state;
  const startChars = s.start.split('');
  const targetChars = s.target.split('');

  const startPointers: ArrayPointer[] = [];
  if (s.i !== null && s.i >= 0 && s.i < startChars.length) {
    startPointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  }
  const targetPointers: ArrayPointer[] = [];
  if (s.j !== null && s.j >= 0 && s.j < targetChars.length) {
    targetPointers.push({ i: s.j, label: 'j', tone: 'good', place: 'below' });
  }

  const startTone = (idx: number): string => {
    if (s.result === false && s.i === idx) return 'dead';
    if (s.result === true) return startChars[idx] === 'X' ? '' : 'found';
    if (s.i === idx && startChars[idx] !== 'X') return 'match';
    return '';
  };
  const targetTone = (idx: number): string => {
    if (s.result === false && s.j === idx) return 'dead';
    if (s.result === true) return targetChars[idx] === 'X' ? '' : 'found';
    if (s.j === idx && targetChars[idx] !== 'X') return 'match';
    return '';
  };

  const verdictText =
    s.result === true ? 'true' : s.result === false ? 'false' : '…';
  const verdictTone =
    s.result === true ? 'text-good' : s.result === false ? 'text-bad' : 'text-ink3';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        canTransform · <span className="font-mono text-ink">L</span> moves left,{' '}
        <span className="font-mono text-ink">R</span> moves right,{' '}
        <span className="font-mono text-ink">X</span> is blank
      </div>
      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>start</div>
      <ArrayRow values={startChars} cellTone={startTone} pointers={startPointers} windowRange={null} />
      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>target</div>
      <ArrayRow values={targetChars} cellTone={targetTone} pointers={targetPointers} windowRange={null} />
      {s.reason && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>{s.reason}</div>
      )}
      <div className={cn('mt-1 font-mono', vizText.base, verdictTone)}>→ {verdictText}</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SwapLRState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const startChars = s.start.split('');
  const targetChars = s.target.split('');
  const at = (chars: string[], idx: number | null) =>
    idx !== null && idx >= 0 && idx < chars.length ? chars[idx] : '—';
  return (
    <VarGrid>
      <InspectorRow k="start" v={s.start} />
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="j" v={s.j ?? '—'} />
      <InspectorRow k="start[i]" v={at(startChars, s.i)} />
      <InspectorRow k="target[j]" v={at(targetChars, s.j)} />
      <InspectorRow k="step" v={s.reason || '…'} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-swap-adjacent-in-lr-string';
export const title = 'Swap Adjacent in LR String';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'lr1', label: '"RXXLRXRXL" → "XRLXXRRLX"', value: { start: 'RXXLRXRXL', target: 'XRLXXRRLX' } },
    { id: 'lr2', label: '"XL" → "LX" (L can move left)', value: { start: 'XL', target: 'LX' } },
  ] satisfies SampleInput<SwapLRInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SwapLRState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true' : 'false' };
  },
};
