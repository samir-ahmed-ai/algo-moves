import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';

interface Job {
  start: number;
  end: number;
  profit: number;
}

interface SchedulerInput {
  jobs: Job[];
}

const NONE = -1;

interface SchedulerState {
  jobs: Job[]; // sorted by end time
  dp: (number | null)[]; // dp[i] = best profit using jobs[0..i]; null = not filled
  i: number | null; // job currently being decided
  prev: number | null; // last non-overlapping job index (-1 / NONE = none)
  lo: number | null; // binary-search window lo
  hi: number | null; // binary-search window hi
  mid: number | null; // binary-search probe
  take: number | null; // profit if we take job i (+ dp[prev])
  skip: number | null; // profit if we skip job i (= dp[i-1])
  done: boolean;
}

function lastNotOverlap(
  jobs: Job[],
  idx: number,
  onProbe: (lo: number, hi: number, mid: number, ok: boolean) => void,
): number {
  let lo = 0;
  let hi = idx - 1;
  let res = NONE;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const ok = jobs[mid].end <= jobs[idx].start;
    onProbe(lo, hi, mid, ok);
    if (ok) {
      res = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return res;
}

function record({ jobs: rawJobs }: SchedulerInput): Frame<SchedulerState>[] {
  const frames: Frame<SchedulerState>[] = [];
  const jobs = [...rawJobs].sort((a, b) => a.end - b.end);
  const n = jobs.length;
  const dp: (number | null)[] = new Array<number | null>(n).fill(null);

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<SchedulerState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        jobs,
        dp: dp.slice(),
        i: null,
        prev: null,
        lo: null,
        hi: null,
        mid: null,
        take: null,
        skip: null,
        done: false,
        ...s,
      },
    });

  if (n === 0) {
    emit('DONE', 'no jobs', 'There are no jobs to schedule, so the maximum profit is 0.', { done: true }, 'good');
    return frames;
  }

  emit(
    'SORT',
    'sort by end',
    `Weighted Job Scheduler: pick a subset of non-overlapping jobs maximizing total profit. First sort all ${n} jobs by END time so that for any job i, every compatible earlier job lies to its left — that lets a binary search find the latest non-overlapping job.`,
    {},
  );

  dp[0] = jobs[0].profit;
  emit(
    'BASE',
    `dp[0]=${dp[0]}`,
    `Base case: with only the first (earliest-ending) job available, the best we can do is take it. dp[0] = profit of job 0 = ${jobs[0].profit}.`,
    { i: 0 },
  );

  for (let i = 1; i < n; i++) {
    const job = jobs[i];
    emit(
      'CONSIDER',
      `job ${i}`,
      `Consider job ${i} = [${job.start},${job.end}] with profit ${job.profit}. We choose the better of two options: SKIP it (keep dp[${i - 1}]) or TAKE it (its profit plus the best schedule that ends at or before its start ${job.start}).`,
      { i, skip: dp[i - 1] },
    );

    let probed = false;
    const prev = lastNotOverlap(jobs, i, (lo, hi, mid, ok) => {
      probed = true;
      emit(
        'SEARCH',
        `mid=${mid} ${ok ? 'fits' : 'overlaps'}`,
        `Binary search for the latest job ending ≤ ${job.start}. Probe mid=${mid}: job ${mid} ends at ${jobs[mid].end}. ${ok ? `${jobs[mid].end} ≤ ${job.start}, so job ${mid} is compatible — record it and look further right for an even later one.` : `${jobs[mid].end} > ${job.start}, so it overlaps — search left.`}`,
        { i, lo, hi, mid, skip: dp[i - 1] },
        ok ? 'good' : 'bad',
      );
    });

    if (!probed) {
      emit(
        'SEARCH',
        'none earlier',
        `No earlier jobs to search (job ${i} is too early to follow anything), so there is no compatible predecessor.`,
        { i, skip: dp[i - 1] },
      );
    }

    let take = job.profit;
    if (prev !== NONE) {
      take += dp[prev]!;
      emit(
        'TAKE',
        `take=${take}`,
        `Latest non-overlapping job is ${prev} (ends ${jobs[prev].end} ≤ ${job.start}). Taking job ${i} yields its profit ${job.profit} + dp[${prev}] (=${dp[prev]}) = ${take}.`,
        { i, prev, take, skip: dp[i - 1] },
      );
    } else {
      emit(
        'TAKE',
        `take=${take}`,
        `No earlier job is compatible with job ${i}, so taking it gives just its own profit = ${take}.`,
        { i, prev: NONE, take, skip: dp[i - 1] },
      );
    }

    const skip = dp[i - 1]!;
    const chosen = skip > take ? skip : take;
    dp[i] = chosen;
    const tookIt = chosen === take && take >= skip;
    emit(
      'DECIDE',
      `dp[${i}]=${chosen}`,
      `Compare SKIP=${skip} vs TAKE=${take}. dp[${i}] = max(${skip}, ${take}) = ${chosen} — ${tookIt ? `we take job ${i}.` : `we skip job ${i} and keep the earlier best.`}`,
      { i, prev: prev !== NONE ? prev : NONE, take, skip },
      tookIt ? 'good' : undefined,
    );
  }

  const answer = dp[n - 1]!;
  emit(
    'DONE',
    `${answer}`,
    `The table is complete. dp[${n - 1}] = ${answer} is the maximum total profit from any set of non-overlapping jobs.`,
    { i: n - 1, done: true },
    'good',
  );
  return frames;
}

