import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';
import { readStorageJson } from './storage';

/**
 * Per-day study activity — the source for the day-streak and the GitHub-style
 * heatmap on the learner dashboard. Kept deliberately import-free of progress.ts /
 * srs.ts (they call `logActivityToday` one-way) so there is no store cycle.
 * localStorage-only for now; a server mirror can layer on later via study_events.
 */
export interface ActivityData {
  /** 'YYYY-MM-DD' (local date) → number of study events that day. */
  days: Record<string, number>;
}

const KEY = STORAGE_KEYS.ACTIVITY;

/** Local calendar date as 'YYYY-MM-DD'. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isActivityData(value: unknown): value is ActivityData {
  if (!value || typeof value !== 'object') return false;
  const days = (value as Partial<ActivityData>).days;
  if (!days || typeof days !== 'object') return false;
  return Object.values(days).every((n) => typeof n === 'number' && Number.isFinite(n));
}

function load(): ActivityData {
  const raw = readStorageJson<ActivityData>(KEY, { days: {} }, isActivityData);
  const days: Record<string, number> = {};
  for (const [k, n] of Object.entries(raw.days)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && n > 0) days[k] = Math.round(n);
  }
  return { days };
}

const store = createSyncStore<ActivityData>(KEY, load);

export function useActivity(): ActivityData {
  return store.use();
}

/** Record one study event for today (called from recordAttempt / scheduleReview). */
export function logActivityToday(now: Date = new Date()): void {
  const key = dayKey(now);
  store.update((d) => ({ days: { ...d.days, [key]: (d.days[key] ?? 0) + 1 } }));
}

/** Consecutive days with activity ending today (or yesterday, as a same-day grace). */
export function computeDayStreak(days: Record<string, number>, now: Date = new Date()): number {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Grace: an as-yet-inactive today does not break a streak earned through yesterday.
  // Step by CALENDAR date (not a fixed 24h) so DST transitions don't skip/double a day.
  if (!days[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days[dayKey(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface HeatCell {
  date: string;
  count: number;
}

/**
 * `weeks` columns of 7 rows (Sun→Sat), oldest-first, ending on the week containing
 * `now` — ready to render as a calendar heatmap.
 */
export function activityHeatmap(
  days: Record<string, number>,
  weeks = 26,
  now: Date = new Date(),
): HeatCell[][] {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Walk back to the Sunday that starts the leftmost visible week — by calendar date
  // so DST transitions don't shift the grid.
  const startOffset = (weeks - 1) * 7 + end.getDay();
  const cursor = new Date(end);
  cursor.setDate(cursor.getDate() - startOffset);
  const grid: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKey(cursor);
      col.push({ date: key, count: days[key] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push(col);
  }
  return grid;
}

export function activityTotals(days: Record<string, number>): {
  activeDays: number;
  totalEvents: number;
} {
  let activeDays = 0;
  let totalEvents = 0;
  for (const n of Object.values(days)) {
    if (n > 0) activeDays++;
    totalEvents += n;
  }
  return { activeDays, totalEvents };
}
