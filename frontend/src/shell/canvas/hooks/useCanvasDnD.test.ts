import { describe, expect, it } from 'vitest';
import type { ProblemPlugin } from '@/core';
import { defaultEdgeOpts } from '@/lib/canvas/layoutPrefs';
import { insertionForKind } from './useCanvasDnD';

const plugin = {
  meta: { id: 'standalone', title: 'Canvas' },
  tabs: [],
  wires: {},
  inputs: [],
  record: () => [],
} as unknown as ProblemPlugin<any, any>;

const position = { x: 100, y: 200 };

function insert(kind: string, nodes: { id: string }[]) {
  return insertionForKind({
    plugin,
    mode: 'visualize',
    kind,
    position,
    nodes,
    edges: [],
    edgeOpts: defaultEdgeOpts,
  });
}

describe('insertionForKind', () => {
  it('returns null for an empty kind', () => {
    expect(insert('', [])).toBeNull();
  });

  it('inserts a singleton kind at the drop position with its kind as id', () => {
    const insertion = insert('notes', []);
    expect(insertion?.node.id).toBe('notes');
    expect(insertion?.node.position).toEqual(position);
  });

  it('dedupes singleton kinds that are already on the canvas', () => {
    expect(insert('notes', [{ id: 'notes' }])).toBeNull();
  });

  it('creates a second whiteboard instance with a fresh unique id', () => {
    const insertion = insert('whiteboard', [{ id: 'whiteboard' }, { id: 'notes' }]);
    expect(insertion).not.toBeNull();
    expect(insertion!.node.id).not.toBe('whiteboard');
    expect(insertion!.node.id).toMatch(/^whiteboard-/);
    expect(insertion!.node.data.kind).toBe('whiteboard');
    expect(insertion!.node.position).toEqual(position);
  });

  it('creates additional collab-code instances even when instances exist', () => {
    const first = insert('collab-code', [{ id: 'collab-code' }]);
    const second = insert('collab-code', [{ id: 'collab-code' }, { id: first!.node.id }]);
    expect(first!.node.id).not.toBe(second!.node.id);
    expect(second!.node.data.kind).toBe('collab-code');
  });

  it('produces no shell edges for standalone panels', () => {
    expect(insert('whiteboard', [])!.newEdges).toEqual([]);
  });
});
