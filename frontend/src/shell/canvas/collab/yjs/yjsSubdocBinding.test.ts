import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { EditorPayload } from '../protocol/subdocProtocol';
import { snapshotFromPayload } from '../protocol/subdocMerge';
import {
  readSubdocPanel,
  readYjsSubdocs,
  seedSubdocPanel,
  seedYjsSubdocs,
  writeEditorSubdoc,
} from './yjsSubdocBinding';

describe('yjsSubdocBinding', () => {
  it('round-trips editor subdoc via seed and read', () => {
    const doc = new Y.Doc();
    const snap = snapshotFromPayload('code-1', 'collab-code', 3, {
      text: 'func main() {}',
      language: 'go',
      locked: false,
    } satisfies EditorPayload);
    seedSubdocPanel(doc, snap);
    const read = readSubdocPanel(doc, 'code-1');
    expect(read?.kind).toBe('collab-code');
    expect((read?.payload as EditorPayload).text).toBe('func main() {}');
    expect(read?.rev).toBe(3);
  });

  it('writeEditorSubdoc updates Y.Text incrementally', () => {
    const doc = new Y.Doc();
    writeEditorSubdoc(doc, 'code-2', { text: 'a', language: 'go' }, 1);
    writeEditorSubdoc(doc, 'code-2', { text: 'ab', language: 'go' }, 2);
    const read = readSubdocPanel(doc, 'code-2');
    expect((read?.payload as EditorPayload).text).toBe('ab');
    expect(read?.rev).toBe(2);
  });

  it('seedYjsSubdocs hydrates multiple panels', () => {
    const doc = new Y.Doc();
    seedYjsSubdocs(doc, {
      a: snapshotFromPayload('a', 'collab-code', 1, { text: 'x', language: 'go' }),
      b: snapshotFromPayload('b', 'whiteboard', 1, { elements: [] }),
    });
    const all = readYjsSubdocs(doc);
    expect(Object.keys(all).sort()).toEqual(['a', 'b']);
  });
});
