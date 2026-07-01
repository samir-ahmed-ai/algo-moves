import type { Frame, Tone } from '../../core/types';
import { createRecorder } from './createRecorder';

export interface GraphRecordState {
  adj: number[][];
  pos: { x: number; y: number }[];
  n: number;
  start: number;
  queue: number[];
  visited: boolean[];
  active: number | null;
  edge: [number, number] | null;
  dist: number[];
  done: boolean;
  result: unknown;
}

export function createGraphRecorder(
  adj: number[][],
  pos: { x: number; y: number }[],
  start: number,
  overrides?: Partial<GraphRecordState>,
) {
  const n = adj.length;
  return createRecorder<GraphRecordState>(() => ({
    adj,
    pos,
    n,
    start,
    queue: [],
    visited: new Array(n).fill(false),
    active: null,
    edge: null,
    dist: new Array(n).fill(-1),
    done: false,
    result: null,
    ...overrides,
  }));
}

export type GraphEmit = (
  type: string,
  note: string,
  caption: string,
  partial?: Partial<GraphRecordState>,
  tone?: Tone,
) => void;

/** Standard BFS over an adjacency list — callers customize termination via `onDequeue`. */
export function recordGraphBfs(
  adj: number[][],
  pos: { x: number; y: number }[],
  start: number,
  options: {
    initCaption: string;
    onDequeue?: (u: number, emit: GraphEmit, ctx: { visited: boolean[]; dist: number[]; queue: number[] }) => boolean;
    onFinish?: (emit: GraphEmit, ctx: { visited: boolean[]; dist: number[] }) => void;
  },
): Frame<GraphRecordState>[] {
  const n = adj.length;
  const visited = new Array(n).fill(false);
  const dist = new Array(n).fill(-1);
  const queue: number[] = [start];
  visited[start] = true;
  dist[start] = 0;

  const { emit, frames } = createGraphRecorder(adj, pos, start, { queue: [...queue], visited: [...visited], dist: [...dist] });
  emit('INIT', `start=${start}`, options.initCaption, { queue: [...queue], visited: [...visited], dist: [...dist] });

  while (queue.length > 0) {
    const u = queue.shift()!;
    emit('DEQUEUE', `u=${u}`, `Dequeue node ${u} (distance ${dist[u]}).`, { active: u, queue: [...queue], visited: [...visited], dist: [...dist] });
    if (options.onDequeue?.(u, emit, { visited, dist, queue })) break;
    for (const v of adj[u] ?? []) {
      if (visited[v]) {
        emit('SKIP', `${u}→${v}`, `Neighbor ${v} already visited — skip.`, { active: u, edge: [u, v], queue: [...queue], visited: [...visited], dist: [...dist] });
        continue;
      }
      visited[v] = true;
      dist[v] = dist[u] + 1;
      queue.push(v);
      emit('ENQUEUE', `${u}→${v}`, `Visit ${v} via ${u}, set dist[${v}]=${dist[v]}, enqueue.`, {
        active: v,
        edge: [u, v],
        queue: [...queue],
        visited: [...visited],
        dist: [...dist],
      });
    }
  }

  options.onFinish?.(emit, { visited, dist });
  return frames;
}
