import { describe, expect, it } from 'vitest';
import {
  applyEditorPatch,
  applyWhiteboardPatch,
  diffWhiteboardElements,
  mergeSubDocSnapshot,
  mergeWhiteboardElements,
  snapshotFromPayload,
} from './subdocMerge';
import { emptyEditorPayload, emptyWhiteboardPayload } from './subdocProtocol';

describe('subdocMerge', () => {
  it('merges whiteboard elements by id', () => {
    const base = [{ id: 'a', type: 'rectangle', x: 0, y: 0, version: 1, versionNonce: 1 }];
    const incoming = [{ id: 'a', type: 'rectangle', x: 10, y: 0, version: 2, versionNonce: 2 }];
    const merged = mergeWhiteboardElements(base, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.x).toBe(10);
  });

  it('tombstones removed element ids', () => {
    const base = [{ id: 'a', type: 'rectangle', x: 0, y: 0 }];
    const merged = mergeWhiteboardElements(base, [], ['a']);
    expect(merged.find((e) => e.id === 'a')?.isDeleted).toBe(true);
  });

  it('diffs whiteboard adds and removals', () => {
    const prev = [{ id: 'a', type: 'rectangle', x: 0, y: 0, version: 1, versionNonce: 1 }];
    const next = [
      { id: 'a', type: 'rectangle', x: 5, y: 0, version: 2, versionNonce: 2 },
      { id: 'b', type: 'ellipse', x: 1, y: 1, version: 1, versionNonce: 1 },
    ];
    const { elements, removedIds } = diffWhiteboardElements(prev, next);
    expect(elements).toHaveLength(2);
    expect(removedIds).toHaveLength(0);
  });

  it('applyWhiteboardPatch upserts incoming elements', () => {
    const payload = emptyWhiteboardPayload();
    const patched = applyWhiteboardPatch(payload, {
      __subdoc: 'patch-whiteboard',
      nodeId: 'wb-1',
      rev: 1,
      elements: [{ id: 'x', type: 'rectangle', x: 0, y: 0 }],
    });
    expect(patched.elements).toHaveLength(1);
  });

  it('applyEditorPatch replaces text and language', () => {
    const payload = emptyEditorPayload('go');
    const next = applyEditorPatch(payload, 'func main() {}', 'go');
    expect(next.text).toBe('func main() {}');
  });

  it('mergeSubDocSnapshot prefers higher revision', () => {
    const local = snapshotFromPayload('n1', 'collab-code', 2, emptyEditorPayload());
    const remote = snapshotFromPayload('n1', 'collab-code', 5, { text: 'remote', language: 'go' });
    expect(mergeSubDocSnapshot(local, remote).rev).toBe(5);
  });
});
