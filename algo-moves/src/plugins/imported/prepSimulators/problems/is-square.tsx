import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Pt {
  x: number;
  y: number;
}

interface IsSquareInput {
  points: [Pt, Pt, Pt, Pt];
}

interface DistEntry {
  pair: string; // e.g. "p1·p2"
  d: number; // squared distance
}

interface IsSquareState {
  points: [Pt, Pt, Pt, Pt];
  dists: DistEntry[]; // the 6 pairwise squared distances computed so far
  active: number | null; // index in dists currently being computed/inspected
  d1: number | null; // first distance (candidate "side")
  d2: number | null; // second distance (candidate "diagonal")
  counts: [number, number][]; // value -> occurrences across the 6 distances
  sideOk: boolean | null; // counts[d1] === 4
  diagOk: boolean | null; // counts[d2] === 2
  distinctOk: boolean | null; // d1 !== d2
  result: boolean | null;
  done: boolean;
}

const PAIR_INDICES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];
const PT_NAME = ['p1', 'p2', 'p3', 'p4'];

function sqDist(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function record({ points }: IsSquareInput): Frame<IsSquareState>[] {
  const frames: Frame<IsSquareState>[] = [];
  const dists: DistEntry[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<IsSquareState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        points,
        dists: dists.map((e) => ({ ...e })),
        active: null,
        d1: null,
        d2: null,
        counts: [],
        sideOk: null,
        diagOk: null,
        distinctOk: null,
        result: null,
        done: false,
        ...s,
      },
    });

  const fmtPts = points.map((p, i) => `${PT_NAME[i]}(${p.x},${p.y})`).join(' ');
  emit(
    'INIT',
    '4 points',
    `Is Square: decide whether the four points ${fmtPts} form a square. A square has 4 equal sides and 2 equal diagonals, so we compute all 6 pairwise squared distances and check their multiset. Squared distance avoids floating-point square roots — equality is exact. Time O(1), Space O(1).`,
    {},
  );

  // Compute d1 = dist(p1, p2) first; if it is 0, two points coincide → not a square.
  {
    const [a, b] = PAIR_INDICES[0];
    const d = sqDist(points[a], points[b]);
    dists.push({ pair: `${PT_NAME[a]}·${PT_NAME[b]}`, d });
    if (d === 0) {
      emit(
        'DEGENERATE',
        `d1=0`,
        `The very first distance d1 = dist(${PT_NAME[a]}, ${PT_NAME[b]}) = 0, so ${PT_NAME[a]} and ${PT_NAME[b]} are the same point. A square cannot have coincident vertices, so we return false immediately.`,
        { dists: dists.map((e) => ({ ...e })), active: 0, d1: 0, result: false, done: true },
        'bad',
      );
      return frames;
    }
    emit(
      'DIST',
      `d1=${d}`,
      `d1 = dist(${PT_NAME[a]}, ${PT_NAME[b]}) = ${d}. This first non-zero distance is our reference "side" candidate — in a valid square it should appear exactly 4 times among the 6 distances.`,
      { dists: dists.map((e) => ({ ...e })), active: 0, d1: d },
    );
  }

  const d1 = dists[0].d;

  // Compute the remaining 5 distances.
  for (let k = 1; k < PAIR_INDICES.length; k++) {
    const [a, b] = PAIR_INDICES[k];
    const d = sqDist(points[a], points[b]);
    dists.push({ pair: `${PT_NAME[a]}·${PT_NAME[b]}`, d });
    emit(
      'DIST',
      `d${k + 1}=${d}`,
      `d${k + 1} = dist(${PT_NAME[a]}, ${PT_NAME[b]}) = ${d}. Append it to the list of pairwise squared distances; later we tally how many times each value occurs.`,
      { dists: dists.map((e) => ({ ...e })), active: k, d1 },
    );
  }

  const d2 = dists[1].d; // candidate "diagonal" = dist(p1, p3)

  // Tally counts across all 6 distances.
  const countMap = new Map<number, number>();
  for (const e of dists) countMap.set(e.d, (countMap.get(e.d) ?? 0) + 1);
  const counts: [number, number][] = [...countMap.entries()];
  emit(
    'COUNT',
    'tally',
    `Tally how many times each squared distance occurs across all 6 pairs: ${counts
      .map(([v, c]) => `${v}×${c}`)
      .join(', ')}. A square produces exactly two distinct values — the side (4 copies) and the diagonal (2 copies).`,
    { dists: dists.map((e) => ({ ...e })), d1, d2, counts },
  );

  // Three checks, mirroring `counts[d1]==4 && counts[d2]==2 && d1!=d2`.
  const sideOk = (countMap.get(d1) ?? 0) === 4;
  emit(
    'CHECK',
    `counts[${d1}]=${countMap.get(d1) ?? 0}`,
    `Check 1 — sides: d1 = ${d1} must occur exactly 4 times (the four edges). It occurs ${
      countMap.get(d1) ?? 0
    } time(s), so this check is ${sideOk ? 'satisfied' : 'NOT satisfied'}.`,
    { dists: dists.map((e) => ({ ...e })), d1, d2, counts, sideOk },
    sideOk ? 'good' : 'bad',
  );

  const diagOk = (countMap.get(d2) ?? 0) === 2;
  emit(
    'CHECK',
    `counts[${d2}]=${countMap.get(d2) ?? 0}`,
    `Check 2 — diagonals: d2 = ${d2} must occur exactly 2 times (the two diagonals). It occurs ${
      countMap.get(d2) ?? 0
    } time(s), so this check is ${diagOk ? 'satisfied' : 'NOT satisfied'}.`,
    { dists: dists.map((e) => ({ ...e })), d1, d2, counts, sideOk, diagOk },
    diagOk ? 'good' : 'bad',
  );

  const distinctOk = d1 !== d2;
  emit(
    'CHECK',
    `${d1}≠${d2}`,
    `Check 3 — distinctness: the side d1 = ${d1} and diagonal d2 = ${d2} must differ; otherwise the shape is degenerate. They are ${
      distinctOk ? 'different' : 'equal'
    }, so this check is ${distinctOk ? 'satisfied' : 'NOT satisfied'}.`,
    { dists: dists.map((e) => ({ ...e })), d1, d2, counts, sideOk, diagOk, distinctOk },
    distinctOk ? 'good' : 'bad',
  );

  const result = sideOk && diagOk && distinctOk;
  emit(
    'DONE',
    result ? 'square' : 'not a square',
    result
      ? `All three checks pass: d1 = ${d1} appears 4 times (sides), d2 = ${d2} appears 2 times (diagonals), and they differ. The four points form a square → true.`
      : `At least one check failed, so the four points do not form a square → false.`,
    {
      dists: dists.map((e) => ({ ...e })),
      d1,
      d2,
      counts,
      sideOk,
      diagOk,
      distinctOk,
      result,
      done: true,
    },
    result ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<IsSquareState>) {
  const s = frame.state;
  const values = s.dists.map((e) => `${e.pair}=${e.d}`);
  const pointers: ArrayPointer[] = [];
  if (s.active !== null) pointers.push({ i: s.active, label: 'now', tone: 'accent', place: 'above' });

  const tone = (i: number) => {
    const e = s.dists[i];
    if (!e) return '';
    if (s.distinctOk !== null) {
      // verdict phase: green for the matched side/diagonal values
      if (s.d1 !== null && e.d === s.d1) return 'found';
      if (s.d2 !== null && e.d === s.d2) return 'match';
      return 'dead';
    }
    if (s.active === i) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        points{' '}
        <span className="font-mono text-ink">
          {s.points.map((p) => `(${p.x},${p.y})`).join(' ')}
        </span>
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.counts.length > 0 && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          counts {'{'}
          {s.counts.map(([v, c]) => `${v}:${c}`).join(', ')}
          {'}'}
        </div>
      )}
      {(s.sideOk !== null || s.diagOk !== null || s.distinctOk !== null) && (
        <div className={cn('mt-1 flex flex-wrap gap-2 font-mono', vizText.sm)}>
          <span className={s.sideOk === null ? 'text-ink3' : s.sideOk ? 'text-good' : 'text-bad'}>
            side×4 {s.sideOk === null ? '?' : s.sideOk ? '✓' : '✗'}
          </span>
          <span className={s.diagOk === null ? 'text-ink3' : s.diagOk ? 'text-good' : 'text-bad'}>
            diag×2 {s.diagOk === null ? '?' : s.diagOk ? '✓' : '✗'}
          </span>
          <span
            className={s.distinctOk === null ? 'text-ink3' : s.distinctOk ? 'text-good' : 'text-bad'}
          >
            d1≠d2 {s.distinctOk === null ? '?' : s.distinctOk ? '✓' : '✗'}
          </span>
        </div>
      )}
      {s.result !== null && (
        <div className={cn('mt-1 font-mono', vizText.base, s.result ? 'text-good' : 'text-bad')}>
          → {s.result ? 'square' : 'not a square'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<IsSquareState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const fmtCheck = (v: boolean | null) => (v === null ? '…' : v ? '✓' : '✗');
  return (
    <VarGrid>
      <InspectorRow k="distances" v={`${s.dists.length}/6`} />
      <InspectorRow k="d1 (side)" v={s.d1 ?? '—'} />
      <InspectorRow k="d2 (diag)" v={s.d2 ?? '—'} />
      <InspectorRow k="distinct values" v={s.counts.length || '—'} />
      <InspectorRow k="side×4" v={fmtCheck(s.sideOk)} />
      <InspectorRow k="diag×2" v={fmtCheck(s.diagOk)} />
      <InspectorRow k="d1≠d2" v={fmtCheck(s.distinctOk)} />
      <InspectorRow k="result" v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'square' : 'not a square'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-is-square';
export const title = 'Is square';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sq1',
      label: 'square (0,0)(0,2)(2,2)(2,0)',
      value: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 2 },
          { x: 2, y: 2 },
          { x: 2, y: 0 },
        ],
      },
    },
    {
      id: 'sq2',
      label: 'rectangle (not square)',
      value: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 3, y: 1 },
          { x: 3, y: 0 },
        ],
      },
    },
  ] satisfies SampleInput<IsSquareInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IsSquareState | undefined;
    return s?.result
      ? { ok: true, label: 'square' }
      : { ok: false, label: 'not a square' };
  },
};
