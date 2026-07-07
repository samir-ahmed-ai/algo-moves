import { describe, expect, it, beforeEach } from 'vitest';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { useCanvasHistoryStore } from './canvasHistoryStore';

function panelNode(id: string, x: number): PanelFlowNode {
  return { id, type: 'panel', position: { x, y: 0 }, data: { kind: id, title: id } };
}

describe('useCanvasHistoryStore', () => {
  const key = 'test:visualize';

  beforeEach(() => {
    useCanvasHistoryStore.getState().reset(key);
  });

  it('records, undoes, and redoes structural snapshots', () => {
    const sig0 = 's0';
    const sig1 = 's1';
    const store = useCanvasHistoryStore.getState();
    store.record(key, sig0, [panelNode('a', 0)], []);
    store.record(key, sig1, [panelNode('a', 40)], []);
    expect(store.canUndo(key)).toBe(true);
    const prev = store.undo(key);
    expect(prev?.nodes[0]?.position.x).toBe(0);
    const again = store.redo(key);
    expect(again?.nodes[0]?.position.x).toBe(40);
  });

  it('skips duplicate signatures', () => {
    const store = useCanvasHistoryStore.getState();
    store.record(key, 'same', [panelNode('a', 0)], []);
    const changed = store.record(key, 'same', [panelNode('a', 0)], []);
    expect(changed).toBe(false);
    expect(store.historyLength(key)).toBe(1);
  });
});
