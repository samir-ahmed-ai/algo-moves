import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/board/GraphBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, RailGroup, RailResult, RailStack, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface WLInput {
  beginWord: string;
  endWord: string;
  wordList: string[];
}

interface WLState {
  adj: number[][];
  pos: [number, number][];
  labels: string[];
  color: number[]; // 0 unvisited, 2 queued, 1 visited
  active: number | null;
  queue: number[];
  dist: number[]; // ladder length recorded when a word is enqueued (begin = 1)
  answer: number;
  done: boolean;
}

/** True when the two equal-length words differ at exactly one position. */
function oneOff(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
}

function record({ beginWord, endWord, wordList }: WLInput): Frame<WLState>[] {
  const labels = [beginWord, ...wordList];
  const n = labels.length;
  const pos = circleLayout(n);

  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (oneOff(labels[i], labels[j])) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  const target = labels.indexOf(endWord);
  const color = new Array<number>(n).fill(0);
  const dist = new Array<number>(n).fill(0);
  const queue: number[] = [];
  let answer = 0;

  const { emit, frames } = createRecorder<WLState>(() => ({
    adj,
    pos,
    labels,
    color: color.slice(),
    active: null,
    queue: queue.slice(),
    dist: dist.slice(),
    answer,
    done: false,
  }));

  emit(
    'INIT',
    'build graph',
    `Place every word on the board: "${beginWord}" plus the word list. Draw an edge between any two words that differ at exactly one letter — those are single-step transformations. Then BFS from "${beginWord}", where each level is one more word in the ladder.`,
    { active: null },
  );

  color[0] = 2;
  dist[0] = 1;
  queue.push(0);
  emit('SEED', `queue ["${beginWord}"]`, `Seed the queue with "${beginWord}" at ladder length 1 and mark it queued.`, { active: 0 });

  let resolved = false;
  while (queue.length > 0 && !resolved) {
    const v = queue.shift() as number;
    color[v] = 1;
    emit('VISIT', `visit "${labels[v]}"`, `Dequeue "${labels[v]}" (ladder length ${dist[v]}) and mark it visited.`, { active: v });

    if (v === target) {
      answer = dist[v];
      emit('FOUND', `reached "${endWord}"`, `"${labels[v]}" is the end word — the shortest ladder reaches it in ${answer} words.`, { active: v, answer }, 'good');
      resolved = true;
      break;
    }

    for (const nb of adj[v]) {
      if (color[nb] === 0) {
        color[nb] = 2;
        dist[nb] = dist[v] + 1;
        queue.push(nb);
        emit(
          'ENQUEUE',
          `enqueue "${labels[nb]}"`,
          `"${labels[nb]}" differs from "${labels[v]}" by one letter and is unvisited — enqueue it at ladder length ${dist[nb]}.`,
          { active: v },
        );
      }
    }
  }

  if (resolved) {
    emit('DONE', `ladder ${answer}`, `Shortest transformation ladder from "${beginWord}" to "${endWord}" has ${answer} words.`, { active: target, answer, done: true }, 'good');
  } else {
    answer = 0;
    emit('DONE', 'no ladder', `Queue drained without reaching "${endWord}" — no transformation ladder exists, so the answer is 0.`, { active: null, answer, done: true }, 'good');
  }
  return frames;
}

function View({ frame }: PluginViewProps<WLState>) {
  const s = frame.state;
  const ladderLen = s.active !== null && s.dist[s.active] ? s.dist[s.active] : s.answer || 0;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="word" v={s.active !== null ? s.labels[s.active] : '—'} tone="accent" />
        <RailStat k="len" v={ladderLen || '—'} />
      </RailGroup>
      <RailStack
        label="queue"
        items={s.queue.map((n) => s.labels[n])}
        topLabel="front"
        highlightEnd="bottom"
      />
      {s.done && <RailResult label="answer" value={s.answer || 0} tone={s.answer > 0 ? 'good' : 'bad'} />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={96}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        label={(n) => s.labels[n]}
        activeNode={s.active}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<WLState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active !== null ? s.labels[s.active] : '—'} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.map((n) => s.labels[n]).join(', ')}]` : '∅'} />
      <InspectorRow k="ladder length" v={s.answer || (s.active !== null ? s.dist[s.active] : 0)} />
    </VarGrid>
  );
}

const HIT_COG: WLInput = {
  beginWord: 'hit',
  endWord: 'cog',
  wordList: ['hot', 'dot', 'dog', 'lot', 'log', 'cog'],
};

export const manifestId = 'imp-10-word-ladder';
export const title = 'Word Ladder';

export const simulator: ProblemSimulator = {
  inputs: [{ id: 'hit-cog', label: 'hit → cog', value: HIT_COG }] satisfies SampleInput<WLInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WLState | undefined;
    return { ok: true, label: `ladder ${s ? s.answer : 0}` };
  },
};
