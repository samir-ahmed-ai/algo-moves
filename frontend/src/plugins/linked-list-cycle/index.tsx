import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
} from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { verdictAlwaysOk } from '../_shared/verdictKit';
import { goodCases, badCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { GraphInspector, GraphStatRow as InspectorRow } from '../_shared/graphInspector';
import { VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

export interface CycleInput {
  values: number[];
  cycleTo: number;
}

export interface CycleState {
  values: number[];
  next: (number | null)[];
  slow: number | null;
  fast: number | null;
  step: number;
  met: boolean;
  done: boolean;
  hasCycle: boolean | null;
}

function record({ values, cycleTo }: CycleInput): Frame<CycleState>[] {
  const frames: Frame<CycleState>[] = [];
  const n = values.length;
  const next: (number | null)[] = values.map((_, i) => (i === n - 1 ? null : i + 1));
  if (n > 0 && cycleTo >= 0 && cycleTo < n) next[n - 1] = cycleTo;

  let slow: number | null = n > 0 ? 0 : null;
  let fast: number | null = n > 0 ? 0 : null;
  let step = 0;
  let met = false;

  const emit = (
    type: string,
    note: string,
    caption: string,
    hasCycle: boolean | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        values,
        next: next.slice(),
        slow,
        fast,
        step,
        met,
        done: hasCycle !== null,
        hasCycle,
      },
    });

  emit(
    'INIT',
    'slow=head fast=head',
    `Start both the tortoise (slow) and the hare (fast) at the head${slow === null ? ' of an empty list' : ` (value ${values[slow]})`}.`,
    null,
  );

  while (true) {
    if (fast === null || next[fast] === null) {
      emit(
        'NOCYCLE',
        'fast reached null',
        'The hare ran off the end of the list, so there is no cycle.',
        false,
        'good',
      );
      break;
    }
    slow = next[slow as number];
    fast = next[next[fast] as number];
    step += 1;
    if (slow === fast) {
      met = true;
      emit(
        'MEET',
        `slow=fast @${slow}`,
        `The hare lapped the tortoise — they met at value ${values[slow as number]}, so the list has a cycle.`,
        true,
        'good',
      );
      break;
    }
    emit(
      'STEP',
      `slow→${slow === null ? 'null' : values[slow]} fast→${fast === null ? 'null' : values[fast]}`,
      `Step ${step}: advance slow by one (value ${values[slow as number]}) and fast by two (value ${values[fast as number]}). They have not met yet.`,
      null,
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<CycleState>) {
  const s = frame.state;
  const n = s.values.length;
  const pad = 50;
  const gap = 90;
  const r = 22;
  const cy = 110;
  const width = pad * 2 + Math.max(0, n - 1) * gap;
  const height = 240;
  const cx = (i: number) => pad + i * gap;

  const tone = (i: number) => {
    if (s.slow === i && s.fast === i) return 'team-1';
    if (s.fast === i) return 'team-2';
    if (s.slow === i) return 'team-1';
    return 'team-0';
  };

  const arrows = s.next.map((target, i) => {
    if (target === null) return null;
    const x1 = cx(i);
    const x2 = cx(target);
    if (target > i) {
      const sx = x1 + r;
      const ex = x2 - r;
      return (
        <line
          key={`e${i}`}
          x1={sx}
          y1={cy}
          x2={ex}
          y2={cy}
          stroke="var(--edge)"
          strokeWidth={2}
          markerEnd="url(#llc-arrow)"
        />
      );
    }
    // back-edge to an earlier index: arc below the row so the loop is visible
    const sx = x1;
    const ex = x2;
    const my = cy + 80;
    const mx = (sx + ex) / 2;
    return (
      <path
        key={`e${i}`}
        d={`M ${sx} ${cy + r} Q ${mx} ${my} ${ex} ${cy + r}`}
        fill="none"
        stroke="var(--edge)"
        strokeWidth={2}
        markerEnd="url(#llc-arrow)"
      />
    );
  });

  const ptrLabel = (i: number) => {
    const both = s.slow === i && s.fast === i;
    const isSlow = s.slow === i;
    const isFast = s.fast === i;
    if (!both && !isSlow && !isFast) return null;
    const label = both ? 'S/F' : isSlow ? 'S' : 'F';
    return (
      <text
        key={`p${i}`}
        x={cx(i)}
        y={cy - r - 12}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill="var(--text)"
      >
        {label}
      </text>
    );
  };

  const show = (p: number | null) => (p === null ? 'null' : `${s.values[p]}@${p}`);
  const result = s.hasCycle === null ? null : s.hasCycle ? 'cycle' : 'no cycle';

  return (
    <VizStage
      rail={
        <>
          <RailGroup label="pointers">
            <RailStat k="step" v={s.step} />
            <RailStat k="slow" v={show(s.slow)} tone={s.met ? 'accent' : undefined} />
            <RailStat k="fast" v={show(s.fast)} tone={s.met ? 'accent' : undefined} />
          </RailGroup>
          {result !== null && (
            <RailResult label="result" value={result} tone={s.hasCycle ? 'bad' : 'good'} />
          )}
        </>
      }
    >
      <svg
        role="img"
        aria-label="linked list with cycle"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
      >
        <defs>
          <marker
            id="llc-arrow"
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge)" />
          </marker>
        </defs>
        {arrows}
        {s.values.map((v, i) => (
          <g key={`n${i}`}>
            <circle className={tone(i)} cx={cx(i)} cy={cy} r={r} />
            <text
              className="node-label"
              x={cx(i)}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {v}
            </text>
          </g>
        ))}
        {s.values.map((_, i) => ptrLabel(i))}
      </svg>
    </VizStage>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<CycleState>) {
  return (
    <GraphInspector
      frame={frame}
      selectedNode={selectedNode}
      rows={(s) => {
        const show = (p: number | null) => (p === null ? 'null' : `${s.values[p]} (@${p})`);
        const result = s.hasCycle === null ? 'searching' : s.hasCycle ? 'cycle' : 'no cycle';
        return (
          <>
            <InspectorRow k="step" v={s.step} />
            <InspectorRow k="slow" v={show(s.slow)} />
            <InspectorRow k="fast" v={show(s.fast)} />
            <InspectorRow k="result" v={result} />
          </>
        );
      }}
    />
  );
}

const goSolution = `package main
type ListNode struct {
	Val  int
	Next *ListNode
}

func hasCycle(head *ListNode) bool {
	slow, fast := head, head
	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
		if slow == fast {
			return true
		}
	}
	return false
}
`;

const inputs = [
  { id: 'cycle', label: '3 2 0 4 ↺1', value: { values: [3, 2, 0, 4], cycleTo: 1 } },
  { id: 'plain', label: '1 2 3 4 5', value: { values: [1, 2, 3, 4, 5], cycleTo: -1 } },
];
const verdict = verdictAlwaysOk('cycle');
const teaching = wireTeachingStack({
  record,
  View,
  inputs,
  verdict,
  practice: {
    quiz,
    codePieces,
    cases: { good: goodCases, bad: badCases, intro, goodLabel: 'fast/slow steps' },
    simulateQuestion: 'Which pointer advances next?',
  },
});

export const linkedListCyclePlugin = definePlugin<CycleInput, CycleState>({
  meta: {
    id: 'linked-list-cycle',
    title: 'Linked list cycle',
    difficulty: 'Easy',
    tags: ['linked-list', 'two-pointers'],
    source: 'https://leetcode.com/problems/linked-list-cycle/',
    summary:
      'Run two pointers — a slow tortoise (1 step) and a fast hare (2 steps). If the hare falls off the end there is no cycle; if it ever catches the tortoise, the list loops.',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const last = frames[frames.length - 1];
    return { ok: true, label: last && last.state.hasCycle ? 'cycle' : 'no cycle' };
  },
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 'values', label: 'List values', type: 'numberArray', min: 0, max: 99 }],
});
