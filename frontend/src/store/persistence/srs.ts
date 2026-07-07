import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
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
  /** FSRS v6 card state for scheduling continuity. */
  fsrs?: Card;
}

export interface SrsData {
  cards: Record<string, SrsCard>;
}

const KEY = STORAGE_KEYS.SRS_DECK;
const scheduler = fsrs();

function normalizeProblemId(problemId: string): string | null {
  const id = problemId.trim();
  return id || null;
}

function nonNegativeInt(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function validDate(value: unknown): Date {
  const date = new Date(value as string | number | Date);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function isSrsData(value: unknown): value is SrsData {
  const c = value as Partial<SrsData>;
  return !!c && typeof c === 'object' && !!c.cards && typeof c.cards === 'object';
}

/** Rehydrate Date fields after JSON parse. */
function hydrateCard(card: SrsCard, fallbackId: string): SrsCard {
  const problemId = normalizeProblemId(card.problemId) ?? fallbackId;
  const base: SrsCard = {
    ...card,
    problemId,
    due: Number.isFinite(card.due) ? card.due : Date.now(),
    intervalDays: nonNegativeInt(card.intervalDays),
    reps: nonNegativeInt(card.reps),
  };
  if (!card.fsrs) return base;
  return {
    ...base,
    fsrs: {
      ...card.fsrs,
      due: validDate(card.fsrs.due),
      last_review: card.fsrs.last_review ? validDate(card.fsrs.last_review) : undefined,
    },
  };
}

function load(): SrsData {
  const raw = readStorageJson(KEY, { cards: {} }, isSrsData);
  const cards: Record<string, SrsCard> = {};
  for (const [id, card] of Object.entries(raw.cards)) {
    const key = normalizeProblemId(id);
    if (key) cards[key] = hydrateCard(card, key);
  }
  return { cards };
}

const store = createSyncStore<SrsData>(KEY, load);

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

/** FSRS: correct → Good; wrong → Again (resets short-term learning). */
export function scheduleReview(problemId: string, correct: boolean): SrsCard {
  const id = normalizeProblemId(problemId);
  if (!id) return toSrsCard('', createEmptyCard());
  let next!: SrsCard;
  store.update((data) => {
    const prev = data.cards[id];
    const fsrsCard: Card = prev?.fsrs ?? createEmptyCard();
    const grade = correct ? Rating.Good : Rating.Again;
    const preview = scheduler.repeat(fsrsCard, new Date()) as Partial<
      Record<Rating, { card: Card }>
    >;
    const item = preview[grade];
    if (!item?.card) {
      next = toSrsCard(id, fsrsCard);
      return { cards: { ...data.cards, [id]: next } };
    }
    next = toSrsCard(id, item.card);
    return { cards: { ...data.cards, [id]: next } };
  });
  return next;
}

export function srsSortKey(problemId: string, cards: Record<string, SrsCard>): number {
  const id = normalizeProblemId(problemId);
  const card = id ? cards[id] : undefined;
  if (!card) return 0; // unseen — after overdue
  if (card.due <= Date.now()) return -1; // overdue
  return card.due;
}
