import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { CanvasDoc } from '../protocol/collabProtocol';
import {
  applyYjsCanvasState,
  encodeYjsCanvasState,
  readYjsCanvasDoc,
  seedYjsCanvasDoc,
} from './yjsCanvasDoc';
import { observeCanvasGraph, readCanvasGraph, writeCanvasGraph } from './yjsCanvasBinding';

const sampleDoc = (): CanvasDoc => ({
  v: 1,
  rev: 3,
  nodes: [
    {
      id: 'n1',
      type: 'panel',
      position: { x: 10, y: 20 },
      data: { title: 'A', collapsed: false },
    } as CanvasDoc['nodes'][number],
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
  removedPanels: ['old-panel'],
  removedEdges: ['old-edge'],
  comments: [
    {
      id: 'c1',
      authorId: 'u1',
      authorName: 'Ada',
      text: 'hi',
      x: 1,
      y: 2,
      at: 1,
      resolved: false,
      replies: [],
    },
  ],
});

describe('yjsCanvasDoc', () => {
  it('round-trips a CanvasDoc through Yjs maps', () => {
    const doc = new Y.Doc();
    const snapshot = sampleDoc();
    seedYjsCanvasDoc(doc, snapshot);
    expect(readYjsCanvasDoc(doc)).toEqual(snapshot);
  });

  it('encodes and restores binary CRDT state', () => {
    const a = new Y.Doc();
    seedYjsCanvasDoc(a, sampleDoc());
    const encoded = encodeYjsCanvasState(a);

    const b = new Y.Doc();
    applyYjsCanvasState(b, encoded);
    expect(readYjsCanvasDoc(b)).toEqual(readYjsCanvasDoc(a));
  });
});

describe('yjsCanvasBinding', () => {
  it('writes and observes graph updates', () => {
    const doc = new Y.Doc();
    const seen: string[] = [];
    const stop = observeCanvasGraph(doc, (g) => seen.push(g.nodes.map((n) => n.id).join(',')));

    writeCanvasGraph(doc, {
      nodes: [{ id: 'n1', type: 'panel', position: { x: 0, y: 0 }, data: { title: 'x' } } as never],
      edges: [],
    });
    writeCanvasGraph(doc, {
      nodes: [
        { id: 'n1', type: 'panel', position: { x: 0, y: 0 }, data: { title: 'x' } } as never,
        { id: 'n2', type: 'panel', position: { x: 1, y: 1 }, data: { title: 'y' } } as never,
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    });
    stop();

    expect(seen[seen.length - 1]).toBe('n1,n2');
    expect(readCanvasGraph(doc).edges).toHaveLength(1);
  });
});
