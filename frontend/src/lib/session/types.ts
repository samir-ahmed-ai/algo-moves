/** Product session kinds — solo study vs freeform collab vs interview. */
export type SessionKind = 'solo' | 'collab' | 'interview';

/** Maps to realtime room {@link Role} from the games relay. */
export type SessionRole = 'host' | 'guest' | 'spectator';

export interface InterviewSettings {
  hideHints: boolean;
  hideSolutions: boolean;
  guestCanEditBoard?: boolean;
  guestCanEditCode?: boolean;
  guestCanMoveNodes?: boolean;
}

/** Host-authored countdown, broadcast to all peers via the room envelope. */
export interface TimerState {
  durationMs: number;
  running: boolean;
  /** Epoch ms the timer expires at while running; null while paused/stopped. */
  endsAt: number | null;
  /** Frozen remaining ms while paused. */
  remainingMs: number;
}

/** Host-driven viz playback position for classroom follow mode. */
export interface PlaybackState {
  /** Viz panel node id the host is driving. */
  nodeId: string;
  index: number;
  playing: boolean;
}

/**
 * Live interview facilitation state the host owns and broadcasts. Rides inside
 * {@link SessionMeta.interviewRuntime} so guests mirror it for free via the
 * existing session envelope, with no extra wire plumbing.
 */
export interface InterviewRuntime {
  timer: TimerState;
  /** Board lock — candidates become view-only. */
  locked: boolean;
  /** "Follow me": guests mirror the host's viewport. */
  hostFollow: boolean;
  /** Classroom mode: guests mirror the host scrubber on the active viz panel. */
  hostFrameFollow: boolean;
  /** Latest host playback position while {@link hostFrameFollow} is on. */
  playback?: PlaybackState;
}

export interface SessionMeta {
  kind: SessionKind;
  activeProblemId?: string;
  interview?: InterviewSettings;
  /** Durable interview-session id (present once a REST session backs the room). */
  sessionId?: string;
  /** Public guest-invite token for the durable session. */
  guestToken?: string;
  /** Host-authored live facilitation state (timer/lock/follow). */
  interviewRuntime?: InterviewRuntime;
}

export const DEFAULT_INTERVIEW_SETTINGS: Readonly<InterviewSettings> = {
  hideHints: true,
  hideSolutions: true,
};

function normalizedId(value: string | undefined): string | undefined {
  const id = value?.trim();
  return id || undefined;
}

function nonNegativeMs(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export const emptyTimerState = (): TimerState => ({
  durationMs: 0,
  running: false,
  endsAt: null,
  remainingMs: 0,
});

export const defaultInterviewRuntime = (): InterviewRuntime => ({
  timer: emptyTimerState(),
  locked: false,
  hostFollow: false,
  hostFrameFollow: false,
});

export function defaultSession(kind: SessionKind = 'solo'): SessionMeta {
  return { kind };
}

export function collabSession(): SessionMeta {
  return { kind: 'collab' };
}

export function interviewSession(
  problemId: string,
  interview: InterviewSettings = DEFAULT_INTERVIEW_SETTINGS,
  opts: { sessionId?: string; guestToken?: string; runtime?: InterviewRuntime } = {},
): SessionMeta {
  const activeProblemId = normalizedId(problemId);
  const sessionId = normalizedId(opts.sessionId);
  const guestToken = normalizedId(opts.guestToken);
  const interviewRuntime = opts.runtime
    ? {
        ...opts.runtime,
        timer: {
          ...opts.runtime.timer,
          durationMs: nonNegativeMs(opts.runtime.timer.durationMs),
          remainingMs: nonNegativeMs(opts.runtime.timer.remainingMs),
          endsAt:
            opts.runtime.timer.endsAt == null ? null : nonNegativeMs(opts.runtime.timer.endsAt),
        },
      }
    : defaultInterviewRuntime();
  return {
    kind: 'interview',
    ...(activeProblemId ? { activeProblemId } : {}),
    interview: { ...DEFAULT_INTERVIEW_SETTINGS, ...interview },
    ...(sessionId ? { sessionId } : {}),
    ...(guestToken ? { guestToken } : {}),
    interviewRuntime,
  };
}

export function isSessionKind(value: unknown): value is SessionKind {
  return value === 'solo' || value === 'collab' || value === 'interview';
}

export function isSessionMeta(value: unknown): value is SessionMeta {
  if (value === null || typeof value !== 'object') return false;
  const s = value as Partial<SessionMeta>;
  return isSessionKind(s.kind);
}

/** Map games relay role to session role (1:1 today). */
export function toSessionRole(role: 'host' | 'guest' | 'spectator' | null): SessionRole | null {
  return role;
}
