import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import { createSyncStore } from '@/store/createSyncStore';
import { createServerSync } from '@/store/persistence/sync/syncEngine';
import { mergeSrs } from '@/store/persistence/sync/mergeStrategies';
import { pullReviews, pushReviews, type ReviewCardRow } from '@/platform';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { logActivityToday } from './activity';
import { readStorageJson } from './storage';

export interface SrsCard {
  problemId: string;
  /** Due timestamp (ms). */
  due: number;
  /** Current interval in days. */
  intervalDays: number;
  reps: number;
  /** FSRS v6 card state for scheduling continuity. */
  fsrs?: Card;
}

export interface SrsData {
  cards: Record<string, SrsCard>;
}

interface StoredSrsData {
  cards: Record<string, unknown>;
}

const KEY = STORAGE_KEYS.SRS_DECK;
const scheduler = fsrs();

function normalizeProblemId(problemId: string): string | null {
  const id = problemId.trim();
  return id || null;
}

function nonNegativeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validDate(value: unknown): Date {
  const date = new Date(value as string | number | Date);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function isSrsData(value: unknown): value is StoredSrsData {
  return isRecord(value) && isRecord(value.cards);
}

function hydrateFsrsCard(value: unknown): Card | undefined {
  if (!isRecord(value)) return undefined;
  const card = value as unknown as Card;
  return {
    ...card,
    due: validDate(card.due),
    ...(card.last_review ? { last_review: validDate(card.last_review) } : {}),
  };
}

/** Rehydrate Date fields after JSON parse. */
function hydrateCard(value: unknown, fallbackId: string): SrsCard | null {
  if (!isRecord(value)) return null;
  const card = value as Partial<SrsCard>;
  const problemId = normalizeProblemId(card.problemId ?? '') ?? fallbackId;
  const base: SrsCard = {
    problemId,
    due: typeof card.due === 'number' && Number.isFinite(card.due) ? card.due : Date.now(),
    intervalDays: nonNegativeInt(card.intervalDays),
    reps: nonNegativeInt(card.reps),
  };
  const fsrsCard = hydrateFsrsCard(card.fsrs);
  return fsrsCard ? { ...base, fsrs: fsrsCard } : base;
}

function load(): SrsData {
  const raw = readStorageJson<StoredSrsData>(KEY, { cards: {} }, isSrsData);
  const cards: Record<string, SrsCard> = {};
  for (const [id, value] of Object.entries(raw.cards)) {
    const key = normalizeProblemId(id);
    const card = key ? hydrateCard(value, key) : null;
    if (key && card) cards[key] = card;
  }
  return { cards };
}

function cardToRow(card: SrsCard): ReviewCardRow {
  return {
    problemId: card.problemId,
    due: new Date(card.due).toISOString(),
    intervalDays: card.intervalDays,
    reps: card.reps,
    fsrs: card.fsrs ?? {},
    updatedAt: new Date().toISOString(),
  };
}

function rowToCard(row: ReviewCardRow): SrsCard | null {
  const id = normalizeProblemId(row.problemId);
  if (!id) return null;
  const dueMs = Date.parse(row.due);
  return hydrateCard(
    {
      problemId: id,
      due: Number.isFinite(dueMs) ? dueMs : Date.now(),
      intervalDays: row.intervalDays,
      reps: row.reps,
      fsrs: row.fsrs,
    },
    id,
  );
}

// Server sync: the FSRS deck round-trips to /api/reviews. Card Dates rehydrate
// through the same hydrateCard path the localStorage load uses.
const reviewSync = createServerSync<SrsData>({
  key: KEY,
  pull: async () => {
    const rows = await pullReviews();
    if (rows == null) return null;
    const cards: Record<string, SrsCard> = {};
    for (const row of rows) {
      const card = rowToCard(row);
      if (card) cards[card.problemId] = card;
    }
    return { cards };
  },
  push: (data) => pushReviews(Object.values(data.cards).map(cardToRow)),
  merge: mergeSrs,
});

const store = createSyncStore<SrsData>(KEY, load, reviewSync.save);
reviewSync.attach(store);

export function useSrsData(): SrsData {
  return store.use();
}

function toSrsCard(problemId: string, card: Card): SrsCard {
  return {
    problemId: normalizeProblemId(problemId) ?? problemId,
    due: card.due.getTime(),
    intervalDays: card.scheduled_days,
    reps: card.reps,
    fsrs: card,
  };
}

/**
 * Schedule the next review from an explicit FSRS grade (Again/Hard/Good/Easy).
 * The post-recall self-rating feeds this directly; `scheduleReview` is the
 * correct/wrong shorthand.
 */
export function scheduleReviewRating(problemId: string, rating: Rating): SrsCard {
  const id = normalizeProblemId(problemId);
  if (!id) return toSrsCard('', createEmptyCard());
  logActivityToday();
  let next!: SrsCard;
  store.update((data) => {
    const prev = data.cards[id];
    const fsrsCard: Card = prev?.fsrs ?? createEmptyCard();
    const preview = scheduler.repeat(fsrsCard, new Date()) as Partial<
      Record<Rating, { card: Card }>
    >;
    const item = preview[rating];
    next = toSrsCard(id, item?.card ?? fsrsCard);
    return { cards: { ...data.cards, [id]: next } };
  });
  return next;
}

/** FSRS: correct → Good; wrong → Again (resets short-term learning). */
export function scheduleReview(problemId: string, correct: boolean): SrsCard {
  return scheduleReviewRating(problemId, correct ? Rating.Good : Rating.Again);
}

export function srsSortKey(problemId: string, cards: Record<string, SrsCard>): number {
  const id = normalizeProblemId(problemId);
  const card = id ? cards[id] : undefined;
  if (!card) return 0; // unseen — after overdue
  if (card.due <= Date.now()) return -1; // overdue
  return card.due;
}
