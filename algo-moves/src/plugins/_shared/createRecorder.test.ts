import { describe, expect, it } from 'vitest';
import { createRecorder } from './createRecorder';

interface CounterState {
  n: number;
  sum: number;
  done: boolean;
}

describe('createRecorder', () => {
  it('merges partial state into each frame', () => {
    const { emit, frames } = createRecorder<CounterState>(() => ({
      n: 0,
      sum: 0,
      done: false,
    }));

    emit('INIT', 'start', 'start', {});
    emit('ADD', '+1', 'add one', { n: 1, sum: 1 });
    emit('DONE', 'end', 'finished', { done: true }, 'good');

    expect(frames).toHaveLength(3);
    expect(frames[0].state).toEqual({ n: 0, sum: 0, done: false });
    expect(frames[1].state).toEqual({ n: 1, sum: 1, done: false });
    expect(frames[2].move.tone).toBe('good');
    expect(frames[2].state.done).toBe(true);
  });

  it('supports custom merge for derived fields', () => {
    const { emit, frames, setState } = createRecorder<{ items: number[]; total: number }>(
      () => ({ items: [], total: 0 }),
      {
        merge: (base, partial) => {
          const items = partial.items ?? base.items;
          return { items, total: items.reduce((a, b) => a + b, 0) };
        },
      },
    );

    setState({ items: [1, 2], total: 3 });
    emit('PUSH', '+3', 'push 3', { items: [1, 2, 3] });
    expect(frames[0].state.total).toBe(6);
  });
});
