import { describe, expect, it } from 'vitest';
import { collabSession, defaultSession, interviewSession, isSessionMeta } from '@/lib/session';
import {
  buildCanvasRoomState,
  extractCanvasDoc,
  extractSessionMeta,
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
});
