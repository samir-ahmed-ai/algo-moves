import { arcadeFetch } from './arcadeClient';

/** Categories mirror the interview-canvas reference. */
export type QuestionCategory = 'general' | 'technical' | 'behavioral' | 'system-design' | 'coding';

export interface InterviewQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  asked: boolean;
}

export interface RubricCriterion {
  id: string;
  label: string;
  /** 0 = unscored, 1–5 otherwise. */
  score: number;
  comment: string;
}

export type Recommendation = 'strong_hire' | 'hire' | 'lean_hire' | 'no_hire' | '';

export type InterviewStatus = 'active' | 'ended';

/** Full owner view returned by create/get/update/end/reopen/rotate. */
export interface InterviewSession {
  id: string;
  ownerProfileId: string | null;
  roomCode: string | null;
  title: string;
  status: InterviewStatus;
  guestToken: string;
  guestLinkEnabled: boolean;
  canvasLocked: boolean;
  canvas: unknown;
  questions: InterviewQuestion[];
  notes: string;
  rubric: RubricCriterion[];
  recommendation: Recommendation;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
}

/** Lightweight row for the sessions list. */
export interface InterviewSummary {
  id: string;
  title: string;
  status: InterviewStatus;
  roomCode: string | null;
  guestLinkEnabled: boolean;
  canvasLocked: boolean;
  updatedAt: string;
}

/** Sanitized guest view (no private fields / token echo). */
export interface PublicInterviewSession {
  id: string;
  title: string;
  status: InterviewStatus;
  canvasLocked: boolean;
  roomCode: string | null;
  canvas: unknown;
}

export interface UpdateInterviewPatch {
  title?: string;
  canvas?: unknown;
  questions?: InterviewQuestion[];
  notes?: string;
  rubric?: RubricCriterion[];
  recommendation?: Recommendation;
  canvasLocked?: boolean;
  guestLinkEnabled?: boolean;
  roomCode?: string;
}

export async function createInterviewSession(title: string): Promise<InterviewSession | null> {
  return arcadeFetch<InterviewSession>('/api/interviews', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function listInterviewSessions(): Promise<InterviewSummary[]> {
  const rows = await arcadeFetch<InterviewSummary[]>('/api/interviews');
  return rows ?? [];
}

export async function getInterviewSession(id: string): Promise<InterviewSession | null> {
  return arcadeFetch<InterviewSession>(`/api/interviews/${id}`);
}

export async function updateInterviewSession(
  id: string,
  patch: UpdateInterviewPatch,
): Promise<InterviewSession | null> {
  return arcadeFetch<InterviewSession>(`/api/interviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function endInterviewSession(id: string): Promise<InterviewSession | null> {
  return arcadeFetch<InterviewSession>(`/api/interviews/${id}/end`, { method: 'POST' });
}

export async function reopenInterviewSession(id: string): Promise<InterviewSession | null> {
  return arcadeFetch<InterviewSession>(`/api/interviews/${id}/reopen`, { method: 'POST' });
}

export async function rotateInterviewToken(id: string): Promise<InterviewSession | null> {
  return arcadeFetch<InterviewSession>(`/api/interviews/${id}/rotate-token`, { method: 'POST' });
}

/** Anonymous guest lookup — the token is the credential, no session header. */
export async function fetchPublicInterviewSession(
  token: string,
): Promise<PublicInterviewSession | null> {
  return arcadeFetch<PublicInterviewSession>(`/api/interviews/token/${encodeURIComponent(token)}`, {
    auth: false,
  });
}