function jobLabel(job: Job): string {
  return `[${job.start},${job.end}]`;
}

function View({ frame }: PluginViewProps<SchedulerState>) {
  const s = frame.state;
  const jobValues = s.jobs.map(jobLabel);
  const dpValues = s.dp.map((v) => (v === null ? '·' : v));

  const jobPointers: ArrayPointer[] = [];
  if (s.i !== null) jobPointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.prev !== null && s.prev !== NONE) jobPointers.push({ i: s.prev, label: 'prev', tone: 'good', place: 'below' });
  if (s.lo !== null && s.lo >= 0) jobPointers.push({ i: s.lo, label: 'lo', tone: 'warn', place: 'below' });
  if (s.hi !== null && s.hi >= 0) jobPointers.push({ i: s.hi, label: 'hi', tone: 'warn', place: 'below' });

  const jobTone = (i: number) => {
    if (s.done && i === s.i) return 'found';
    if (s.mid === i) return 'mid';
    if (s.prev !== null && s.prev !== NONE && i === s.prev) return 'match';
    if (s.i === i) return 'match';
    return '';
  };

  const dpPointers: ArrayPointer[] = [];
  if (s.i !== null) dpPointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const dpTone = (i: number) => {
    if (s.dp[i] === null) return '';
    if (s.i === i && s.done) return 'found';
    if (s.i === i) return 'match';
    return '';
  };

  const last = s.dp.length > 0 ? s.dp[s.dp.length - 1] : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        jobs sorted by end · answer ={' '}
        <span className="font-mono text-ink">{s.done && last !== null ? last : '…'}</span>
      </div>
      <ArrayRow values={jobValues} cellTone={jobTone} pointers={jobPointers} windowRange={null} />
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>dp[i] = best profit using jobs 0…i</div>
      <ArrayRow values={dpValues} cellTone={dpTone} pointers={dpPointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.skip !== null && (
          <>
            skip <span className="text-ink">{s.skip}</span>
          </>
        )}
        {s.take !== null && (
          <>
            {s.skip !== null ? ' · ' : ''}take <span className="text-ink">{s.take}</span>
          </>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SchedulerState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const job = s.i !== null ? s.jobs[s.i] : null;
  const last = s.dp.length > 0 ? s.dp[s.dp.length - 1] : null;
  return (
    <VarGrid>
      <InspectorRow k="i (job)" v={s.i ?? '—'} />
      <InspectorRow k="job i" v={job ? `[${job.start},${job.end}] p=${job.profit}` : '—'} />
      <InspectorRow k="prev (non-overlap)" v={s.prev === null || s.prev === NONE ? 'none' : s.prev} />
      <InspectorRow k="search lo..hi" v={s.lo !== null && s.hi !== null ? `${s.lo}..${s.hi}` : '—'} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="skip = dp[i−1]" v={s.skip ?? '—'} />
      <InspectorRow k="take = p + dp[prev]" v={s.take ?? '—'} />
      <InspectorRow k="dp[i]" v={s.i !== null && s.dp[s.i] !== null ? s.dp[s.i] : '…'} />
      <InspectorRow k="answer" v={s.done && last !== null ? last : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-weighted-job-scheduler';
export const title = 'Weighted job scheduler';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'wjs1',
      label: '4 jobs',
      value: {
        jobs: [
          { start: 1, end: 3, profit: 50 },
          { start: 3, end: 5, profit: 20 },
          { start: 6, end: 19, profit: 100 },
          { start: 2, end: 100, profit: 200 },
        ],
      },
    },
    {
      id: 'wjs2',
      label: '5 jobs',
      value: {
        jobs: [
          { start: 1, end: 2, profit: 50 },
          { start: 3, end: 5, profit: 20 },
          { start: 6, end: 9, profit: 100 },
          { start: 1, end: 4, profit: 70 },
          { start: 5, end: 7, profit: 60 },
        ],
      },
    },
  ] satisfies SampleInput<SchedulerInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SchedulerState | undefined;
    if (!s || s.dp.length === 0) return { ok: true, label: 'profit 0' };
    const answer = s.dp[s.dp.length - 1];
    return { ok: true, label: `profit ${answer ?? 0}` };
  },
};
