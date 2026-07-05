import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface CookingTimeInput {
  startAt: number;
  moveCost: number;
  pushCost: number;
  targetSeconds: number;
}

interface CookingTimeState {
  startAt: number;
  moveCost: number;
  pushCost: number;
  targetSeconds: number;
  // Which candidate is being examined: 'A' = (m, s), 'B' = (m-1, s+60), or null.
  cand: 'A' | 'B' | null;
  candM: number | null;
  candS: number | null;
  digits: number[]; // the 1-4 digits the current candidate types
  i: number | null; // digit being processed
  pos: number | null; // where the finger currently rests
  cost: number; // running cost for the current candidate
  costA: number | null; // finished cost for candidate A
  costB: number | null; // finished cost for candidate B
  best: number | null; // final answer
  done: boolean;
}

const INVALID = 1 << 30;

// Build the sequence of digits to type for a (minutes, seconds) pair, mirroring
// the Go solution: drop leading zeros on minutes, and only show the seconds tens
// digit when there is already a minutes digit or seconds >= 10.
function digitsFor(m: number, s: number): number[] {
  const digits: number[] = [];
  if (m >= 10) digits.push(Math.floor(m / 10));
  if (m > 0) digits.push(m % 10);
  if (digits.length > 0 || s >= 10) digits.push(Math.floor(s / 10));
  digits.push(s % 10);
  return digits;
}

function record({ startAt, moveCost, pushCost, targetSeconds }: CookingTimeInput): Frame<CookingTimeState>[] {
  const base: CookingTimeState = {
    startAt,
    moveCost,
    pushCost,
    targetSeconds,
    cand: null,
    candM: null,
    candS: null,
    digits: [],
    i: null,
    pos: null,
    cost: 0,
    costA: null,
    costB: null,
    best: null,
    done: false,
  };

  const carry: Partial<CookingTimeState> = {};

  const { emit, frames } = createRecorder<CookingTimeState>(() => ({ ...base, ...carry }), {
    merge: (b, partial) => ({ ...b, ...carry, ...partial }),
  });

  const m = Math.floor(targetSeconds / 60);
  const s = targetSeconds % 60;

  emit('INIT', `${targetSeconds}s`, `Minimum Cost to Set Cooking Time: a microwave shows mm:ss. We type ${targetSeconds} seconds as digits. Each keypress costs pushCost=${pushCost}; moving the finger to a different key costs moveCost=${moveCost}. The finger starts on digit ${startAt}. We try two ways to split the time and keep the cheaper one.`, { cand: null });

  // Simulate one candidate, emitting a frame per digit. Returns its cost.
  const simulate = (candM: number, candS: number, tag: 'A' | 'B'): number => {
    if (candM < 0 || candM > 99 || candS < 0 || candS > 99) {
      emit(tag === 'A' ? 'CAND_A' : 'CAND_B', `${tag}: invalid`, `Candidate ${tag} = ${candM} min ${candS} s is out of range (each of minutes and seconds must be 0..99), so it cannot be typed. Its cost is treated as ∞.`, { cand: tag, candM, candS, digits: [], i: null, pos: startAt, cost: INVALID }, 'bad');
      return INVALID;
    }

    const digits = digitsFor(candM, candS);
    emit(tag === 'A' ? 'CAND_A' : 'CAND_B', `${tag}: ${candM}m ${candS}s`, `Candidate ${tag}: represent the time as ${candM} minute(s) and ${candS} second(s). Typed as digits [${digits.join(', ')}]. Start with the finger on ${startAt} and cost 0.`, { cand: tag, candM, candS, digits, i: null, pos: startAt, cost: 0 });

    let cost = 0;
    let pos = startAt;
    for (let k = 0; k < digits.length; k++) {
      const d = digits[k];
      if (d !== pos) {
        const from = pos;
        cost += moveCost;
        pos = d;
        emit('MOVE', `move ${from}→${d} (+${moveCost})`, `Digit ${k + 1} is ${d}, but the finger is on ${from}. Move it to key ${d}: cost += moveCost (${moveCost}). Running cost = ${cost}.`, { cand: tag, candM, candS, digits, i: k, pos, cost });
      }
      cost += pushCost;
      emit('PUSH', `push ${d} (+${pushCost})`, `Press key ${d}: cost += pushCost (${pushCost}). Running cost = ${cost}. The finger stays on ${pos}.`, { cand: tag, candM, candS, digits, i: k, pos, cost });
    }

    emit(tag === 'A' ? 'DONE_A' : 'DONE_B', `${tag} cost=${cost}`, `Candidate ${tag} fully typed: total cost = ${cost}.`, { cand: tag, candM, candS, digits, i: null, pos, cost });
    return cost;
  };

  const costA = simulate(m, s, 'A');
  carry.costA = costA;

  const costB = simulate(m - 1, s + 60, 'B');
  carry.costB = costB;

  const best = Math.min(costA, costB);
  const winner = costA <= costB ? 'A' : 'B';
  emit('RESULT', `min=${best}`, `Compare the two candidates: A = ${costA === INVALID ? '∞' : costA}, B = ${costB === INVALID ? '∞' : costB}. The cheaper one is candidate ${winner} with cost ${best}. That is the minimum cost.`, { cand: null, best, done: true }, 'good');

  return frames;
}

