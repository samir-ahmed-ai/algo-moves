import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InterviewRuntime, SessionMeta } from '@/lib/session';
import { defaultInterviewRuntime, interviewSession } from '@/lib/session';
import {
  DEFAULT_TIMER_MS,
  copyTextToClipboard,
  endInterview,
  toggleSessionTimer,
} from '../interviewControls';
import { endInterviewSession } from '@/platform/api/interviewApi';

vi.mock('@/platform/api/interviewApi', () => ({
  endInterviewSession: vi.fn(() => Promise.resolve(null)),
}));

function timerApi() {
  return { startTimer: vi.fn(), pauseTimer: vi.fn(), resumeTimer: vi.fn() };
}

function withTimer(patch: Partial<InterviewRuntime>): SessionMeta {
  const s = interviewSession('two-sum');
  s.interviewRuntime = { ...defaultInterviewRuntime(), ...patch };
  return s;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('toggleSessionTimer', () => {
  it('pauses a running timer', () => {
    const api = timerApi();
    const session = withTimer({
      timer: {
        durationMs: 60_000,
        running: true,
        endsAt: Date.now() + 60_000,
        remainingMs: 60_000,
      },
    });
    expect(toggleSessionTimer(session, api)).toBe('paused');
    expect(api.pauseTimer).toHaveBeenCalledOnce();
    expect(api.startTimer).not.toHaveBeenCalled();
  });

  it('resumes a paused timer with remaining time', () => {
    const api = timerApi();
    const session = withTimer({
      timer: { durationMs: 60_000, running: false, endsAt: null, remainingMs: 30_000 },
    });
    expect(toggleSessionTimer(session, api)).toBe('resumed');
    expect(api.resumeTimer).toHaveBeenCalledOnce();
  });

  it('starts a fresh default countdown when no timer is set', () => {
    const api = timerApi();
    const session = interviewSession('two-sum');
    expect(toggleSessionTimer(session, api)).toBe('started');
    expect(api.startTimer).toHaveBeenCalledWith(DEFAULT_TIMER_MS);
  });

  it('starts fresh when the runtime is missing entirely (guest-shaped meta)', () => {
    const api = timerApi();
    const session: SessionMeta = { kind: 'interview' };
    expect(toggleSessionTimer(session, api, 5_000)).toBe('started');
    expect(api.startTimer).toHaveBeenCalledWith(5_000);
  });
});

describe('endInterview', () => {
  it('ends the durable session, locks the board and leaves', () => {
    const setLocked = vi.fn();
    const leaveSession = vi.fn();
    const session = interviewSession('two-sum', undefined, { sessionId: 'sess-1' });
    endInterview({ session, setLocked, leaveSession });
    expect(endInterviewSession).toHaveBeenCalledWith('sess-1');
    expect(setLocked).toHaveBeenCalledWith(true);
    expect(leaveSession).toHaveBeenCalledOnce();
  });

  it('skips the REST call on the relay-only fallback but still locks and leaves', () => {
    const setLocked = vi.fn();
    const leaveSession = vi.fn();
    endInterview({ session: interviewSession('two-sum'), setLocked, leaveSession });
    expect(endInterviewSession).not.toHaveBeenCalled();
    expect(setLocked).toHaveBeenCalledWith(true);
    expect(leaveSession).toHaveBeenCalledOnce();
  });
});

describe('copyTextToClipboard', () => {
  it('uses the async clipboard API when available', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyTextToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to a temporary textarea when the clipboard API rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('blocked'))) },
    });
    const ta = {
      value: '',
      setAttribute: vi.fn(),
      style: {} as Record<string, string>,
      select: vi.fn(),
      remove: vi.fn(),
    };
    const execCommand = vi.fn(() => true);
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ta),
      body: { appendChild: vi.fn() },
      execCommand,
    });
    await expect(copyTextToClipboard('fallback')).resolves.toBe(true);
    expect(ta.value).toBe('fallback');
    expect(ta.select).toHaveBeenCalledOnce();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(ta.remove).toHaveBeenCalledOnce();
  });

  it('returns false when both paths fail', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('blocked'))) },
    });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => {
        throw new Error('no dom');
      }),
    });
    await expect(copyTextToClipboard('nope')).resolves.toBe(false);
  });
});
