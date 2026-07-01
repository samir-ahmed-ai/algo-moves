import { definePlugin, type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, intro } from './cases';
import { quiz, codePieces } from './practice';
import { GraphInspector, GraphStatRow as InspectorRow } from '../_shared/graphInspector';
import { VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

export interface ListInput {
  values: number[];
}

export interface ListState {
  values: number[];
  next: (number | null)[];
  prev: number | null;
  curr: number | null;
  nextPtr: number | null;
  head: number | null;
  done: boolean;
}

function record({ values }: ListInput): Frame<ListState>[] {
  const frames: Frame<ListState>[] = [];
  const next: (number | null)[] = values.map((_, i) => (i === values.length - 1 ? null : i + 1));
  let prev: number | null = null;
  let curr: number | null = values.length > 0 ? 0 : null;
  let nextPtr: number | null = null;
  let head: number | null = curr;

  const emit = (type: string, note: string, caption: string, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { values, next: next.slice(), prev, curr, nextPtr, head, done: tone != null },
    });

  emit(
    'INIT',
    'prev=null curr=head',
    `Start with prev = null and curr at the head (${curr === null ? 'empty list' : `value ${values[curr]}`}). Every node still points to its right neighbour.`,
  );

  while (curr !== null) {
    nextPtr = next[curr];
    emit(
      'SAVE',
      `next=${nextPtr === null ? 'null' : values[nextPtr]}`,
      `Save next = curr.next (${nextPtr === null ? 'null — end of list' : `value ${values[nextPtr]}`}) so we don't lose the rest of the list when we rewire.`,
    );

    next[curr] = prev;
    emit(
      'REWIRE',
      `${values[curr]} → ${prev === null ? 'null' : values[prev]}`,
      `Rewire curr.next to point back at prev. Node ${values[curr]} now points ${prev === null ? 'to null' : `to ${values[prev]}`} — its arrow flips backward.`,
    );

    prev = curr;
    curr = nextPtr;
    head = prev;
    emit(
      'ADVANCE',
      `prev=${values[prev]} curr=${curr === null ? 'null' : values[curr]}`,
      `Advance: prev = curr (${values[prev]}), curr = next (${curr === null ? 'null' : `value ${values[curr]}`}). The reversed prefix grows by one node.`,
    );
  }

  head = prev;
  emit(
    'DONE',
    `head=${head === null ? 'null' : values[head]}`,
    `curr is null, so the list is fully reversed. prev (${head === null ? 'null' : `value ${values[head]}`}) is the new head.`,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ListState>) {
  const s = frame.state;
  const n = s.values.length;
  const pad = 50;
  const gap = 90;
  const r = 22;
  const cy = 60;
  const width = pad * 2 + Math.max(0, n - 1) * gap;
  const height = 100;
  const cx = (i: number) => pad + i * gap;

  const tone = (i: number) => {
    if (s.curr === i) return 'team-1';
    // reversed chain: nodes at or before prev in original left-to-right order
    if (s.prev !== null && i <= s.prev) return 'team-2';
    return 'team-0';
  };

  const arrows = s.next.map((target, i) => {
    if (target === null) return null;
    const x1 = cx(i);
    const x2 = cx(target);
    if (target > i) {
      const sx = x1 + r;
      const ex = x2 - r;
      return <line key={`e${i}`} x1={sx} y1={cy} x2={ex} y2={cy} stroke="var(--edge)" strokeWidth={2} markerEnd="url(#rll-arrow)" />;
    }
    // backward pointer: arc above the row so it stays readable
    const sx = x1 - r;
    const ex = x2 + r;
    const my = cy - 40;
    const mx = (sx + ex) / 2;
    return (
      <path
        key={`e${i}`}
        d={`M ${sx} ${cy} Q ${mx} ${my} ${ex} ${cy}`}
        fill="none"
        stroke="var(--edge)"
        strokeWidth={2}
        markerEnd="url(#rll-arrow)"
      />
    );
  });

  const show = (p: number | null) => (p === null ? 'null' : String(s.values[p]));

  const rail = (
    <>
      <RailGroup label="pointers">
        <RailStat k="prev" v={show(s.prev)} tone={s.prev !== null ? 'accent' : undefined} />
        <RailStat k="curr" v={show(s.curr)} tone={s.curr !== null ? 'accent' : undefined} />
        <RailStat k="next" v={show(s.nextPtr)} />
      </RailGroup>
      {s.done && (
        <RailResult label="head" value={show(s.head)} tone="good" />
      )}
    </>
  );

  return (
    <VizStage rail={rail}>
      <svg role="img" aria-label="linked list" viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <defs>
          <marker id="rll-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge)" />
          </marker>
        </defs>
        {arrows}
        {s.values.map((v, i) => (
          <g key={`n${i}`}>
            <circle className={tone(i)} cx={cx(i)} cy={cy} r={r} />
            <text className="node-label" x={cx(i)} y={cy} textAnchor="middle" dominantBaseline="central">
              {v}
            </text>
          </g>
        ))}
      </svg>
    </VizStage>
  );
}

function order(s: ListState): string {
  const seq: number[] = [];
  let node = s.head;
  const seen = new Set<number>();
  while (node !== null && !seen.has(node)) {
    seen.add(node);
    seq.push(s.values[node]);
    node = s.next[node];
  }
  return seq.length ? seq.join(' → ') : 'empty';
}

function Inspector({ frame, selectedNode }: InspectorProps<ListState>) {
  return (
    <GraphInspector
      frame={frame}
      selectedNode={selectedNode}
      rows={(s) => {
        const show = (p: number | null) => (p === null ? 'null' : `${s.values[p]} (@${p})`);
        return (
          <>
            <InspectorRow k="prev" v={show(s.prev)} />
            <InspectorRow k="curr" v={show(s.curr)} />
            <InspectorRow k="next" v={show(s.nextPtr)} />
            <InspectorRow k="head" v={show(s.head)} />
            <InspectorRow k="order" v={order(s)} />
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

func reverseList(head *ListNode) *ListNode {
	var prev *ListNode
	curr := head
	for curr != nil {
		next := curr.Next
		curr.Next = prev
		prev = curr
		curr = next
	}
	return prev
}
`;


const inputs = [
    { id: 'five', label: '1 2 3 4 5', value: { values: [1, 2, 3, 4, 5] } },
    { id: 'four', label: '7 1 9 4', value: { values: [7, 1, 9, 4] } },
  ];
const verdict = () => ({ ok: true, label: 'reversed' });
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: { quiz, codePieces, cases: { good: goodCases, intro, goodLabel: 'pointer moves' }, simulateQuestion: 'Which pointer moves next?' },
});

export const reverseLinkedListPlugin = definePlugin<ListInput, ListState>({
  meta: {
    id: 'reverse-linked-list',
    title: 'Reverse linked list',
    difficulty: 'Easy',
    tags: ['linked-list'],
    source: 'https://leetcode.com/problems/reverse-linked-list/',
    summary: 'Walk the list once, flipping each node’s next pointer to its predecessor; the old tail becomes the new head.',
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
  editable: [{ key: 'values', label: 'List values', type: 'numberArray', min: 0, max: 99 }],
});
