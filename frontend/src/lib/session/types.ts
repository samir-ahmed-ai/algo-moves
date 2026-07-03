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

export interface SessionMeta {
  kind: SessionKind;
  activeProblemId?: string;
  interview?: InterviewSettings;
}

export const DEFAULT_INTERVIEW_SETTINGS: InterviewSettings = {
  hideHints: true,
  hideSolutions: true,
};

export function defaultSession(kind: SessionKind = 'solo'): SessionMeta {
  return { kind };
}

export function collabSession(): SessionMeta {
  return { kind: 'collab' };
}

export function interviewSession(problemId: string, interview: InterviewSettings = DEFAULT_INTERVIEW_SETTINGS): SessionMeta {
  return {
    kind: 'interview',
    activeProblemId: problemId,
    interview,
  };
}

export function isSessionKind(value: unknown): value is SessionKind {
  return value === 'solo' || value === 'collab' || value === 'interview';
}

export function isSessionMeta(value: unknown): value is SessionMeta {
  const s = value as Partial<SessionMeta> | null;
  return !!s && isSessionKind(s.kind);
}

/** Map games relay role to session role (1:1 today). */
export function toSessionRole(role: 'host' | 'guest' | 'spectator' | null): SessionRole | null {
  return role;
}
