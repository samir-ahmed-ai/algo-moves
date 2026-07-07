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
