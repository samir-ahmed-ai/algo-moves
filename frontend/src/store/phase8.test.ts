import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyncStore } from '@/store/createSyncStore';
import { loadCanvasPrefs, saveCanvasPrefs } from '@/store/canvas-layout/canvasPrefs';
import { loadLayouts, saveLayouts } from '@/store/canvas-layout/layoutStore';
import { toggleEdgeCase, getEdgeCases } from '@/store/practice/edgeCases';
import { readRushBestSeconds, maybeWriteRushBest } from '@/store/practice/assembleBest';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    getItem: (k: string) => store.get(k) ?? null,
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  } as Storage;
}

describe('Phase 8 store slices', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('canvasPrefs round-trips via createSyncStore', () => {
    saveCanvasPrefs({
      edgeOpts: { pathType: 'smoothstep', animated: true, strokeWidth: 2, arrow: true },
      bg: 'lines',
    });
    expect(loadCanvasPrefs().bg).toBe('lines');
  });

  it('layoutStore round-trips viewport and node chrome', () => {
    saveLayouts({
      'stub:visualize': {
        nodes: { notes: { position: { x: 1, y: 2 }, collapsed: true } },
        removed: [],
        viewport: { x: 10, y: 20, zoom: 0.8 },
      },
    });
    const stored = loadLayouts()['stub:visualize'];
    expect(stored?.viewport).toEqual({ x: 10, y: 20, zoom: 0.8 });
    expect(stored?.nodes.notes?.collapsed).toBe(true);
  });

  it('edgeCases toggles per item', () => {
    expect(getEdgeCases('two-sum')['Empty input (length 0)']).toBeUndefined();
    toggleEdgeCase('two-sum', 'Empty input (length 0)');
    expect(getEdgeCases('two-sum')['Empty input (length 0)']).toBe(true);
  });

  it('assembleBest migrates legacy rush keys', () => {
    localStorage.setItem('algo-moves:rush-best:two-sum:0', '12.5');
    expect(readRushBestSeconds('two-sum', 0)).toBe(12.5);
    expect(maybeWriteRushBest('two-sum', 0, 10)).toBe(true);
    expect(readRushBestSeconds('two-sum', 0)).toBe(10);
  });
});
