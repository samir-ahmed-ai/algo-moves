import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSyncStore } from '@/store/createSyncStore';
import { createServerSync } from './syncEngine';
import { setSyncActive } from './syncSession';

interface Box {
  n: number;
}

function setup(remote: Box | null) {
  const pushes: Box[] = [];
  let pulls = 0;
  const engine = createServerSync<Box>({
    key: 'algo-moves:test-sync',
    empty: { n: 0 },
    pull: async () => {
      pulls++;
      return remote;
    },
    push: async (v) => {
      pushes.push({ ...v });
      return null;
    },
    merge: (l, r) => ({ n: Math.max(l.n, r.n) }),
    debounceMs: 5,
  });
  const store = createSyncStore<Box>('algo-moves:test-sync', () => ({ n: 0 }), engine.save);
  engine.attach(store);
  return { engine, store, pushes, pulls: () => pulls };
}

beforeEach(() => {
  localStorage.clear();
  setSyncActive(false);
});
afterEach(() => {
  setSyncActive(false);
});

describe('createServerSync', () => {
  it('writes localStorage but does not push while sync is inactive', () => {
    const { store, pushes } = setup(null);
    store.set({ n: 7 });
    expect(pushes).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('algo-moves:test-sync') ?? '{}').n).toBe(7);
  });

  it('flush drains a pending push when active', () => {
    const { engine, store, pushes } = setup(null);
    setSyncActive(true);
    store.set({ n: 3 });
    engine.flush();
    expect(pushes).toEqual([{ n: 3 }]);
  });

  it('hydrate merges remote into local and pushes exactly once (no loop)', async () => {
    const { engine, store, pushes } = setup({ n: 5 });
    store.set({ n: 2 }); // local edit while inactive → no push
    expect(pushes).toHaveLength(0);
    setSyncActive(true);
    await engine.hydrate();
    expect(store.get().n).toBe(5); // max(2,5)
    expect(pushes).toHaveLength(1); // only the explicit converge push; applyRemote did NOT re-push
  });

  it('hydrate is a no-op when the backend is unavailable (pull → null)', async () => {
    const { engine, store, pushes } = setup(null);
    setSyncActive(true);
    store.set({ n: 9 });
    engine.flush(); // clears the active-save push
    pushes.length = 0;
    await engine.hydrate();
    expect(store.get().n).toBe(9); // unchanged
    expect(pushes).toHaveLength(0); // nothing pushed on unavailable pull
  });

  it('hydrateReplace overwrites local with server state and does NOT push (account switch)', async () => {
    const { engine, store, pushes } = setup({ n: 4 });
    store.set({ n: 99 }); // previous account's data lingering in the singleton
    setSyncActive(true);
    await engine.hydrateReplace();
    expect(store.get().n).toBe(4); // replaced, not merged (would be 99)
    expect(pushes).toHaveLength(0); // never pushes the previous account's data
  });

  it('hydrateReplace clears to empty when the backend is unavailable (no data leak)', async () => {
    const { engine, store, pushes } = setup(null);
    store.set({ n: 99 });
    setSyncActive(true);
    await engine.hydrateReplace();
    expect(store.get().n).toBe(0); // cleared to empty rather than keeping prior data
    expect(pushes).toHaveLength(0);
  });

  it('reset clears the store to empty and does not push (sign-out)', () => {
    const { engine, store, pushes } = setup(null);
    setSyncActive(true);
    store.set({ n: 42 });
    pushes.length = 0;
    engine.reset();
    expect(store.get().n).toBe(0);
    expect(pushes).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('algo-moves:test-sync') ?? '{}').n).toBe(0);
  });
});
