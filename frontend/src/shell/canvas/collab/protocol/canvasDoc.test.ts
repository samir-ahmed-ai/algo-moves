import { describe, it, expect } from 'vitest';
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '../../nodes/PanelNode';
import type { CanvasComment, EditOp } from './collabProtocol';
import {
  applyEditToComments,
  applyEditToEdges,
  applyEditToNodes,
  diffEdges,
  diffNodes,
  docSignature,
  mergeRemoteNodes,
} from './canvasDoc';

const node = (id: string, x: number, y: number, extra: Partial<PanelFlowNode> = {}): PanelFlowNode => ({
  id,
  type: 'panel',
  position: { x, y },
  data: { kind: id, title: id },
  ...extra,
});

const edge = (id: string, source: string, target: string): Edge => ({ id, source, target });

describe('docSignature', () => {
  it('ignores selection but reacts to position', () => {
    const a = [node('n1', 0, 0)];
    const b = [node('n1', 0, 0, { selected: true })];
    const c = [node('n1', 10, 0)];
    expect(docSignature(a, [], [])).toBe(docSignature(b, [], []));
    expect(docSignature(a, [], [])).not.toBe(docSignature(c, [], []));
  });

  it('is stable while a node is dragging (host holds publish until settle)', () => {
    const dragging1 = [node('n1', 5, 5, { dragging: true })];
    const dragging2 = [node('n1', 40, 80, { dragging: true })];
    expect(docSignature(dragging1, [], [])).toBe(docSignature(dragging2, [], []));
  });
});

describe('diffNodes', () => {
  it('emits add / remove / settled-move / patch, and skips dragging moves', () => {
    const prev = [node('n1', 0, 0), node('n2', 0, 0)];
    const next = [
      node('n1', 100, 0), // moved (settled)
      node('n3', 0, 0), // added
    ];
    const ops = diffNodes(prev, next);
    const kinds = ops.map((o) => o.__canvas).sort();
    expect(kinds).toEqual(['node-add', 'node-move', 'node-remove']);

    const dragging = [node('n1', 999, 999, { dragging: true })];
    expect(diffNodes([node('n1', 0, 0)], dragging)).toEqual([]);
  });

  it('emits node-patch only for collaborative data fields', () => {
    const prev = [node('n1', 0, 0)];
    const runOnly = [node('n1', 0, 0, { data: { kind: 'n1', title: 'n1', runState: 'running' } })];
    expect(diffNodes(prev, runOnly)).toEqual([]); // runState is per-user, not synced

    const accent = [node('n1', 0, 0, { data: { kind: 'n1', title: 'n1', accent: '#f00' } })];
    const ops = diffNodes(prev, accent);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ __canvas: 'node-patch', id: 'n1', data: { accent: '#f00' } });
  });
});

describe('diffEdges', () => {
  it('emits edge add/remove by id', () => {
    const ops = diffEdges([edge('e1', 'a', 'b')], [edge('e2', 'b', 'c')]);
    expect(ops.map((o) => o.__canvas).sort()).toEqual(['edge-add', 'edge-remove']);
  });
});

describe('applyEditTo*', () => {
  it('applies node ops and cascades edge removal on node-remove', () => {
    let nodes = [node('n1', 0, 0)];
    nodes = applyEditToNodes({ __canvas: 'node-add', node: node('n2', 5, 5) }, nodes);
    expect(nodes).toHaveLength(2);
    nodes = applyEditToNodes({ __canvas: 'node-move', id: 'n2', x: 9, y: 9 }, nodes);
    expect(nodes.find((n) => n.id === 'n2')?.position).toEqual({ x: 9, y: 9 });

    const edges = applyEditToEdges({ __canvas: 'node-remove', id: 'n1' }, [edge('e1', 'n1', 'n2')]);
    expect(edges).toEqual([]);
  });

  it('is idempotent for comment-add', () => {
    const c: CanvasComment = { id: 'c1', authorId: 'a', authorName: 'A', text: 'hi', x: 0, y: 0, at: 0, resolved: false, replies: [] };
    const op: EditOp = { __canvas: 'comment-add', comment: c };
    const once = applyEditToComments(op, []);
    const twice = applyEditToComments(op, once);
    expect(twice).toHaveLength(1);
  });
});

describe('mergeRemoteNodes', () => {
  it('preserves local interior state and never yanks a dragging node', () => {
    const local = [
      node('n1', 0, 0, { data: { kind: 'n1', title: 'n1', runState: 'running' } }),
      node('n2', 0, 0, { position: { x: 3, y: 3 }, dragging: true }),
    ];
    const remote = [
      node('n1', 50, 50, { data: { kind: 'n1', title: 'n1', accent: '#0f0' } }),
      node('n2', 999, 999), // host thinks n2 is elsewhere
    ];
    const merged = mergeRemoteNodes(local, remote);
    const m1 = merged.find((n) => n.id === 'n1')!;
    expect(m1.position).toEqual({ x: 50, y: 50 }); // remote position wins
    expect(m1.data.accent).toBe('#0f0'); // remote appearance wins
    expect(m1.data.runState).toBe('running'); // local interior preserved

    const m2 = merged.find((n) => n.id === 'n2')!;
    expect(m2.position).toEqual({ x: 3, y: 3 }); // dragging node keeps local position
  });
});
