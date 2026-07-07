import { createSyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { readStorageJson } from './storage';

export interface SrsCard {
  problemId: string;
  /** Due timestamp (ms). */
  due: number;
  /** Current interval in days. */
  intervalDays: number;
  reps: number;
}

export interface SrsData {
  cards: Record<string, SrsCard>;
}

const KEY = STORAGE_KEYS.SRS_DECK;
const DAY_MS = 86_400_000;
const INTERVALS = [1, 3, 7, 14, 30];

function isSrsData(value: unknown): value is SrsData {
  const c = value as Partial<SrsData>;
  return !!c && typeof c === 'object' && !!c.cards && typeof c.cards === 'object';
}

function load(): SrsData {
  return readStorageJson(KEY, { cards: {} }, isSrsData);
}

const store = createSyncStore<SrsData>(KEY, load);

export function useSrsData(): SrsData {
  return store.use();
}

/** SM-2-lite: correct advances interval ladder; wrong resets to due now. */
export function scheduleReview(problemId: string, correct: boolean): SrsCard {
  let next!: SrsCard;
  store.update((data) => {
    const prev = data.cards[problemId];
    const now = Date.now();
    if (!correct) {
      next = { problemId, due: now, intervalDays: 1, reps: 0 };
    } else {
      const reps = (prev?.reps ?? 0) + 1;
      const intervalDays = INTERVALS[Math.min(reps - 1, INTERVALS.length - 1)] ?? 30;
      next = { problemId, due: now + intervalDays * DAY_MS, intervalDays, reps };
    }
    return { cards: { ...data.cards, [problemId]: next } };
  });
  return next;
}

export function srsSortKey(problemId: string, cards: Record<string, SrsCard>): number {
  const card = cards[problemId];
  if (!card) return 0; // unseen — after overdue
  if (card.due <= Date.now()) return -1; // overdue
  return card.due;
}
