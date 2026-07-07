import { describe, expect, it } from 'vitest';
import { collabSession, defaultSession, interviewSession, isSessionMeta } from '@/lib/session';
import { SUBDOC_TAG, isSubDocOp, type SubDocSnapshot } from '@/lib/session/subdocProtocol';
import {
  buildCanvasRoomState,
  buildRoomEnvelope,
  extractCanvasDoc,
  extractSessionMeta,
  extractSubDocs,
  isRoomEnvelope,
} from '@/shell/realtime/roomState';

import { CanvasDoc } from '@/shell/canvas';
const sampleDoc: CanvasDoc = {
  v: 1,
  rev: 1,
  nodes: [],
  edges: [],
  removedPanels: [],
  removedEdges: [],
  comments: [],
};

describe('session types', () => {
  it('builds interview session with defaults', () => {
    const s = interviewSession('two-sum');
    expect(s.kind).toBe('interview');
    expect(s.activeProblemId).toBe('two-sum');
    expect(s.interview?.hideHints).toBe(true);
  });

  it('guards session meta', () => {
    expect(isSessionMeta(defaultSession('solo'))).toBe(true);
    expect(isSessionMeta({ kind: 'nope' })).toBe(false);
  });
});

describe('room shared envelope', () => {
  it('extracts canvas doc from envelope only', () => {
    const session = collabSession();
    const envelope = buildCanvasRoomState(session, sampleDoc);
    expect(isRoomEnvelope(envelope)).toBe(true);
    expect(extractCanvasDoc(envelope)).toEqual(sampleDoc);
    expect(extractSessionMeta(envelope)).toEqual(session);
    expect(extractCanvasDoc(sampleDoc)).toBeNull();
  });

  it('buildRoomEnvelope attaches content channels independently', () => {
    const session = collabSession();
    const notes: SubDocSnapshot = {
      nodeId: 'notes',
      kind: 'notes',
      rev: 3,
      payload: { text: 'shared' },
    };
    const subsOnly = buildRoomEnvelope(session, { subDocs: { notes } });
    expect(isRoomEnvelope(subsOnly)).toBe(true);
    expect(extractCanvasDoc(subsOnly)).toBeNull();
    expect(extractSubDocs(subsOnly)).toEqual({ notes });

    const full = buildRoomEnvelope(session, { canvas: sampleDoc, subDocs: { notes } });
    expect(extractCanvasDoc(full)).toEqual(sampleDoc);
    expect(extractSubDocs(full)).toEqual({ notes });

    const sessionOnly = buildRoomEnvelope(session, { subDocs: {} });
    expect(sessionOnly.subDocs).toBeUndefined();
    expect(extractSubDocs(sessionOnly)).toEqual({});
  });
});

describe('subdoc ops', () => {
  it('recognizes the notes patch op', () => {
    expect(isSubDocOp({ [SUBDOC_TAG]: 'patch-notes', nodeId: 'n', text: 'hi', rev: 1 })).toBe(true);
    expect(isSubDocOp({ [SUBDOC_TAG]: 'patch-nope', nodeId: 'n' })).toBe(false);
  });
});
