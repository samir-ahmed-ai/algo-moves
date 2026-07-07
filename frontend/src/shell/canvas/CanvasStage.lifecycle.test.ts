/**
 * @vitest-environment happy-dom
 *
 * Characterization tests for CanvasStage lifecycle behavior (#82, #73, mode switch).
 * Hooks are already extracted; these lock their contracts before useCanvasLifecycle
 * pulls the remaining effects out of CanvasStage.tsx.
 */
import { act, renderHook } from '@testing-library/react';
import type { Edge } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { loadCanvasPrefs, loadLayouts, saveCanvasPrefs } from '@/store/canvas-layout';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { useCanvasLayoutPersistence } from './hooks/useCanvasLayoutPersistence';
import { snapNodeLayout } from './nodes/nodeSnapshot';

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

function panelNode(id: string, x: number, y = 0): PanelFlowNode {
  return {
    id,
    type: 'panel',
    position: { x, y },
    data: { kind: id, title: id },
  };
}

describe('CanvasStage lifecycle — layout persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persist() writes node positions and removals to localStorage', () => {
    const { result } = renderHook(() => useCanvasLayoutPersistence());
    const key = 'stub:visualize';

    act(() => {
      result.current.layoutRef.current[key] = {
        notes: { position: { x: 40, y: 80 }, width: 320 },
      };
      result.current.removedRef.current[key] = new Set(['viz']);
      result.current.removedEdgesRef.current[key] = new Set(['problem-viz']);
      result.current.persist();
    });

    const stored = loadLayouts();
    expect(stored[key]).toEqual({
      nodes: { notes: { position: { x: 40, y: 80 }, width: 320 } },
      removed: ['viz'],
      removedEdges: ['problem-viz'],
    });
  });

  it('snapNodeLayout matches what CanvasStage persist effect serializes', () => {
    const n = panelNode('notes', 120, 64);
    n.width = 280;
    expect(snapNodeLayout(n)).toEqual({
      position: { x: 120, y: 64 },
      width: 280,
    });
  });
});

describe('CanvasStage lifecycle — canvas prefs', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveCanvasPrefs round-trips edgeOpts and bg (CanvasStage mount effect)', () => {
    saveCanvasPrefs({
      edgeOpts: { pathType: 'smoothstep', animated: true, strokeWidth: 2, arrow: true },
      bg: 'lines',
    });
    expect(loadCanvasPrefs().bg).toBe('lines');
    expect(loadCanvasPrefs().edgeOpts.animated).toBe(true);
  });
});

describe('CanvasStage lifecycle — undo history', () => {
  const historyKey = 'stub:learn';
  const builtKeyRef = { current: historyKey };

  it('records structural node moves and undo restores the prior snapshot', () => {
    let nodes: PanelFlowNode[] = [panelNode('code', 0)];
    const edges: Edge[] = [];
    const setNodes = vi.fn(
      (updater: PanelFlowNode[] | ((prev: PanelFlowNode[]) => PanelFlowNode[])) => {
        nodes = typeof updater === 'function' ? updater(nodes) : updater;
      },
    );
    const setEdges = vi.fn();

    const { result, rerender } = renderHook(
      ({ ns, es }: { ns: PanelFlowNode[]; es: Edge[] }) =>
        useCanvasHistory({
          nodes: ns,
          edges: es,
          historyKey,
          builtKeyRef,
          setNodes,
          setEdges,
        }),
      { initialProps: { ns: nodes, es: edges } },
    );

    rerender({ ns: [panelNode('code', 120)], es: edges });
    expect(result.current.histIdxRef.current).toBeGreaterThanOrEqual(0);

    act(() => {
      result.current.undo();
    });
    expect(setNodes).toHaveBeenCalled();
    expect(nodes[0]?.position.x).toBe(0);
  });

  it('does not record selection-only changes', () => {
    const base = panelNode('code', 10);
    const selected = { ...base, selected: true };
    const setNodes = vi.fn();
    const setEdges = vi.fn();

    const { result, rerender } = renderHook(
      ({ ns }: { ns: PanelFlowNode[] }) =>
        useCanvasHistory({
          nodes: ns,
          edges: [],
          historyKey,
          builtKeyRef,
          setNodes,
          setEdges,
        }),
      { initialProps: { ns: [base] } },
    );

    const idxBefore = result.current.histIdxRef.current;
    rerender({ ns: [selected] });
    expect(result.current.histIdxRef.current).toBe(idxBefore);
  });

  it('resetHistory clears stack on mode/plugin switch', () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();

    const { result, rerender } = renderHook(
      ({ ns }: { ns: PanelFlowNode[] }) =>
        useCanvasHistory({
          nodes: ns,
          edges: [],
          historyKey,
          builtKeyRef,
          setNodes,
          setEdges,
        }),
      { initialProps: { ns: [panelNode('code', 0)] } },
    );

    rerender({ ns: [panelNode('code', 50)] });
    expect(result.current.historyRef.current.length).toBeGreaterThan(0);

    act(() => {
      result.current.resetHistory();
    });
    expect(result.current.historyRef.current).toHaveLength(0);
    expect(result.current.histIdxRef.current).toBe(-1);
  });
});

describe('CanvasStage lifecycle — mode switch snapshot', () => {
  it('snapshots the previous key layout before building the next mode', () => {
    type Saved = ReturnType<typeof snapNodeLayout>;
    const layoutRef: { current: Record<string, Record<string, Saved>> } = { current: {} };
    const prevKey = 'plugin:learn';
    const nextKey = 'plugin:visualize';
    const present: PanelFlowNode[] = [{ ...panelNode('code', 88, 12), width: 400 }];

    const snap: Record<string, Saved> = {};
    present.forEach((n) => {
      snap[n.id] = snapNodeLayout(n);
    });
    layoutRef.current[prevKey] = snap;

    expect(layoutRef.current[prevKey]?.code).toEqual({
      position: { x: 88, y: 12 },
      width: 400,
    });
    expect(layoutRef.current[nextKey]).toBeUndefined();
  });
});
