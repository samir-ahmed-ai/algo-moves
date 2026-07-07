import { endInterviewSession } from '@/platform/api/interviewApi';
import type { SessionMeta } from '@/lib/session';

/** Default countdown when the timer is toggled on without picking a preset. */
export const DEFAULT_TIMER_MS = 45 * 60_000;

export interface SessionTimerApi {
  startTimer: (durationMs: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
}

/** Play/pause semantics over the host timer: running → pause, paused → resume, unset → start. */
export function toggleSessionTimer(
  session: SessionMeta,
  api: SessionTimerApi,
  defaultMs: number = DEFAULT_TIMER_MS,
): 'paused' | 'resumed' | 'started' {
  const timer = session.interviewRuntime?.timer;
  if (timer?.running) {
    api.pauseTimer();
    return 'paused';
  }
  if (timer && (timer.remainingMs > 0 || timer.durationMs > 0)) {
    api.resumeTimer();
    return 'resumed';
  }
  api.startTimer(defaultMs);
  return 'started';
}

/**
 * End the interview the same way the Room-controls widget does: close the
 * durable REST session (best effort — skipped on the relay-only fallback),
 * lock the board so stray edits are rejected, then leave the room.
 */
export function endInterview(api: {
  session: SessionMeta;
  setLocked: (locked: boolean) => void;
  leaveSession: () => void;
}): void {
  if (api.session.sessionId) void endInterviewSession(api.session.sessionId).catch(() => null);
  api.setLocked(true);
  api.leaveSession();
}

/** Clipboard write with a legacy textarea fallback for non-secure contexts. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