function View({ frame }: PluginViewProps<CookingTimeState>) {
  const s = frame.state;
  const cells = s.digits.length > 0 ? s.digits : ['·'];
  const pointers: ArrayPointer[] = [];
  if (s.digits.length > 0 && s.i !== null) {
    pointers.push({ i: s.i, label: 'type', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.i === null) return '';
    if (i < s.i) return 'match';
    if (i === s.i) return 'found';
    return '';
  };
  const fmt = (v: number | null) => (v === null ? '—' : v >= INVALID ? '∞' : String(v));
  const rail = (
    <>
      <RailGroup label="candidate">
        <RailStat k="cand" v={s.cand ?? '—'} tone={s.cand !== null ? 'accent' : undefined} />
        <RailStat k="mm:ss" v={s.candM !== null ? `${s.candM}:${s.candS}` : '—'} />
        <RailStat k="finger" v={s.pos ?? '—'} />
        <RailStat k="cost" v={s.cost >= INVALID ? '∞' : s.cost} tone="accent" />
      </RailGroup>
      <RailGroup label="results">
        <RailStat k="A" v={fmt(s.costA)} />
        <RailStat k="B" v={fmt(s.costB)} />
      </RailGroup>
      {s.done && s.best !== null && (
        <RailResult label="min cost" value={s.best} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={140}>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CookingTimeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const fmt = (v: number | null) => (v === null ? '—' : v >= INVALID ? '∞' : v);
  return (
    <VarGrid>
      <InspectorRow k="target (s)" v={s.targetSeconds} />
      <InspectorRow k="candidate" v={s.cand ?? '—'} />
      <InspectorRow k="mm:ss" v={s.candM !== null ? `${s.candM}:${s.candS}` : '—'} />
      <InspectorRow k="finger pos" v={s.pos ?? '—'} />
      <InspectorRow k="running cost" v={s.cost >= INVALID ? '∞' : s.cost} />
      <InspectorRow k="cost A" v={fmt(s.costA)} />
      <InspectorRow k="cost B" v={fmt(s.costB)} />
      <InspectorRow k="answer" v={s.best !== null ? s.best : s.done ? '—' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-minimum-cost-to-set-cooking-time';
export const title = 'Minimum Cost to Set Cooking Time';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'mcsct1',
      label: 'start 1, move 2, push 1, 600s',
      value: { startAt: 1, moveCost: 2, pushCost: 1, targetSeconds: 600 },
    },
    {
      id: 'mcsct2',
      label: 'start 0, move 1, push 2, 76s',
      value: { startAt: 0, moveCost: 1, pushCost: 2, targetSeconds: 76 },
    },
  ] satisfies SampleInput<CookingTimeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CookingTimeState | undefined;
    if (!s || s.best === null) return { ok: false, label: 'no answer' };
    return { ok: true, label: `min cost ${s.best}` };
  },
};
