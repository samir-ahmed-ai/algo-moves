import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildJoinInterviewSession, buildResumeInterviewSession } from '../interviewSession';

vi.mock('@/platform/api/interviewApi', () => ({
  createInterviewSession: vi.fn(),
  updateInterviewSession: vi.fn(),
}));

describe('interviewSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildJoinInterviewSession', () => {
    it('marks session kind as interview with guest token', () => {
      const meta = buildJoinInterviewSession('two-sum', 'guest-tok');
      expect(meta.kind).toBe('interview');
      expect(meta.activeProblemId).toBe('two-sum');
      expect(meta.guestToken).toBe('guest-tok');
    });
  });

  describe('buildResumeInterviewSession', () => {
    it('restores locked state from summary row', () => {
      const meta = buildResumeInterviewSession({
        id: 'sess-1',
        title: 'Mock',
        status: 'active',
        roomCode: 'ABCD',
        guestLinkEnabled: true,
        canvasLocked: true,
        updatedAt: new Date().toISOString(),
      });
      expect(meta.kind).toBe('interview');
      expect(meta.sessionId).toBe('sess-1');
      expect(meta.interviewRuntime?.locked).toBe(true);
    });
  });
});
