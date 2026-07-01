import { definePlugin, type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../core/types';
import { STRUDEL_NODE_W } from '../../design/tokens';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { cn } from '../../lib/cn';
import { GraphInspector, GraphStatRow as InspectorRow } from '../_shared/graphInspector';
import { vizText } from '../_shared/vizKit';

export interface SchedInput {
  intervals: [number, number][];
}

type Status = 'pending' | 'accepted' | 'rejected' | 'current';

export interface SchedState {
  sorted: [number, number][];
  status: Status[];
  cur: number | null;
  lastEnd: number;
  acceptedCount: number;
  tMin: number;
  tMax: number;
}

function record({ intervals }: SchedInput): Frame<SchedState>[] {
  const frames: Frame<SchedState>[] = [];
  const sorted = intervals.slice().sort((a, b) => a[1] - b[1]);
  const status: Status[] = new Array(sorted.length).fill('pending');
  const tMin = Math.min(...sorted.map((iv) => iv[0]));
  const tMax = Math.max(...sorted.map((iv) => iv[1]));
  let lastEnd = tMin;
  let acceptedCount = 0;
  let cur: number | null = null;

  const emit = (type: string, note: string, caption: string, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        sorted: sorted.map((iv) => [iv[0], iv[1]] as [number, number]),
        status: status.slice(),
        cur,
        lastEnd,
        acceptedCount,
        tMin,
        tMax,
      },
    });

  emit(
    'INIT',
    `n=${sorted.length}`,
    `Greedy activity selection: sort all ${sorted.length} intervals by END time ascending, then sweep left to right keeping any interval that starts after the last one we kept.`,
  );

  for (let i = 0; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    cur = i;
    status[i] = 'current';
    emit(
      'CONSIDER',
      `[${start},${end}]`,
      `Consider interval [${start},${end}] — the next one by end time. The last accepted interval ended at ${lastEnd}.`,
    );
    if (start >= lastEnd) {
      const prevEnd = lastEnd;
      status[i] = 'accepted';
      lastEnd = end;
      acceptedCount += 1;
      cur = null;
      emit(
        'ACCEPT',
        `take → ${acceptedCount}`,
        `${start} >= ${prevEnd}: it starts at or after the last accepted end, so accept it. lastEnd advances to ${end}; ${acceptedCount} chosen so far.`,
        'good',
      );
    } else {
      status[i] = 'rejected';
      cur = null;
      emit(
        'REJECT',
        `skip [${start},${end}]`,
        `${start} < ${lastEnd}: it overlaps the last accepted interval, so reject it and move on.`,
      );
    }
  }

  emit('DONE', `${acceptedCount} chosen`, `Sweep complete: ${acceptedCount} non-overlapping intervals selected — the maximum possible.`, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SchedState>) {
  const s = frame.state;
  const span = s.tMax - s.tMin || 1;
  const rowHeight = 26;
  const rowGap = 6;
  const offset = rowHeight + rowGap;
  const height = s.sorted.length * offset + 8;
  const pct = (v: number) => ((v - s.tMin) / span) * 100;

  const palette: Record<Status, { bg: string; fg: string }> = {
    accepted: { bg: 'var(--good-bg)', fg: 'var(--good)' },
    rejected: { bg: 'var(--bad-bg)', fg: 'var(--bad)' },
    current: { bg: 'var(--accent-bg)', fg: 'var(--accent)' },
    pending: { bg: 'var(--surface-2)', fg: 'var(--text-3)' },
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        timeline · <span className="font-mono text-ink">{s.tMin}</span> →{' '}
        <span className="font-mono text-ink">{s.tMax}</span> · sorted by end time
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          minWidth: STRUDEL_NODE_W,
          height: `${height}px`,
          border: '1px solid var(--border, var(--surface-2))',
          borderRadius: '8px',
          padding: '4px',
          background: 'var(--surface, transparent)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pct(s.lastEnd)}%`,
            width: '2px',
            background: 'var(--accent)',
            opacity: 0.8,
            zIndex: 2,
          }}
          title={`lastEnd = ${s.lastEnd}`}
        />
        {s.sorted.map((iv, i) => {
          const [start, end] = iv;
          const c = palette[s.status[i]];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${pct(start)}%`,
                width: `${((end - start) / span) * 100}%`,
                top: `${i * offset + 4}px`,
                height: `${rowHeight}px`,
                background: c.bg,
                color: c.fg,
                border: `1px solid ${c.fg}`,
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--fs-tight)',
                fontFamily: 'var(--font-mono, monospace)',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                zIndex: 1,
              }}
            >
              [{start},{end}]
            </div>
          );
        })}
      </div>
      <div className={cn(vizText.xs, 'text-ink3')} style={{ marginTop: '2px' }}>
        vertical line = lastEnd ({s.lastEnd})
      </div>
    </div>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<SchedState>) {
  return (
    <GraphInspector
      frame={frame}
      selectedNode={selectedNode}
      rows={(s) => {
        const curIv = s.cur !== null ? `[${s.sorted[s.cur][0]},${s.sorted[s.cur][1]}]` : '—';
        return (
          <>
            <InspectorRow k="lastEnd" v={s.lastEnd} />
            <InspectorRow k="accepted count" v={s.acceptedCount} />
            <InspectorRow k="current interval" v={curIv} />
            <InspectorRow k="total intervals" v={s.sorted.length} />
          </>
        );
      }}
    />
  );
}

const goSolution = `package main
import "sort"

func maxNonOverlapping(intervals [][2]int) [][2]int {
	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][1] < intervals[j][1]
	})

	chosen := make([][2]int, 0, len(intervals))
	lastEnd := 0
	if len(intervals) > 0 {
		lastEnd = intervals[0][0]
	}

	for _, iv := range intervals {
		if iv[0] >= lastEnd {
			chosen = append(chosen, iv)
			lastEnd = iv[1]
		}
	}
	return chosen
}
`;


const inputs: SampleInput<SchedInput>[] = [
    { id: 'classic', label: 'classic · 6 intervals', value: { intervals: [[1, 4], [3, 5], [0, 6], [5, 7], [3, 8], [8, 9]] as [number, number][] } },
    { id: 'dense', label: 'dense overlaps · 5', value: { intervals: [[0, 3], [1, 2], [2, 5], [4, 6], [3, 9]] as [number, number][] } },
    { id: 'staircase', label: 'staircase · 6', value: { intervals: [[0, 2], [1, 4], [2, 6], [5, 7], [6, 10], [9, 12]] as [number, number][] } },
  ];
const verdict = (frames: Frame<SchedState>[]) => {
  const last = frames[frames.length - 1];
  const acceptedCount = last ? last.state.acceptedCount : 0;
  return { ok: true, label: `${acceptedCount} chosen` };
};
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, bad: badCases, intro, goodLabel: 'greedy picks', badLabel: 'greedy traps' }, simulateQuestion: 'Which interval is picked next?' },
});

export const intervalSchedulingPlugin = definePlugin<SchedInput, SchedState>({
  meta: {
    id: 'interval-scheduling',
    title: 'Interval scheduling (activity selection)',
    difficulty: 'Medium',
    tags: ['greedy', 'sorting', 'intervals'],
    summary: 'Sort intervals by end time, then greedily keep any interval that starts after the last one chosen to maximize the non-overlapping count.',
    source: 'https://leetcode.com/problems/non-overlapping-intervals/',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
});
