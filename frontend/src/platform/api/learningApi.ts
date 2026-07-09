import { arcadeFetch } from './arcadeClient';

/**
 * REST wrappers for the owner-scoped learner-state API (backend/internal/learning).
 * Every call goes through arcadeFetch, which sends the SCS session cookie and
 * returns `null` when the backend/Postgres is absent or the request fails — so a
 * `null` result always means "unavailable, stay local", distinct from an empty
 * array. Writes require a signed-in (non-anonymous) session server-side.
 */

export interface ProblemProgressRow {
  problemId: string;
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
  mastered: boolean;
  lastAttemptAt?: string;
  updatedAt: string;
}

export interface ReviewCardRow {
  problemId: string;
  due: string;
  intervalDays: number;
  reps: number;
  fsrs: unknown;
  updatedAt: string;
}

export interface AttemptRow {
  id: string;
  problemId: string;
  kind: 'quiz' | 'reassemble' | 'recall';
  correct: boolean;
  durationMs?: number;
  detail?: unknown;
  createdAt?: string;
}

export interface NoteRow {
  itemId: string;
  kind: 'note' | 'edge_cases';
  body: string;
  updatedAt: string;
}

export interface EnrollmentRow {
  courseId: string;
  enrolledAt?: string;
  lastItemId?: string;
  progress: number;
  completedAt?: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------- progress */

export async function pullProgress(): Promise<ProblemProgressRow[] | null> {
  const res = await arcadeFetch<{ problems: ProblemProgressRow[] }>('/api/progress');
  return res?.problems ?? null;
}

export async function pushProgress(
  rows: ProblemProgressRow[],
  opts?: { keepalive?: boolean },
): Promise<ProblemProgressRow[] | null> {
  const res = await arcadeFetch<{ problems: ProblemProgressRow[] }>('/api/progress', {
    method: 'PUT',
    body: JSON.stringify({ problems: rows }),
    ...(opts?.keepalive ? { keepalive: true } : {}),
  });
  return res?.problems ?? null;
}

export async function pushAttempts(attempts: AttemptRow[]): Promise<boolean> {
  const res = await arcadeFetch<{ ok: boolean }>('/api/progress/attempts', {
    method: 'POST',
    body: JSON.stringify({ attempts }),
  });
  return res?.ok ?? false;
}

export async function pullMistakes(limit = 50): Promise<AttemptRow[] | null> {
  const res = await arcadeFetch<{ mistakes: AttemptRow[] }>(
    `/api/progress/mistakes?limit=${limit}`,
  );
  return res?.mistakes ?? null;
}

/* ------------------------------------------------------------- reviews (FSRS) */

export async function pullReviews(): Promise<ReviewCardRow[] | null> {
  const res = await arcadeFetch<{ cards: ReviewCardRow[] }>('/api/reviews');
  return res?.cards ?? null;
}

export async function pushReviews(
  cards: ReviewCardRow[],
  opts?: { keepalive?: boolean },
): Promise<ReviewCardRow[] | null> {
  const res = await arcadeFetch<{ cards: ReviewCardRow[] }>('/api/reviews', {
    method: 'PUT',
    body: JSON.stringify({ cards }),
    ...(opts?.keepalive ? { keepalive: true } : {}),
  });
  return res?.cards ?? null;
}

export async function pullDueReviews(limit = 50, at?: Date): Promise<ReviewCardRow[] | null> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (at) q.set('at', at.toISOString());
  const res = await arcadeFetch<{ cards: ReviewCardRow[] }>(`/api/reviews/due?${q.toString()}`);
  return res?.cards ?? null;
}

/* ------------------------------------------------------------- notes / bookmarks / enrollments */

export async function pullNotes(): Promise<NoteRow[] | null> {
  const res = await arcadeFetch<{ notes: NoteRow[] }>('/api/notes');
  return res?.notes ?? null;
}

export async function pushNotes(notes: NoteRow[]): Promise<NoteRow[] | null> {
  const res = await arcadeFetch<{ notes: NoteRow[] }>('/api/notes', {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  });
  return res?.notes ?? null;
}

export async function pullBookmarks(): Promise<string[] | null> {
  const res = await arcadeFetch<{ itemIds: string[] }>('/api/bookmarks');
  return res?.itemIds ?? null;
}

export async function pushBookmarks(itemIds: string[]): Promise<string[] | null> {
  const res = await arcadeFetch<{ itemIds: string[] }>('/api/bookmarks', {
    method: 'PUT',
    body: JSON.stringify({ itemIds }),
  });
  return res?.itemIds ?? null;
}

export async function pullEnrollments(): Promise<EnrollmentRow[] | null> {
  const res = await arcadeFetch<{ enrollments: EnrollmentRow[] }>('/api/enrollments');
  return res?.enrollments ?? null;
}

export async function pushEnrollments(
  enrollments: EnrollmentRow[],
): Promise<EnrollmentRow[] | null> {
  const res = await arcadeFetch<{ enrollments: EnrollmentRow[] }>('/api/enrollments', {
    method: 'PUT',
    body: JSON.stringify({ enrollments }),
  });
  return res?.enrollments ?? null;
}
